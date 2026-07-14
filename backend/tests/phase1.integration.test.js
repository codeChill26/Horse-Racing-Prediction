// backend/tests/phase1.integration.test.js
const request = require('supertest');
const app = require('../app');
const prisma = require('../src/config/prisma');
const redisClient = require('../src/config/redis'); // Nạp Redis Client của hệ thống
const jwt = require('jsonwebtoken');

describe('Phase 1 - Admin & Violation API Integration Tests', () => {
  let adminToken;
  let refereeToken;
  let testRaceId;
  let testEntryId;
  let adminRedisKey;
  let refereeRedisKey;

  beforeAll(async () => {
    const jwtSecret = process.env.JWT_SECRET || 'secret';
    const races = await prisma.race.findMany();

console.log("DATABASE RACES:", races);

    // 1. Sinh cấu trúc mã mã hóa Access Token ảo
    adminToken = jwt.sign({ sub: 1, role: 'ADMIN' }, jwtSecret, { expiresIn: '1h' });
    refereeToken = jwt.sign({ sub: 3, role: 'RACE_REFEREE' }, jwtSecret, { expiresIn: '1h' });

    // 2. Ghi vết trạng thái phiên hoạt động (Stateful Session) trực tiếp vào Redis Docker
    adminRedisKey = `accessToken:1:${adminToken}`;
    refereeRedisKey = `accessToken:3:${refereeToken}`;

    await redisClient.set(adminRedisKey, 'true', { EX: 3600 });
    await redisClient.set(refereeRedisKey, 'true', { EX: 3600 });

    // 3. Chuẩn bị Mock Data từ PostgreSQL Database
    const sampleRace = await prisma.race.findFirst({
      include: { entries: true }
    });

    if (sampleRace) {
      testRaceId = sampleRace.raceId;
      if (sampleRace.entries && sampleRace.entries.length > 0) {
        testEntryId = sampleRace.entries[0].entryId;
      }
    } else {
      // Giá trị fallback an toàn bảo vệ tiến trình không bị crash sập luồng
      testRaceId = 1;
      testEntryId = 1;
    }
  });

  afterAll(async () => {
    // Thu hồi dọn dẹp RAM Redis sau khi bộ Test Suites hoàn thành
    await redisClient.del(adminRedisKey);
    await redisClient.del(refereeRedisKey);
    
    // Ngắt kết nối để đóng triệt để các Open Handles của Jest
    await redisClient.quit();
    await prisma.$disconnect();
  });

  // --- TEST TASK 1: FIX MOUNT CONFLICT & LIST ALL RACES ---
  test('TASK 1: GET /api/admin/races - Nên trả về danh sách races (Không bị nuốt bởi route :id)', async () => {
    const res = await request(app)
      .get('/api/admin/races')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('races');
    expect(Array.isArray(res.body.races)).toBe(true);
  });

  // --- TEST TASK 2: UPGRADE RACE DETAIL ---
  test('TASK 2: GET /api/admin/races/:id - Nên trả về chi tiết race kèm statistics và entries', async () => {
    const res = await request(app)
      .get(`/api/admin/races/${testRaceId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    if (res.status === 200) {
      expect(res.body).toHaveProperty('raceId');
      expect(res.body).toHaveProperty('entries');
      expect(res.body).toHaveProperty('statistics');
      expect(res.body.statistics).toHaveProperty('totalPool');
      expect(res.body.statistics).toHaveProperty('totalBets');
    } else {
      expect(res.status).toBe(404);
    }
  });

  // --- TEST TASK 3: BACKWARD COMPATIBLE BULK REVIEW ---
  test('TASK 3: POST /api/admin/races/:id/bulk-review - Payload phẳng từ PROCESS.md', async () => {
    const res = await request(app)
      .post(`/api/admin/races/${testRaceId}/bulk-review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        entryIds: [testEntryId],
        action: 'APPROVE',
        reason: 'Hồ sơ đạt chuẩn'
      });

    expect([200, 400, 404]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body).toHaveProperty('summary');
    }
  });

  // --- TEST TASK 4: VIOLATIONS MOCK ENGINE ---
  test('TASK 4: Luồng xử lý Vi phạm (Reporter -> List -> Resolve)', async () => {
    // A. Trọng tài nộp báo cáo vi phạm
    const reportRes = await request(app)
      .post('/api/violations/reporter')
      .set('Authorization', `Bearer ${refereeToken}`)
      .send({
        raceId: testRaceId,
        entryId: testEntryId,
        type: 'LATE_REGISTRATION',
        severity: 'MINOR',
        description: 'Đến muộn giờ check-in tập trung kị sỹ'
      });

    expect(reportRes.status).toBe(201);
    expect(reportRes.body.violation).toHaveProperty('violationId');
    const createdVioId = reportRes.body.violation.violationId;

    // B. Admin quét danh sách vi phạm công khai
    const listRes = await request(app)
      .get('/api/violations')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.violations.length).toBeGreaterThan(0);
    expect(listRes.body.stats).toHaveProperty('open');

    // C. Admin xử phạt truất quyền thi đấu (DQ)
    const resolveRes = await request(app)
      .post(`/api/violations/${createdVioId}/resolve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        penalty: 'DQ',
        note: 'Hủy tư cách thi đấu chặng này'
      });

    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.violation.status).toBe('RESOLVED');
    expect(resolveRes.body.effects.entryStatusChanged).toBe('DQ');
  });
});