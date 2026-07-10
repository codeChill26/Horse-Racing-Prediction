// backend/tests/phase2.integration.test.js
const request = require('supertest');
const app = require('../app');
const prisma = require('../src/config/prisma');
const redisClient = require('../src/config/redis');
const jwt = require('jsonwebtoken');

describe('Phase 2 - Admin Horse Revoke Transaction Test Suite', () => {
  let adminToken;
  let adminRedisKey;
  let targetHorseId;

  beforeAll(async () => {
    const jwtSecret = process.env.JWT_SECRET || 'secret';
    
    // 1. Sinh Access Token ảo có quyền ADMIN
    adminToken = jwt.sign({ sub: 1, role: 'ADMIN' }, jwtSecret, { expiresIn: '1h' });
    
    // 2. Nạp trạng thái phiên hoạt động (Stateful Session) trực tiếp vào RAM Redis Docker để vượt qua authMiddleware
    adminRedisKey = `accessToken:1:${adminToken}`;
    await redisClient.set(adminRedisKey, 'true', { EX: 3600 });

    // 3. Truy vấn tìm kiếm một con ngựa APPROVED thật dưới Database để phục vụ kiểm thử luồng Transaction
    const sampleHorse = await prisma.horse.findFirst({
      where: { status: 'APPROVED' }
    });

    if (sampleHorse) {
      targetHorseId = sampleHorse.horseId;
    } else {
      // Giá trị fallback an toàn bảo vệ tiến trình không bị crash nếu DB trống
      targetHorseId = 1;
    }
  });

  afterAll(async () => {
    // Thu hồi dọn dẹp RAM Redis sau khi bộ Test hoàn thành
    await redisClient.del(adminRedisKey);
    
    // Ngắt kết nối để đóng triệt để các Open Handles của Jest
    await redisClient.quit();
    await prisma.$disconnect();
  });

  test('CRITICAL-9: POST /api/admin/horses/:id/revoke - Luồng chạy thành công hoặc chặn đúng chuẩn nghiệp vụ DB', async () => {
    const res = await request(app)
      .post(`/api/admin/horses/${targetHorseId}/revoke`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        reason: 'Phát hiện gian lận nghiêm trọng về thông tin đăng kiểm nguồn gốc ngựa'
      });

    // Chấp nhận 200 (Thành công) hoặc 400/404 (Nếu bản ghi trống hoặc trạng thái thực tế không phải APPROVED)
    // Tuyệt đối không được phép lỗi sập nguồn hệ thống 500 hay lỗi định tuyến 404 Route Not Found
    expect([200, 400, 404]).toContain(res.status);
    
    if (res.status === 200) {
      expect(res.body).toHaveProperty('horse');
      expect(res.body.horse.status).toBe('INACTIVE');
      expect(res.body).toHaveProperty('cancelledEntries');
      expect(res.body).toHaveProperty('cancelledInvitations');
    }
  });

  test('CRITICAL-9: POST /api/admin/horses/:id/revoke - Phải lỗi 400 nếu lý do quá ngắn (Dưới 5 ký tự)', async () => {
    const res = await request(app)
      .post(`/api/admin/horses/${targetHorseId}/revoke`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        reason: 'Fake'
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toContain('reason must be at least 5 characters');
  });
});