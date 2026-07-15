const { Client } = require('pg');
const fs = require('fs');
require('dotenv').config();

(async () => {
  const client = new Client({
    connectionString: process.env.DIRECT_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  const sql = fs.readFileSync('prisma/migrations/20260714_add_notification_model/migration.sql', 'utf-8');
  await client.query(sql);
  console.log('Migration applied');
  await client.end();
})().catch(e => { console.error(e); process.exit(1); });