const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../public/demo-core.js');
const { createHandler } = require('../api/backoffice.js');
const ID = 'order-00000001';
function setup(now = 100000) {
  let s = C.initial(now);
  const step = (a, at = now) => (s = C.apply(s, a, at));
  return { get state() { return s; }, step,
    paid(at = now) {
      step({ action:'create', id:ID, items:[{ id:'rtx4090', qty:1 }] }, at);
      step({ action:'authorize', order_id:ID }, at);
      return step({ action:'capture', order_id:ID }, at);
    }
  };
}
test('speed: webhook wins, invoice is immediate, next poll finds zero', () => {
  const h = setup(); h.paid();
  assert.equal(h.state.orders[0].fulfilled_by, 'webhook');
  assert.equal(h.state.orders[0].fulfilled_at - h.state.orders[0].paid_at, 0);
  h.step({ action:'poll' }, 130000);
  assert.equal(h.state.events.at(-1).found, 0);
});
test('twice: same event and invoice across duplicate and competing paths', () => {
  const h = setup(); h.paid(); const invoice = h.state.orders[0].invoice;
  h.step({ action:'refire' }); h.step({ action:'poll' }); h.step({ action:'reconciliation' });
  assert.equal(h.state.orders[0].invoice, invoice);
  assert.equal(h.state.events.filter(e => e.status === 'duplicate_ignored').length, 1);
  assert.equal(h.state.orders[0].fulfilled_by, 'webhook');
});
test('never: disabled doorbell rests paid; age-gated reconciliation recovers', () => {
  const h = setup(); h.step({ action:'settings', settings:{ delivery:false, poll:false } }); h.paid();
  assert.equal(h.state.orders[0].state, 'paid');
  h.step({ action:'reconciliation' }, 109999); assert.equal(h.state.orders[0].state, 'paid');
  h.step({ action:'reconciliation' }, 110000); assert.equal(h.state.orders[0].fulfilled_by, 'reconciliation');
});
test('polling owns its own path, cursor includes boundary, empty runs log', () => {
  const h = setup(); h.step({ action:'settings', settings:{ delivery:false } });
  h.step({ action:'poll' }); h.paid(); h.step({ action:'poll' });
  assert.equal(h.state.orders[0].fulfilled_by, 'poll');
  h.step({ action:'poll' }); assert.equal(h.state.events.at(-1).found, 0);
  assert.equal(h.state.cursor, 100000);
});
test('no cursor means no poll; reconciliation remains independent', () => {
  const s = C.initial(100000); s.cursor = null;
  assert.throws(() => C.apply(s, { action:'poll' }, 100000), /cursor missing/);
  assert.doesNotThrow(() => C.apply(s, { action:'reconciliation' }, 100000));
  const later = C.apply(s, { action:'tick' }, 200000);
  assert.ok(later.events.some(e => e.kind === 'poll' && e.status === 'failed'));
  assert.ok(later.events.some(e => e.kind === 'reconciliation' && e.status === 'ran'));
});
test('condition scheduler issues one alert per arming without any webhook', () => {
  const h = setup(); h.step({ action:'settings', settings:{ armed:true } });
  h.step({ action:'tick' }, 120000); h.step({ action:'tick' }, 140000);
  assert.equal(h.state.events.filter(e => e.status === 'alert_issued').length, 1);
  assert.equal(h.state.events.filter(e => ['webhook','delivery'].includes(e.kind)).length, 0);
});
test('failed deliveries retry at 1/2/4 seconds, cap at four attempts', () => {
  const h = setup(); h.step({ action:'settings', settings:{ delivery:false, poll:false, reconciliation:false } }); h.paid();
  h.step({ action:'tick' }, 100999); assert.equal(h.state.deliveries[0].attempts, 1);
  for (const at of [101000,103000,107000,200000]) h.step({ action:'tick' }, at);
  assert.equal(h.state.deliveries[0].attempts, 4);
  assert.equal(h.state.deliveries[0].next_at, null);
  h.step({ action:'settings', settings:{ delivery:true } }); h.step({ action:'refire' });
  assert.equal(h.state.orders[0].fulfilled_by, 'webhook');
});
test('mode switch rejects old callbacks and browser timers; reset increments generation', () => {
  const h = setup(); h.paid(); h.step({ action:'mode', mode:'live' });
  assert.throws(() => h.step({ action:'tick' }), /cannot execute/);
  assert.throws(() => h.step({ action:'poll', executor:'local' }), /Inactive executor/);
  assert.throws(() => h.step({ action:'webhook', generation:1 }), /Stale/);
  const reset = h.step({ action:'reset' });
  assert.equal(reset.generation, 3); assert.equal(reset.orders.length, 0); assert.equal(reset.events.length, 0);
  assert.equal(reset.mode, 'live');
});
test('gateway requires authorization and validates products, quantities, and stable creation ID', () => {
  const h = setup();
  assert.throws(() => h.step({ action:'create', id:ID, items:[{ id:'rtx4090', qty:-1 }] }), /Invalid product/);
  h.step({ action:'create', id:ID, items:[{ id:'rtx4090', qty:1 }], total:1 });
  assert.equal(h.state.orders[0].total, 1599);
  assert.throws(() => h.step({ action:'capture', order_id:ID }), /Authorize/);
  h.paid(); h.step({ action:'capture', order_id:ID });
  assert.equal(h.state.orders.length, 1); assert.equal(h.state.deliveries.length, 1);
});
test('webhook validates type, paid order, and exact event identity', () => {
  const h = setup(); h.paid();
  for (const payload of [{ type:'wrong', event_id:'evt-'+ID }, { type:'payment.succeeded', event_id:'wrong' }])
    assert.throws(() => h.step({ action:'webhook', order_id:ID, ...payload }));
});

