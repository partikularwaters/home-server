/* Optional PostgreSQL migration check using @electric-sql/pglite.
   Pass the installed module's absolute directory as the first argument. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require(process.argv[2] || '@electric-sql/pglite');
const C = require('../public/demo-core.js');
(async () => {
  const db = new PGlite();
  try {
    await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
    await db.exec(fs.readFileSync(path.join(__dirname, '../schema.sql'), 'utf8'));
    await db.exec("insert into orders_vuln(customer,email,items,total) values('Original demo','demo@example.com','[]',1);");
    const migration = fs.readFileSync(path.join(__dirname, '../backoffice.sql'), 'utf8');
    await db.exec(migration);
    await db.exec(migration); // Re-running setup must preserve records and grants.
    const id = '00000000-0000-4000-8000-000000000001';
    const other = '00000000-0000-4000-8000-000000000002';
    await db.exec('set role service_role');
    const initial = C.initial(100000);
    const loaded = await db.query('select public.backoffice_load($1::uuid,$2::jsonb) as result', [id, JSON.stringify(initial)]);
    assert.equal(loaded.rows[0].result.version, 0);
    await db.query('select public.backoffice_load($1::uuid,$2::jsonb)', [other, JSON.stringify(initial)]);
    let state = C.apply(initial, { action:'create', id:'order-0001', items:[{ id:'rtx4090', qty:1 }] }, 100000);
    state = C.apply(state, { action:'authorize', order_id:'order-0001' }, 100000);
    state = C.apply(state, { action:'capture', order_id:'order-0001' }, 100000);
    const contenders = await Promise.all([1,2].map(() => db.query(
      'select public.backoffice_cas($1::uuid,$2::bigint,$3::jsonb) as won', [id, 0, JSON.stringify(state)])));
    assert.equal(contenders.filter(x => x.rows[0].won).length, 1);
    assert.equal((await db.query('select count(*)::int as n from public.backoffice_orders')).rows[0].n, 1);
    assert.ok((await db.query('select count(*)::int as n from public.backoffice_events')).rows[0].n > 0);
    const reset = C.apply(state, { action:'reset' }, 200000);
    await db.query('select public.backoffice_cas($1::uuid,$2::bigint,$3::jsonb)', [id, 1, JSON.stringify(reset)]);
    assert.equal((await db.query('select count(*)::int as n from public.backoffice_orders')).rows[0].n, 0);
    assert.equal((await db.query('select count(*)::int as n from public.backoffice_sessions')).rows[0].n, 2);
    for (const role of ['anon','authenticated']) {
      await db.exec('reset role; set role ' + role);
      await assert.rejects(db.query('select * from public.backoffice_sessions'), /permission denied/);
      await assert.rejects(db.query('select * from public.backoffice_orders'), /permission denied/);
      await assert.rejects(db.query('select public.backoffice_load($1::uuid,$2::jsonb)', [id, '{}']), /permission denied/);
      await assert.rejects(db.query('select public.backoffice_cas($1::uuid,$2::bigint,$3::jsonb)', [id, 2, '{}']), /permission denied/);
    }
    await db.exec('reset role');
    assert.equal((await db.query('select count(*)::int as n from orders_vuln')).rows[0].n, 1);
    assert.equal((await db.query('select count(*)::int as n from products')).rows[0].n, 6);
    console.log('PostgreSQL migration passed: repeat setup, atomic claims, views, role restrictions, session isolation, and original-record preservation.');
  } finally { await db.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
