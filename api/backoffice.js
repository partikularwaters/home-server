'use strict';
const crypto = require('node:crypto');
const Core = require('../public/demo-core.js');

function equal(a, b) {
  if (!a || !b) return false;
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
function configured(env) {
  return !!(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY && env.DEMO_PRESENTER_TOKEN &&
    env.MAKE_AUTOMATION_TOKEN && env.MAKE_PAYMENT_WEBHOOK_URL &&
    /^[0-9a-f-]{36}$/i.test(env.MAKE_DEMO_SESSION_ID || ''));
}
function scheduledRunsConfigured(env) {
  return !!(env.MAKE_API_TOKEN && /^[1-9][0-9]*$/.test(env.MAKE_SCHEDULED_SCENARIO_ID || '') &&
    /^https:\/\/[a-z0-9]+\.make\.com\/api\/v2$/.test(env.MAKE_API_BASE_URL || ''));
}
function createHandler(env = process.env, fetcher = fetch) {
  async function rpc(name, args) {
    const r = await fetcher(env.SUPABASE_URL + '/rest/v1/rpc/' + name, {
      method: 'POST', headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(args), signal: AbortSignal.timeout(8000)
    });
    if (!r.ok) throw Error('Demo database unavailable. Check the additive migration and server configuration.');
    return r.json();
  }
  async function load(id) { return rpc('backoffice_load', { p_id: id, p_initial: Core.initial(Date.now()) }); }
  async function mutate(id, action) {
    for (let tries = 0; tries < 8; tries++) {
      const row = await load(id);
      const next = Core.apply(row.state, action, Date.now());
      if (await rpc('backoffice_cas', { p_id: id, p_version: row.version, p_state: next })) return next;
    }
    throw Error('Demo is busy; retry this action.');
  }
  async function postMake(url, body) {
    if (!url || !url.startsWith('https://')) throw Error('Make hook missing.');
    const r = await fetcher(url, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body), signal: AbortSignal.timeout(4000) });
    return r.ok;
  }
  async function drain(id, generation) {
    // Each attempt has a durable lease. Concurrent requests cannot send it twice
    // before lease expiry; an expiry may redeliver, which fulfillment tolerates.
    for (let count = 0; count < 4; count++) {
      const lease = crypto.randomUUID();
      const s = await mutate(id, { action: 'claim_delivery', executor: 'live', generation, lease_id: lease });
      const d = s.deliveries.find(d => d.lease?.id === lease);
      if (!d) return s;
      let ok = false;
      if (s.settings.delivery) {
        try { ok = await postMake(env.MAKE_PAYMENT_WEBHOOK_URL, { demo_id: id, generation,
          type: 'payment.succeeded', event_id: d.event_id, order_id: d.order_id }); } catch (_) { /* Durable retry below. */ }
      }
      await mutate(id, { action: 'delivery_result', executor: 'live', generation,
        delivery_id: d.id, lease_id: lease, ok });
    }
    return (await load(id)).state;
  }
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    const send = (status, data) => res.status(status).json(data);
    if (req.method === 'GET') return send(200, { ready: configured(env), sessionId: env.MAKE_DEMO_SESSION_ID || null, manualRuns: scheduledRunsConfigured(env) });
    if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return send(405, { error: 'Method not allowed.' }); }
    const token = String(req.headers.authorization || '').replace(/^Bearer /, '');
    const presenter = equal(token, env.DEMO_PRESENTER_TOKEN);
    const automation = equal(token, env.MAKE_AUTOMATION_TOKEN);
    if (!presenter && !automation) return send(401, { error: 'Presenter or Make authorization required.' });
    if (!configured(env)) return send(503, { error: 'Make Live is not configured. Use Local Sim.' });
    let a;
    try { a = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; } catch (_) { return send(400, { error: 'Invalid JSON.' }); }
    if (!a || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(a.demo_id || ''))
      return send(400, { error: 'Invalid demo session.' });
    if (a.demo_id !== env.MAKE_DEMO_SESSION_ID) return send(409, { error: 'Session does not match the configured Make rehearsal. Reconnect the cockpit.' });
    const allowed = automation ? ['context', 'webhook', 'poll', 'reconciliation', 'condition', 'retry']
      : ['snapshot', 'mode', 'reset', 'settings', 'create', 'authorize', 'capture', 'refire', 'request_run'];
    if (!allowed.includes(a.action)) return send(403, { error: 'This caller cannot perform that action.' });
    if (!['snapshot', 'context', 'mode'].includes(a.action) && !Number.isInteger(a.generation))
      return send(400, { error: 'Generation is required.' });
    try {
      let s = (await load(a.demo_id)).state;
      if (a.action === 'snapshot') return send(200, { state: s });
      if (a.action === 'context') return send(200, { demo_id: a.demo_id, generation: s.generation, mode: s.mode, settings: s.settings });
      if (a.action === 'request_run') {
        if (s.mode !== 'live' || s.generation !== a.generation) throw Error('Inactive or stale executor.');
        if (a.path !== 'scheduled') throw Error('Use the S2 scheduled engine, which runs all enabled checks.');
        const scenarioId = env.MAKE_SCHEDULED_SCENARIO_ID;
        if (!scheduledRunsConfigured(env))
          throw Error('Panel runs require Make API access and the S2 scenario configuration. Use Run once in S2: Scheduled engine.');
        const r = await fetcher(env.MAKE_API_BASE_URL + '/scenarios/' + encodeURIComponent(scenarioId) + '/run', {
          method: 'POST', headers: { Authorization: 'Token ' + env.MAKE_API_TOKEN, 'Content-Type': 'application/json' },
          body: JSON.stringify({ responsive: false }), signal: AbortSignal.timeout(4000)
        });
        if (!r.ok) throw Error('Make did not acknowledge S2. Check your plan, API access, and the active scheduled engine.');
        return send(202, { state: (await load(a.demo_id)).state, queued: true });
      }
      if (a.action === 'retry') {
        s = await drain(a.demo_id, a.generation);
      } else {
        // Never accept a browser-selected executor. This route is the live boundary.
        s = await mutate(a.demo_id, { ...a, executor: 'live' });
        if (['capture', 'refire'].includes(a.action)) s = await drain(a.demo_id, s.generation);
      }
      return send(200, { state: s });
    } catch (e) {
      // No provider bodies, environment values, or credentials in responses.
      return send(409, { error: e.message === 'fetch failed' || /timeout/i.test(e.message)
        ? 'External service timed out. Refresh the order; captured payments are not charged again.' : e.message });
    }
  };
}
module.exports = createHandler();
module.exports.createHandler = createHandler;