function backend() {
  const rows = new Map(); let conflicts = 0; const hooks = [];
  const env = { SUPABASE_URL:'https://database.example', SUPABASE_SERVICE_ROLE_KEY:'server-secret',
    DEMO_PRESENTER_TOKEN:'presenter', MAKE_AUTOMATION_TOKEN:'automation', MAKE_PAYMENT_WEBHOOK_URL:'https://hook.example/pay',
    MAKE_DEMO_SESSION_ID:'00000000-0000-4000-8000-000000000001',
    MAKE_API_TOKEN:'make-secret', MAKE_API_BASE_URL:'https://eu1.make.com/api/v2',
    MAKE_POLL_SCENARIO_ID:'12', MAKE_RECONCILIATION_SCENARIO_ID:'13', MAKE_CONDITION_SCENARIO_ID:'14' };
  const fetcher = async (url, opts) => {
    const a = JSON.parse(opts.body);
    if (!url.startsWith(env.SUPABASE_URL)) { hooks.push({ url, ...a }); return { ok:true }; }
    if (url.endsWith('/backoffice_load')) {
      if (!rows.has(a.p_id)) rows.set(a.p_id, { version:0, state:a.p_initial });
      return { ok:true, json:async () => structuredClone(rows.get(a.p_id)) };
    }
    const row = rows.get(a.p_id);
    if (conflicts > 0) { conflicts--; return { ok:true, json:async () => false }; }
    if (row.version !== a.p_version) return { ok:true, json:async () => false };
    rows.set(a.p_id, { version:row.version+1, state:a.p_state });
    return { ok:true, json:async () => true };
  };
  const handler = createHandler(env, fetcher), demo_id = '00000000-0000-4000-8000-000000000001';
  const call = async (a, token = 'presenter', method = 'POST') => {
    let status, data;
    await handler({ method, headers:{ authorization:'Bearer '+token }, body:{ demo_id, ...a } },
      { setHeader() {}, status(n) { status=n; return this; }, json(x) { data=x; } });
    return { status, ...data };
  };
  return { call, hooks, rows, conflict() { conflicts=1; }, demo_id };
}
test('live adapter: authorization, CAS retry, capture, duplicate, concurrent poll race, scoped reset', async () => {
  const b = backend();
  assert.equal((await b.call({}, 'wrong')).status, 401);
  assert.equal((await b.call({ action:'snapshot', demo_id:'00000000-0000-4000-8000-000000000002' })).status, 409);
  assert.equal((await b.call({ action:'reset' }, 'automation')).status, 403);
  assert.equal((await b.call({ action:'mode', mode:'live' })).status, 200);
  b.conflict();
  const apply = a => b.call({ generation:2, ...a });
  assert.equal((await apply({ action:'create', id:ID, items:[{ id:'rtx4090', qty:1 }] })).status, 200);
  await apply({ action:'authorize', order_id:ID }); await apply({ action:'capture', order_id:ID });
  assert.equal(b.hooks.length, 1);
  const event = b.hooks[0];
  assert.equal((await b.call({ action:'webhook', ...event }, 'automation')).status, 200);
  const race = await Promise.all([
    b.call({ action:'webhook', ...event }, 'automation'),
    b.call({ action:'poll', generation:2 }, 'automation')
  ]);
  assert.ok(race.every(x => x.status === 200));
  const snapshot = (await b.call({ action:'snapshot' })).state;
  assert.equal(snapshot.orders[0].invoice, 'INV-'+ID);
  assert.equal(snapshot.events.filter(e => e.status === 'duplicate_ignored').length, 1);
  assert.equal((await apply({ action:'request_run', path:'poll' })).status, 202);
  assert.ok(b.hooks.at(-1).url.endsWith('/scenarios/12/run'));
  await apply({ action:'reset' });
  assert.equal((await b.call({ action:'webhook', ...event }, 'automation')).status, 409);
  assert.equal((await b.call({ action:'snapshot' })).state.orders.length, 0);
  assert.equal(b.rows.size, 1);
});
test('Make context enables real scheduled runs; inactive executor is rejected', async () => {
  const b = backend();
  const context = await b.call({ action:'context' }, 'automation');
  assert.equal(context.mode, 'local');
  assert.equal((await b.call({ action:'poll', generation:1 }, 'automation')).status, 409);
  assert.equal((await b.call({ action:'snapshot' }, 'automation')).status, 403);
});
