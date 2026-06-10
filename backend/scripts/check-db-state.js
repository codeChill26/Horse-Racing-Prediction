require('dotenv/config');
const { Pool } = require('pg');

async function main() {
  const pool = new Pool({ connectionString: process.env.DIRECT_URL });
  const client = await pool.connect();
  try {
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name IN ('Tournament', 'Race', 'Horse', 'JockeyInvitation')
      ORDER BY table_name`);
    const migrations = await client.query(`
      SELECT migration_name, finished_at, rolled_back_at, logs
      FROM _prisma_migrations ORDER BY started_at`);
    const enums = await client.query(`
      SELECT t.typname FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public' AND t.typtype = 'e'
      ORDER BY t.typname`);
    const cols = await client.query(`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN ('Horse', 'Race', 'RaceEntry', 'JockeyInvitation')
      ORDER BY table_name, column_name`);
    console.log('TABLES:', tables.rows);
    console.log('MIGRATIONS:', migrations.rows.map((r) => ({
      name: r.migration_name,
      finished: r.finished_at,
      rolled_back: r.rolled_back_at,
    })));
    console.log('ENUMS:', enums.rows.map((r) => r.typname));
    console.log('COLUMNS:', cols.rows);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
