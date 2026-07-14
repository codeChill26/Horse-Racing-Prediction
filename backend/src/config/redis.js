// src/config/redis.js
const { createClient } = require('redis');
require('dotenv/config');

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => console.error('Redis Client Error:', err));

redisClient
  .connect()
  .then(() => {
    console.log(`✔ Connected successfully to Redis via: ${process.env.REDIS_URL || 'localhost:6379'}`);
  })
  .catch((err) => {
    console.error('✘ Redis initial connect failed:', err.message);
  });

module.exports = redisClient;