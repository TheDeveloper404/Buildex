const { Pool } = require('pg');
require('dotenv').config();

async function reset() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'buildex',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  });

  try {
    console.log('Resetting database...');
    
    // Drop all tables in reverse order
    const tables = [
      'audit_log',
      'alerts',
      'alert_rules',
      'material_price_stats',
      'price_history',
      'offer_items',
      'offers',
      'supplier_invites',
      'rfq_items',
      'rfqs',
      'material_aliases',
      'materials',
      'suppliers',
      'sessions',
      'users',
      'tenants',
      'bullmq_jobs'
    ];

    for (const table of tables) {
      await pool.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
      console.log(`Dropped table: ${table}`);
    }

    console.log('Database reset completed');
  } catch (error) {
    console.error('Reset failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

reset();
