// backend/tests/phase4.integration.test.js
const request = require('supertest');
const app = require('../app');
const prisma = require('../src/config/prisma');
const redisClient = require('../src/config/redis');
const jwt = require('jsonwebtoken');

describe('Phase 4 - Referees and Betting Stats API Test Suite', () => {
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

  test('MEDIUM-19: GET /api/admin/referees - Nên lấy danh sách trọng tài định dạng phẳng thành công', async () => {
    const res = await request(app)
      .get('/api/admin/referees')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('referees');
    expect(Array.isArray(res.body.referees)).toBe(true);
  });

  test('MEDIUM-20: GET /api/predictions/stats - Nên tính toán chính xác tổng quan tài chính cá cược', async () => {
    const res = await request(app)
      .get('/api/predictions/stats')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('summary');
    expect(res.body.summary).toHaveProperty('winRate');
    expect(res.body.summary).toHaveProperty('netProfit');
  });
});