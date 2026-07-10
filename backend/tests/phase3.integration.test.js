// backend/tests/phase3.integration.test.js
const request = require('supertest');
const app = require('../app');
const prisma = require('../src/config/prisma');
const redisClient = require('../src/config/redis');
const jwt = require('jsonwebtoken');

describe('Phase 3 - Personal Violations & Referee Deviations Test Suite', () => {
  let adminToken;
  let adminRedisKey;

  beforeAll(async () => {
    const jwtSecret = process.env.JWT_SECRET || 'secret';
    adminToken = jwt.sign({ sub: 1, role: 'ADMIN' }, jwtSecret, { expiresIn: '1h' });
    adminRedisKey = `accessToken:1:${adminToken}`;
    await redisClient.set(adminRedisKey, 'true', { EX: 3600 });
  });

  afterAll(async () => {
    await redisClient.del(adminRedisKey);
    await redisClient.quit();
    await prisma.$disconnect();
  });

  test('HIGH-16: GET /api/me/violations - Nên truy cập mượt mà và trả về mảng danh sách vi phạm cá nhân', async () => {
    const res = await request(app)
      .get('/api/me/violations')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('violations');
    expect(Array.isArray(res.body.violations)).toBe(true);
  });

  test('HIGH-17: GET /api/admin/deviations - Nên lấy được danh sách lệch kết quả trận đua của Trọng tài', async () => {
    const res = await request(app)
      .get('/api/admin/deviations?status=CONFLICTED')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('deviations');
    expect(Array.isArray(res.body.deviations)).toBe(true);
  });
});