/* Shared, deterministic state machine. Local Sim and the server use this file. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.HSDemo = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const catalog = [
    { id: 'rtx4090', name: 'RTX 4090 24GB', spec: '24GB VRAM. For rendering.', price: 1599 },
    { id: 'teslap40', name: 'Tesla P40 24GB (used)', spec: '24GB VRAM. No video output. For servers.', price: 199 },
    { id: 'rpi5', name: 'Raspberry Pi 5 8GB', spec: 'Coordinates.', price: 80 },
    { id: 'nvme4tb', name: '4TB NVMe Gen4 SSD', spec: 'Weights are heavy.', price: 299 },
    { id: 'ddr5kit', name: '128GB DDR5 ECC kit', spec: 'Insufficient, always.', price: 449 },
    { id: 'psu1600', name: '1600W Titanium PSU', spec: 'The 4090 is thirsty.', price: 329 }
  ];
  const clone = x => JSON.parse(JSON.stringify(x));
  function initial(now, generation = 1) {
    return { generation, mode: 'local', orders: [], events: [], deliveries: [],
      cursor: now, last: { poll: now, reconciliation: now, condition: now },
      settings: { delivery: true, poll: true, reconciliation: true, condition: true,
        pollInterval: 30, reconciliationInterval: 60, threshold: 10,
        conditionInterval: 20, armed: false, stock: 3, stockThreshold: 5 },
      conditionFired: false, sequence: 0 };
  }
  function log(s, now, kind, status, detail, extra = {}) {
    s.events.push({ id: ++s.sequence, at: now, kind, status, detail, ...extra });
  }
  function order(s, id) {
    const o = s.orders.find(x => x.id === id);
    if (!o) throw Error('Order not found in this demo.');
    return o;
  }
  function fulfill(s, o, path, now) {
    if (o.state !== 'paid') return false;
    o.state = 'fulfilled'; o.fulfilled_at = now; o.fulfilled_by = path;
    o.invoice = 'INV-' + o.id; // Exactly one deterministic invoice per order.
    return true;
  }
  function receive(s, a, now) {
    if (a.type !== 'payment.succeeded') throw Error('Unsupported payment event.');
    const o = order(s, a.order_id);
    if (o.webhook_event_id !== a.event_id || o.state === 'created') throw Error('Event does not match a captured payment.');
    const changed = fulfill(s, o, 'webhook', now);
    log(s, now, 'webhook', changed ? 'delivered' : 'duplicate_ignored',
      changed ? 'Payment verified; one invoice issued.' : 'Already fulfilled; invoice unchanged.',
      { order_id: o.id, event_id: a.event_id,
        attempts: s.events.filter(e => e.kind === 'webhook' && e.event_id === a.event_id).length + 1 });
  }
  function attempt(s, d, now, failed) {
    d.attempts++;
    const o = order(s, d.order_id);
    if (failed) {
      d.status = 'failed';
      d.next_at = d.attempts < 4 ? now + 1000 * Math.pow(2, d.attempts - 1) : null;
      log(s, now, 'delivery', 'failed', d.attempts < 4 ? 'Receiver unavailable; retry scheduled.' : 'Retry limit reached; polling remains the safety net.',
        { order_id: o.id, event_id: o.webhook_event_id, attempts: d.attempts });
    } else {
      d.status = 'delivered'; d.next_at = null;
      log(s, now, 'delivery', 'delivered', 'Gateway delivery acknowledged.',
        { order_id: o.id, event_id: o.webhook_event_id, attempts: d.attempts });
    }
  }
  function queue(s, o, now) {
    const d = { id: 'delivery-' + (++s.sequence), order_id: o.id,
      event_id: o.webhook_event_id, attempts: 0, next_at: now, status: 'pending', lease: null };
    s.deliveries.push(d);
    return d;
  }
  function run(s, path, now) {
    if (path === 'poll' && !Number.isFinite(s.cursor)) throw Error('Polling cursor missing. Reset the demo before polling.');
    const start = s.cursor;
    const eligible = s.orders.filter(o => o.state === 'paid' && (path === 'poll'
      ? o.paid_at >= start && o.paid_at <= now : o.paid_at <= now - s.settings.threshold * 1000));
    eligible.forEach(o => fulfill(s, o, path, now));
    if (path === 'poll') s.cursor = now; // Inclusive boundary: equal timestamps cannot be skipped.
    s.last[path] = now;
    log(s, now, path, 'ran', 'Found ' + eligible.length + ' new paid order(s).',
      { found: eligible.length, cursor_from: path === 'poll' ? start : null, cursor_to: path === 'poll' ? now : null });
  }
  function condition(s, now) {
    const met = s.settings.armed && s.settings.stock < s.settings.stockThreshold;
    const fires = met && !s.conditionFired;
    if (fires) s.conditionFired = true;
    s.last.condition = now;
    log(s, now, 'condition', fires ? 'alert_issued' : 'ran', fires
      ? 'Reorder alert: stock ' + s.settings.stock + ' is below ' + s.settings.stockThreshold + '.'
      : met ? 'Condition already handled; no second alert.' : 'No armed condition met.', { found: fires ? 1 : 0 });
  }
  function apply(input, a, now) {
    let s = clone(input);
    if (!Number.isFinite(now)) throw Error('Clock unavailable.');
    if (a.generation !== undefined && a.generation !== s.generation) throw Error('Stale demo generation. Refresh after reset or mode change.');
    if (a.action === 'reset') {
      const mode = s.mode;
      s = initial(now, s.generation + 1); s.mode = mode;
      return s;
    }
    if (a.action === 'mode') {
      if (!['local', 'live'].includes(a.mode)) throw Error('Unknown executor.');
      if (a.mode !== s.mode) {
        s.mode = a.mode; s.generation++;
        // Old callbacks and retry leases are invalid in the new generation.
        s.deliveries.forEach(d => { d.next_at = null; d.lease = null; });
        log(s, now, 'mode', 'changed', a.mode === 'local' ? 'Local Sim is the sole executor.' : 'Make Live is the sole executor.');
      }
      return s;
    }
    if (a.executor && a.executor !== s.mode) throw Error('Inactive executor rejected.');
    switch (a.action) {
      case 'settings': {
        const x = a.settings || {};
        for (const k of ['delivery', 'poll', 'reconciliation', 'condition', 'armed']) {
          if (k in x) { if (typeof x[k] !== 'boolean') throw Error('Invalid toggle.'); s.settings[k] = x[k]; }
        }
        for (const k of ['pollInterval', 'reconciliationInterval', 'threshold', 'conditionInterval', 'stock', 'stockThreshold']) {
          if (k in x) {
            if (!Number.isInteger(x[k]) || x[k] < (k === 'stock' ? 0 : 1) || x[k] > 86400) throw Error('Invalid interval or threshold.');
            s.settings[k] = x[k];
          }
        }
        if ('armed' in x || 'stock' in x || 'stockThreshold' in x) s.conditionFired = false;
        break;
      }
      case 'create': {
        if (typeof a.id !== 'string' || !/^[a-zA-Z0-9-]{8,80}$/.test(a.id)) throw Error('Invalid order number.');
        if (s.orders.some(o => o.id === a.id)) break; // Network retry of checkout.
        if (!Array.isArray(a.items) || !a.items.length || a.items.length > 30) throw Error('Cart is empty or too large.');
        const items = a.items.map(it => {
          const p = catalog.find(p => p.id === it.id);
          if (!p || !Number.isInteger(it.qty) || it.qty < 1 || it.qty > 99) throw Error('Invalid product or quantity.');
          return { id: p.id, name: p.name, qty: it.qty, price: p.price };
        });
        s.orders.push({ id: a.id, items, total: Math.round(items.reduce((v, it) => v + it.qty * it.price, 0) * 100) / 100,
          state: 'created', created_at: now, paid_at: null, fulfilled_at: null,
          fulfilled_by: 'pending', webhook_event_id: 'evt-' + a.id, invoice: null });
        log(s, now, 'order', 'created', 'Order created; awaiting mock authorization.', { order_id: a.id });
        break;
      }
      case 'authorize': {
        const o = order(s, a.order_id);
        if (o.state === 'created' && !o.authorized_at) {
          o.authorized_at = now;
          log(s, now, 'gateway', 'authorized', 'Mock authorization only. No charge.', { order_id: o.id });
        }
        break;
      }
      case 'capture': {
        const o = order(s, a.order_id);
        if (o.state !== 'created') break;
        if (!o.authorized_at) throw Error('Authorize before capture.');
        o.state = 'paid'; o.paid_at = now;
        log(s, now, 'gateway', 'captured', 'Mock capture; payment.succeeded emitted.', { order_id: o.id, event_id: o.webhook_event_id });
        queue(s, o, now);
        break;
      }
      case 'refire': {
        const o = order(s, a.order_id || s.orders[s.orders.length - 1]?.id);
        if (o.state === 'created') throw Error('Capture payment first.');
        queue(s, o, now); break;
      }
      case 'webhook': receive(s, a, now); break;
      case 'poll': if (s.settings.poll) run(s, 'poll', now); else log(s, now, 'poll', 'paused', 'Poller is paused.'); break;
      case 'reconciliation': if (s.settings.reconciliation) run(s, 'reconciliation', now); else log(s, now, 'reconciliation', 'paused', 'Reconciliation is paused.'); break;
      case 'condition': if (s.settings.condition) condition(s, now); break;
      case 'tick':
        if (s.mode !== 'local') throw Error('Browser timers cannot execute in Make Live.');
        for (const path of ['poll', 'reconciliation', 'condition']) {
          const interval = s.settings[path + 'Interval'];
          if (s.settings[path] && now - s.last[path] >= interval * 1000) {
            if (path === 'condition') condition(s, now);
            else if (path === 'poll' && !Number.isFinite(s.cursor)) {
              s.last.poll = now;
              log(s, now, 'poll', 'failed', 'Polling cursor missing. Reset required; reconciliation remains independent.');
            } else run(s, path, now);
          }
        }
        break;
      case 'claim_delivery': {
        const d = s.deliveries.find(d => d.next_at !== null && d.next_at <= now && (!d.lease || d.lease.until <= now));
        if (d) d.lease = { id: a.lease_id, until: now + 15000 };
        break;
      }
      case 'delivery_result': {
        const d = s.deliveries.find(d => d.id === a.delivery_id);
        if (!d || d.lease?.id !== a.lease_id) break;
        attempt(s, d, now, !a.ok); d.lease = null;
        break;
      }
      default: throw Error('Unknown demo action.');
    }
    // A local delivery is a direct call. It runs before a scheduled poll at capture.
    if (s.mode === 'local') {
      for (const d of s.deliveries) {
        if (d.next_at === null || d.next_at > now) continue;
        attempt(s, d, now, !s.settings.delivery);
        if (s.settings.delivery) receive(s, { type: 'payment.succeeded', order_id: d.order_id, event_id: d.event_id }, now);
      }
    }
    return s;
  }
  return { initial, apply, catalog };
});
