/* Presentation projections only. Domain actions and backend state stay in demo-core.js. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.HSBackOfficeView = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function metrics(state, order) {
    return { attempts:order ? state.deliveries.filter(d => d.order_id === order.id).reduce((n, d) => n + d.attempts, 0) : 0,
      invoices:order?.invoice ? 1 : 0 };
  }
  function activity(state, order, view) {
    if (view === 'inventory') {
      const checks = state.events.filter(e => e.kind === 'condition');
      const alert = state.conditionFired ? checks.findLast(e => e.status === 'alert_issued') : null;
      return [...new Map([...checks.slice(-5), ...(alert ? [alert] : [])].map(e => [e.id,e])).values()].sort((a,b) => b.at - a.at || b.id - a.id);
    }
    if (!order) return [];
    const direct = state.events.filter(e => e.order_id === order.id && e.status !== 'authorized' &&
      (['gateway','webhook'].includes(e.kind) || (e.kind === 'delivery' && e.status === 'failed'))).slice(-4);
    const scheduled = state.events.filter(e => !e.order_id && ['poll','reconciliation'].includes(e.kind) && e.at >= order.created_at);
    const recent = ['poll','reconciliation'].map(kind => scheduled.findLast(e => e.kind === kind)).filter(Boolean);
    const claim = scheduled.find(e => e.kind === order.fulfilled_by && e.at === order.fulfilled_at && e.found > 0);
    if (claim) recent.push(claim);
    return [...new Map([...direct,...recent].map(e => [e.id,e])).values()].sort((a,b) => b.at - a.at || b.id - a.id).slice(0,6);
  }
  function describe(e) {
    if (e.status === 'duplicate_ignored') return { title:'Duplicate webhook ignored', detail:'Same payment event. Existing invoice unchanged.', tone:'success' };
    if (e.status === 'alert_issued') return { title:'Reorder alert issued', detail:e.detail, tone:'success' };
    if (e.kind === 'gateway' && e.status === 'captured') return { title:'Payment captured', detail:'Authorized, then captured · payment.succeeded', tone:'' };
    if (e.kind === 'webhook' && e.status === 'delivered') return { title:'Order fulfilled by webhook', detail:'One invoice issued.', tone:'success' };
    if (e.kind === 'delivery' && e.status === 'failed') return { title:'Webhook delivery failed', detail:e.detail, tone:'warning' };
    if (['poll','reconciliation'].includes(e.kind)) {
      const name = e.kind === 'poll' ? 'Poll' : 'Reconciliation';
      if (e.status === 'ran') return { title:name + ' completed · ' + e.found + ' paid order' + (e.found === 1 ? '' : 's') + ' found',
        detail:e.found ? 'Run result across the active rehearsal.' : 'No eligible unfulfilled paid orders in this run.', tone:e.found ? 'success' : '' };
    }
    if (e.kind === 'condition') return { title:'Stock check completed', detail:e.detail, tone:'' };
    return { title:e.kind + ' · ' + e.status, detail:e.detail, tone:e.status === 'failed' ? 'warning' : '' };
  }
  return { metrics, activity, describe };
});
