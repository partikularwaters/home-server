const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../public/demo-core.js');
const V = require('../public/backoffice-view.js');
function rehearsal() {
  let now = 100000, state = C.initial(now);
  return { get state() { return state; }, step(a, elapsed = 0) { now += elapsed; state = C.apply(state,a,now); },
    pay(id) { this.step({ action:'create', id, items:[{ id:'rtx4090',qty:1 }] }); this.step({ action:'authorize',order_id:id }); this.step({ action:'capture',order_id:id }); } };
}
test('focused evidence and delivery counts cannot leak from another order', () => {
  const h = rehearsal(); h.pay('order-first-001'); h.pay('order-second-002'); h.step({ action:'refire',order_id:'order-second-002' });
  const [first,second] = h.state.orders;
  assert.deepEqual(V.metrics(h.state,first), { attempts:1,invoices:1 });
  assert.deepEqual(V.metrics(h.state,second), { attempts:2,invoices:1 });
  assert.ok(V.activity(h.state,first,'orders').every(e => e.order_id === 'order-first-001'));
  assert.ok(!V.activity(h.state,first,'orders').some(e => e.status === 'duplicate_ignored'));
  assert.ok(V.activity(h.state,second,'orders').some(e => e.status === 'duplicate_ignored'));
});
test('recurring empty runs do not bury payment and duplicate evidence', () => {
  const h = rehearsal(); h.pay('order-first-001'); h.step({ action:'refire',order_id:'order-first-001' });
  for (let i=0;i<50;i++) h.step({ action:'tick' },30000);
  const events = V.activity(h.state,h.state.orders[0],'orders');
  assert.ok(events.some(e => e.status === 'duplicate_ignored'));
  assert.ok(events.some(e => e.status === 'captured'));
  assert.ok(events.length <= 6);
  assert.equal(events.filter(e => e.kind === 'poll').length,1);
});
test('reconciliation claim remains visible after subsequent empty runs', () => {
  const h = rehearsal(); h.step({ action:'settings',settings:{ delivery:false,poll:false } }); h.pay('order-first-001');
  h.step({ action:'reconciliation' },10000);
  for (let i=0;i<20;i++) h.step({ action:'reconciliation' },60000);
  const events = V.activity(h.state,h.state.orders[0],'orders');
  assert.ok(events.some(e => e.kind === 'reconciliation' && e.found === 1));
  assert.ok(events.some(e => e.kind === 'reconciliation' && e.found === 0));
});
test('scheduler descriptions report rehearsal results without inventing causality', () => {
  const d = V.describe({ kind:'poll',status:'ran',found:0 });
  assert.match(d.title,/0 paid orders/);
  assert.doesNotMatch(d.detail,/webhook/i);
  const found = V.describe({ kind:'reconciliation',status:'ran',found:2 });
  assert.match(found.title,/2 paid orders/);
  assert.match(found.detail,/active rehearsal/);
});
test('inventory evidence excludes prior payment events and preserves the once-per-condition result', () => {
  const h = rehearsal(); h.pay('order-first-001'); h.step({ action:'settings',settings:{ armed:true } });
  h.step({ action:'condition' }); h.step({ action:'condition' },1000);
  const events = V.activity(h.state,h.state.orders[0],'inventory');
  assert.equal(events.length,2);
  assert.ok(events.every(e => e.kind === 'condition'));
  assert.equal(events.filter(e => e.status === 'alert_issued').length,1);
  assert.deepEqual(V.activity(h.state,undefined,'orders'),[]);
});

test('scheduled checks keep the issued alert visible after many empty runs', () => {
  const h = rehearsal(); h.step({ action:'settings',settings:{ armed:true } });
  for (let i=0;i<30;i++) h.step({ action:'condition' },20000);
  const events = V.activity(h.state,undefined,'inventory');
  assert.ok(events.some(e => e.status === 'alert_issued'));
  assert.equal(events.length,6);
});
