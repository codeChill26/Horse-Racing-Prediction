const { Client } = require('pg');
require('dotenv').config();
(async () => {
  const client = new Client({ connectionString: process.env.DIRECT_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const result = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'Notification' ORDER BY ordinal_position");
  console.log(result.rows);
  await client.end();
})().catch(e => { console.error(e); process.exit(1); });