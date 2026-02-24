const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
require('dotenv').config();

const DEMO_PASSWORD = 'demo1234';

async function seed() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'buildex',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  });

  try {
    console.log('Seeding database...');

    // Check if demo tenant already exists
    const existingTenant = await pool.query(
      'SELECT id FROM tenants WHERE name = $1',
      ['Demo Construction SRL']
    );

    let tenantId;
    if (existingTenant.rows.length > 0) {
      tenantId = existingTenant.rows[0].id;
      console.log('Demo tenant already exists, using existing ID:', tenantId);
    } else {
      // Create demo tenant
      const tenantResult = await pool.query(
        'INSERT INTO tenants (name) VALUES ($1) RETURNING id',
        ['Demo Construction SRL']
      );
      tenantId = tenantResult.rows[0].id;
      console.log('Created demo tenant:', tenantId);
    }

    // Check if demo user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE tenant_id = $1 AND email = $2',
      [tenantId, 'admin@democonstruction.ro']
    );

    let userId;
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
    
    if (existingUser.rows.length > 0) {
      userId = existingUser.rows[0].id;
      // Update password hash in case it changed
      await pool.query(
        'UPDATE users SET password_hash = $1 WHERE id = $2',
        [passwordHash, userId]
      );
      console.log('Demo user already exists, updated password:', userId);
    } else {
      // Create demo user with password
      const userResult = await pool.query(
        'INSERT INTO users (tenant_id, email, password_hash, name, role) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [tenantId, 'admin@democonstruction.ro', passwordHash, 'Demo Admin', 'admin']
      );
      userId = userResult.rows[0].id;
      console.log('Created demo user:', userId);
    }

    // Create demo materials
    const materials = [
      { name: 'Ciment Portland 32.5', unit: 'kg', spec: { strength: '32.5 MPa', type: 'Portland' } },
      { name: 'Ciment Portland 42.5', unit: 'kg', spec: { strength: '42.5 MPa', type: 'Portland' } },
      { name: 'Beton B200 (C16/20)', unit: 'mc', spec: { class: 'C16/20', volume: 'cubic_meter' } },
      { name: 'Beton B250 (C20/25)', unit: 'mc', spec: { class: 'C20/25', volume: 'cubic_meter' } },
      { name: 'Otel beton PC52, D10', unit: 'm', spec: { diameter: 10, grade: 'PC52', type: 'smooth' } },
      { name: 'Otel beton PC52, D12', unit: 'm', spec: { diameter: 12, grade: 'PC52', type: 'smooth' } },
      { name: 'Otel beton OB37, D10', unit: 'm', spec: { diameter: 10, grade: 'OB37', type: 'ribbed' } },
      { name: 'Caramida plina 240x115x63', unit: 'buc', spec: { dimensions: '240x115x63', type: 'solid' } },
      { name: 'Caramida gaurita 290x140x188', unit: 'buc', spec: { dimensions: '290x140x188', type: 'hollow' } },
      { name: 'Bca 600x200x250', unit: 'mc', spec: { dimensions: '600x200x250', type: 'autoclaved_aerated_concrete' } },
      { name: 'Polistiren expandat EPS50', unit: 'mc', spec: { density: 'EPS50', thickness_mm: 100 } },
      { name: 'Polistiren extrudat XPS', unit: 'mc', spec: { type: 'XPS', thickness_mm: 50 } },
    ];

    const materialIds = {};
    for (const mat of materials) {
      const existing = await pool.query(
        'SELECT id FROM materials WHERE tenant_id = $1 AND canonical_name = $2',
        [tenantId, mat.name]
      );
      
      let mid;
      if (existing.rows.length > 0) {
        mid = existing.rows[0].id;
      } else {
        const result = await pool.query(
          'INSERT INTO materials (tenant_id, canonical_name, unit, spec_json) VALUES ($1, $2, $3, $4) RETURNING id',
          [tenantId, mat.name, mat.unit, JSON.stringify(mat.spec)]
        );
        mid = result.rows[0].id;
        console.log('Created material:', mat.name);
      }
      materialIds[mat.name] = mid;
    }

    // Create aliases for materials
    const aliases = [
      { alias: 'Ciment M32.5', material: 'Ciment Portland 32.5' },
      { alias: 'Ciment 32.5R', material: 'Ciment Portland 32.5' },
      { alias: 'Ciment M42.5', material: 'Ciment Portland 42.5' },
      { alias: 'Ciment 42.5R', material: 'Ciment Portland 42.5' },
      { alias: 'Beton C16/20', material: 'Beton B200 (C16/20)' },
      { alias: 'Beton B200', material: 'Beton B200 (C16/20)' },
      { alias: 'Beton C20/25', material: 'Beton B250 (C20/25)' },
      { alias: 'Beton B250', material: 'Beton B250 (C20/25)' },
      { alias: 'Otel D10', material: 'Otel beton PC52, D10' },
      { alias: 'Otel fi 10', material: 'Otel beton PC52, D10' },
      { alias: 'Otel D12', material: 'Otel beton PC52, D12' },
      { alias: 'Otel fi 12', material: 'Otel beton PC52, D12' },
    ];

    for (const alias of aliases) {
      const existing = await pool.query(
        'SELECT id FROM material_aliases WHERE tenant_id = $1 AND alias_text = $2',
        [tenantId, alias.alias]
      );
      
      if (existing.rows.length === 0 && materialIds[alias.material]) {
        await pool.query(
          'INSERT INTO material_aliases (tenant_id, alias_text, material_id) VALUES ($1, $2, $3)',
          [tenantId, alias.alias, materialIds[alias.material]]
        );
        console.log('Created alias:', alias.alias);
      }
    }

    // Create demo suppliers
    const suppliers = [
      { name: 'Beton Construct SRL', email: 'office@betonconstruct.ro', phone: '021-555-0100', city: 'Bucuresti' },
      { name: 'Materiale Bd. SRL', email: 'vanzari@materialebd.ro', phone: '021-555-0200', city: 'Bucuresti' },
      { name: 'Otel Pro SRL', email: 'comenzi@otelpro.ro', phone: '021-555-0300', city: 'Bucuresti' },
      { name: 'Caramida Plus SRL', email: 'contact@caramidaplus.ro', phone: '021-555-0400', city: 'Cluj-Napoca' },
      { name: 'Izolatii Expert SRL', email: 'office@izolatiiexpert.ro', phone: '0264-555-0500', city: 'Cluj-Napoca' },
      { name: 'Construct Mat SRL', email: 'vanzari@constructmat.ro', phone: '0251-555-0600', city: 'Craiova' },
    ];

    for (const sup of suppliers) {
      const existing = await pool.query(
        'SELECT id FROM suppliers WHERE tenant_id = $1 AND name = $2',
        [tenantId, sup.name]
      );
      
      if (existing.rows.length === 0) {
        await pool.query(
          'INSERT INTO suppliers (tenant_id, name, email, phone, city) VALUES ($1, $2, $3, $4, $5)',
          [tenantId, sup.name, sup.email, sup.phone, sup.city]
        );
        console.log('Created supplier:', sup.name);
      }
    }

    // Create demo RFQs
    const rfqs = [
      { project: 'Bloc Rezidential Faza 1', city: 'Bucuresti', date: new Date('2026-03-15') },
      { project: 'Cladire Birouri Centru', city: 'Cluj-Napoca', date: new Date('2026-04-01') },
    ];

    for (const rfq of rfqs) {
      const existing = await pool.query(
        'SELECT id FROM rfqs WHERE tenant_id = $1 AND project_name = $2',
        [tenantId, rfq.project]
      );
      
      if (existing.rows.length === 0) {
        const rfqResult = await pool.query(
          'INSERT INTO rfqs (tenant_id, project_name, delivery_city, desired_date, status) VALUES ($1, $2, $3, $4, $5) RETURNING id',
          [tenantId, rfq.project, rfq.city, rfq.date, 'draft']
        );
        const rfqId = rfqResult.rows[0].id;
        console.log('Created RFQ:', rfq.project);

        // Add items to RFQ
        const matNames = Object.keys(materialIds).slice(0, 5);
        for (let i = 0; i < matNames.length; i++) {
          await pool.query(
            'INSERT INTO rfq_items (rfq_id, material_id, qty, notes) VALUES ($1, $2, $3, $4)',
            [rfqId, materialIds[matNames[i]], 100 + i * 50, 'Urgent']
          );
        }
      }
    }

    // Get supplier IDs for price history
    const supplierResult = await pool.query(
      'SELECT id, name, city FROM suppliers WHERE tenant_id = $1',
      [tenantId]
    );
    const supplierIds = {};
    for (const sup of supplierResult.rows) {
      supplierIds[sup.name] = { id: sup.id, city: sup.city };
    }

    // Create demo price history (last 90 days)
    console.log('Creating price history...');
    const cities = ['Bucuresti', 'Cluj-Napoca', 'Craiova', 'Timisoara', 'Iasi'];
    const materialNames = Object.keys(materialIds);
    
    const basePrices = {
      'Ciment Portland 32.5': 18,
      'Ciment Portland 42.5': 22,
      'Beton B200 (C16/20)': 280,
      'Beton B250 (C20/25)': 320,
      'Otel beton PC52, D10': 5.5,
      'Otel beton PC52, D12': 6.2,
      'Otel beton OB37, D10': 5.8,
      'Caramida plina 240x115x63': 1.8,
      'Caramida gaurita 290x140x188': 2.5,
      'Bca 600x200x250': 420,
      'Polistiren expandat EPS50': 180,
      'Polistiren extrudat XPS': 350,
    };

    const supplierNames = Object.keys(supplierIds);
    
    for (let day = 0; day < 90; day++) {
      const date = new Date();
      date.setDate(date.getDate() - day);
      
      // Add prices for random materials and cities
      for (let i = 0; i < 5; i++) {
        const matName = materialNames[Math.floor(Math.random() * materialNames.length)];
        const city = cities[Math.floor(Math.random() * cities.length)];
        const supplierName = supplierNames[Math.floor(Math.random() * supplierNames.length)];
        const basePrice = basePrices[matName] || 100;
        
        // Add some variance (+/- 15%)
        const variance = 1 + (Math.random() - 0.5) * 0.3;
        const price = Math.round(basePrice * variance * 100) / 100;
        
        await pool.query(
          `INSERT INTO price_history (tenant_id, material_id, supplier_id, city, unit_price, currency, observed_at, source)
           VALUES ($1, $2, $3, $4, $5, 'RON', $6, 'manual')
           ON CONFLICT DO NOTHING`,
          [tenantId, materialIds[matName], supplierIds[supplierName]?.id, city, price, date]
        );
      }
    }
    console.log('Created price history for last 90 days');

    // Create demo alert rules
    const alertRules = [
      { material: 'Ciment Portland 32.5', type: 'threshold', minPrice: 15, maxPrice: 25, city: 'Bucuresti' },
      { material: 'Beton B200 (C16/20)', type: 'threshold', minPrice: 250, maxPrice: 350, city: 'Bucuresti' },
    ];

    for (const rule of alertRules) {
      if (materialIds[rule.material]) {
        const existing = await pool.query(
          'SELECT id FROM alert_rules WHERE tenant_id = $1 AND material_id = $2',
          [tenantId, materialIds[rule.material]]
        );
        if (existing.rows.length === 0) {
          const params = { minPrice: rule.minPrice, maxPrice: rule.maxPrice, city: rule.city };
          await pool.query(
            'INSERT INTO alert_rules (tenant_id, material_id, rule_type, params_json, is_active) VALUES ($1, $2, $3, $4, true)',
            [tenantId, materialIds[rule.material], rule.type, JSON.stringify(params)]
          );
          console.log('Created alert rule for:', rule.material);
        }
      }
    }

    console.log('');
    console.log('========================================');
    console.log('Seeding completed successfully');
    console.log('========================================');
    console.log('Tenant ID:', tenantId);
    console.log('User ID:', userId);
    console.log('');
    console.log('Demo credentials:');
    console.log('  Email:    admin@democonstruction.ro');
    console.log('  Password: demo1234');
    console.log('========================================');
    
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
