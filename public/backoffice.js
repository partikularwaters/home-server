/* Browser adapter. Only Local Sim executes browser timers; Make Live reads
   snapshots and asks Make to run scenarios through the server boundary. */
(function () {
  'use strict';
  const C = window.HSDemo;
  const KEY = 'hs_backoffice_v1', MODE = 'hs_backoffice_mode', ID = 'hs_backoffice_id';
  let state, busy = false, ready = false, manualRuns = false, error = '', notice = '', customerSignature = '';
  let liveToken = sessionStorage.getItem('hs_presenter_token') || '';
  let mode = localStorage.getItem(MODE) || 'local';
  let demoId = localStorage.getItem(ID);
  if (!demoId) { demoId = crypto.randomUUID(); localStorage.setItem(ID, demoId); }
  function localState() { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : C.initial(Date.now()); }
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const money = x => '$' + Number(x).toFixed(2);
  const time = x => x === null || x === undefined ? '—' : new Date(x).toLocaleTimeString();
  async function lock(fn) {
    if (!navigator.locks) throw Error('This rehearsal needs a browser with Web Locks. Use a current Chrome, Edge, Firefox, or Safari on localhost or HTTPS.');
    return navigator.locks.request('hs-backoffice', fn);
  }
  async function api(a) {
    const r = await fetch('/api/backoffice', { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:'Bearer ' + liveToken },
      body:JSON.stringify({ ...a, demo_id:demoId }) });
    const result = await r.json();
    if (!r.ok) throw Error(result.error || 'Make Live request failed.');
    return result;
  }
  async function probe() {
    try {
      const r = await fetch('/api/backoffice', { signal:AbortSignal.timeout(1500) });
      if (!r.ok || !(r.headers.get('Content-Type') || '').includes('application/json')) return;
      const x = await r.json(); ready = x.ready; manualRuns = x.manualRuns;
      if (x.sessionId) {
        demoId = x.sessionId; localStorage.setItem(ID, demoId);
        document.getElementById('bo-session').textContent = demoId;
      }
    } catch (_) { ready = false; }
  }
  async function refresh() {
    mode = localStorage.getItem(MODE) || 'local';
    if (mode === 'live') {
      if (!liveToken) throw Error('Enter the presenter token in this tab to read Make Live.');
      state = (await api({ action:'snapshot' })).state;
      if (state.mode !== 'live') throw Error('Make Live has stopped. Switch to Local Sim.');
    } else state = localState();
  }
  async function dispatch(a) {
    await lock(async () => {
      mode = localStorage.getItem(MODE) || 'local';
      if (mode === 'live') {
        if (!state) await refresh();
        const r = await api({ ...a, generation:state.generation });
        state = r.state;
        if (r.queued) notice = 'Run requested in Make. Waiting for the scenario callback.';
      } else {
        const current = localState();
        state = C.apply(current, { ...a, executor:'local', generation:current.generation }, Date.now());
        localStorage.setItem(KEY, JSON.stringify(state));
      }
    });
    renderData(); renderCustomer();
  }
  async function switchMode(target) {
    await lock(async () => {
      if (target === 'live') {
        if (!ready || !liveToken) throw Error('Configure Make Live and enter the presenter token first.');
        const remote = (await api({ action:'snapshot' })).state;
        state = (await api({ action:'mode', mode:'live', generation:remote.generation })).state;
      } else {
        if ((localStorage.getItem(MODE) || 'local') === 'live') {
          const remote = (await api({ action:'snapshot' })).state;
          await api({ action:'mode', mode:'local', generation:remote.generation });
        }
        state = localState();
      }
      mode = target; localStorage.setItem(MODE, target);
    });
    notice = 'Executor changed. Local Sim and Make Live have separate rehearsal data.';
    renderControls(); renderData(); renderCustomer();
  }
  async function act(fn) {
    if (busy) return;
    busy = true; error = ''; renderMessage();
    document.querySelectorAll('[data-bo-action], #bo-live, #bo-local, .customer-action').forEach(b => b.disabled = true);
    try { await fn(); } catch (e) { error = e.message; }
    finally {
      busy = false;
      document.querySelectorAll('.customer-action').forEach(b => b.disabled = false);
      renderControls(); renderData(); renderCustomer(); renderMessage();
    }
  }
  const host = document.getElementById('backoffice');
  host.className = 'bo';
  host.innerHTML = `<details id="bo-details" ${document.body.dataset.page === 'admin' ? 'open' : ''}>
    <summary class="bo-head">PRESENTER COCKPIT · Back Office <span id="bo-executor"></span></summary>
    <div class="bo-body"><div class="bo-title"><h2>Webhooks &amp; polling</h2>
      <button id="bo-local">Local Sim</button><button id="bo-live">Make Live</button>
      <a href="admin.html">Open admin view ↗</a></div>
    <p class="sub">Local Sim runs in this browser. Make Live uses Supabase and Make. Each has separate rehearsal data.</p>
    <div class="bo-actions"><label>Presenter token <input id="bo-token" type="password" autocomplete="off" placeholder="Only needed for Make Live"></label>
      <button id="bo-connect">Connect</button><span id="bo-ready" class="bo-inline-note"></span></div>
    <p class="bo-inline-note">Live session: <code id="bo-session"></code> · generation <span id="bo-generation"></span></p>
    <div class="bo-controls">
      <fieldset><legend>Doorbell</legend><label><input id="bo-delivery" type="checkbox"> Webhook delivery on</label>
        <button data-bo-action="refire">Fire last webhook again</button><p class="bo-inline-note">Same event ID. One invoice.</p></fieldset>
      <fieldset><legend>Checklist</legend><label><input id="bo-poll" type="checkbox"> Poller enabled</label>
        <label>Interval <input id="bo-pollInterval" type="number" min="1" max="86400"> s</label>
        <button data-bo-action="poll">Run poller now</button><p id="bo-cursor" class="bo-inline-note"></p></fieldset>
      <fieldset><legend>Safety net</legend><label><input id="bo-reconciliation" type="checkbox"> Reconciliation enabled</label>
        <label>Interval <input id="bo-reconciliationInterval" type="number" min="1" max="86400"> s</label>
        <label>Paid for at least <input id="bo-threshold" type="number" min="1" max="86400"> s</label>
        <button data-bo-action="reconciliation">Run reconciliation now</button></fieldset>
      <fieldset><legend>Clock, no event</legend><label><input id="bo-condition" type="checkbox"> Condition check enabled</label>
        <label>Interval <input id="bo-conditionInterval" type="number" min="1" max="86400"> s</label>
        <label><input id="bo-armed" type="checkbox"> Arm reorder alert</label>
        <label>Stock <input id="bo-stock" type="number" min="0" max="86400"> below <input aria-label="Stock threshold" id="bo-stockThreshold" type="number" min="1" max="86400"></label>
        <button data-bo-action="condition">Run condition check now</button></fieldset>
    </div><p id="bo-scheduling" class="bo-inline-note"></p>
    <div class="bo-actions"><label><input id="bo-show" type="checkbox"> Show orders and event log</label>
      <button data-bo-action="reset">Reset active demo</button><button id="bo-refresh">Refresh</button></div>
    <div id="bo-message" class="bo-error" role="status" aria-live="polite"></div>
    <div id="bo-data" hidden><h2>Orders · fulfillment belongs to the first claim</h2><div class="bo-table"><table>
      <thead><tr><th>Order / items</th><th>Total</th><th>State</th><th>Fulfilled by</th><th>Paid → fulfilled</th><th>Invoice</th></tr></thead><tbody id="bo-orders"></tbody></table></div>
      <h2>Event log · deliveries and clock runs</h2><div class="bo-table"><table>
      <thead><tr><th>Time</th><th>Path</th><th>Status</th><th>Order / event</th><th>Attempt / found</th><th>Observation</th></tr></thead><tbody id="bo-events"></tbody></table></div></div>
    </div></details>`;
  document.getElementById('bo-session').textContent = demoId;
  document.getElementById('bo-token').value = liveToken;
  document.getElementById('bo-show').checked = document.body.dataset.page === 'admin';
  document.getElementById('bo-show').onchange = renderData;
  document.getElementById('bo-local').onclick = () => act(() => switchMode('local'));
  document.getElementById('bo-live').onclick = () => act(() => switchMode('live'));
  document.getElementById('bo-connect').onclick = () => act(async () => {
    liveToken = document.getElementById('bo-token').value.trim();
    sessionStorage.setItem('hs_presenter_token', liveToken);
    await probe();
    if (!ready) throw Error('Server-side Make configuration is incomplete. Local Sim is ready.');
    await api({ action:'snapshot' }); notice = 'Connected. Make Live can now be selected.';
    if (mode === 'live') await refresh();
  });
  document.getElementById('bo-refresh').onclick = () => act(async () => { await refresh(); });
  const settingsKeys = ['delivery','poll','reconciliation','condition','armed','pollInterval','reconciliationInterval','threshold','conditionInterval','stock','stockThreshold'];
  settingsKeys.forEach(k => {
    document.getElementById('bo-' + k).onchange = e => act(() => dispatch({ action:'settings',
      settings:{ [k]: e.target.type === 'checkbox' ? e.target.checked : Number(e.target.value) } }));
  });
  document.querySelectorAll('[data-bo-action]').forEach(button => {
    button.onclick = () => act(async () => {
      const action = button.dataset.boAction;
      if (mode === 'live' && ['poll','reconciliation','condition'].includes(action))
        await dispatch({ action:'request_run', path:action });
      else await dispatch({ action });
      if (action === 'reset') notice = 'Active demo reset. The original security-demo tables and cart are untouched.';
    });
  });
  function renderMessage() {
    document.getElementById('bo-message').textContent = error || notice;
    const customer = document.getElementById('customer');
    if (customer) {
      let message = document.getElementById('bo-customer-message');
      if (!message) {
        message = document.createElement('p'); message.id = 'bo-customer-message';
        message.setAttribute('role', 'status'); message.style.color = '#b00020';
        customer.after(message);
      }
      message.textContent = error;
    }
  }
  function renderControls() {
    const local = mode === 'local';
    document.getElementById('bo-executor').textContent = local ? '· Local Sim' : '· Make Live';
    document.getElementById('bo-local').classList.toggle('active', local);
    document.getElementById('bo-live').classList.toggle('active', !local);
    document.getElementById('bo-local').setAttribute('aria-pressed', String(local));
    document.getElementById('bo-live').setAttribute('aria-pressed', String(!local));
    document.getElementById('bo-live').disabled = busy || !ready || !liveToken;
    document.getElementById('bo-local').disabled = busy;
    document.getElementById('bo-ready').textContent = ready ? 'Live server configured' : 'Local Sim available; connect to check Make Live';
    document.getElementById('bo-scheduling').textContent = local
      ? 'Local schedules run while any HomeServer demo tab is open. Pause the checklist for Beat 3; let reconciliation own the recovery.'
      : 'Make owns the clock. Interval values here are rehearsal labels: configure matching schedules in Make. Browser refresh only reads the database.';
    if (state) {
      settingsKeys.forEach(k => { const el = document.getElementById('bo-' + k); if (el.type === 'checkbox') el.checked = state.settings[k]; else if (document.activeElement !== el) el.value = state.settings[k]; });
      document.getElementById('bo-generation').textContent = state.generation;
      document.getElementById('bo-cursor').textContent = 'Cursor: ' + time(state.cursor);
    }
    document.querySelectorAll('[data-bo-action]').forEach(b => {
      b.disabled = busy || (!local && !manualRuns && ['poll','reconciliation','condition'].includes(b.dataset.boAction));
      b.title = !local && !manualRuns ? 'Set Make API access for cockpit runs, or press Run once in Make.' : '';
    });
  }
  function renderData() {
    const show = document.getElementById('bo-show').checked;
    document.getElementById('bo-data').hidden = !show;
    if (!state || !show) return;
    document.getElementById('bo-orders').innerHTML = [...state.orders].reverse().map(o => `<tr><td><code>${esc(o.id)}</code><br>${o.items.map(it => esc(it.name) + ' × ' + it.qty).join(', ')}</td>
      <td>${money(o.total)}</td><td>${esc(o.state)}</td><td class="${o.state === 'fulfilled' ? 'fulfilled' : 'pending'}">${esc(o.fulfilled_by)}</td>
      <td>${time(o.paid_at)} → ${time(o.fulfilled_at)}</td><td>${esc(o.invoice || 'pending')}</td></tr>`).join('') || '<tr><td colspan="6">No orders yet. Add a part in the store and check out.</td></tr>';
    document.getElementById('bo-events').innerHTML = [...state.events].reverse().map(e => `<tr><td>${time(e.at)}</td><td>${esc(e.kind)}</td><td>${esc(e.status)}</td>
      <td><code>${esc(e.order_id || '')}<br>${esc(e.event_id || '')}</code></td><td>${e.attempts ?? e.found ?? '—'}</td><td>${esc(e.detail)}</td></tr>`).join('') || '<tr><td colspan="6">No deliveries or runs yet.</td></tr>';
  }
  function currentOrder() { return state?.orders.find(o => o.id === new URLSearchParams(location.search).get('order')); }
  function renderCustomer() {
    const content = document.getElementById('customer');
    if (!content || !state) return;
    const page = document.body.dataset.page;
    const o = currentOrder();
    const signature = JSON.stringify([page, mode, state.generation, o, busy]);
    if (customerSignature === signature) return;
    customerSignature = signature;
    if (page === 'payment' && o) {
      const phase = o.state !== 'created' ? 'captured' : o.authorized_at ? 'authorized' : 'awaiting authorization';
      content.innerHTML = `<h1>Mock payment gateway</h1><p class="sub">Order <code>${esc(o.id)}</code> · ${money(o.total)}</p>
        <div class="notice"><b>Simulation only.</b> No card details, real charges, or email delivery.</div>
        <p>Payment: <b>${phase}</b></p><p>Authorization reserves the amount. Capture marks the order paid and emits payment.succeeded.</p>
        ${o.state !== 'created' ? `<a href="order-success.html?order=${encodeURIComponent(o.id)}">View order confirmation →</a>`
          : `<button class="primary customer-action" id="gateway-action" ${busy ? 'disabled' : ''}>${o.authorized_at ? 'Capture mock payment' : 'Authorize ' + money(o.total)}</button>`}`;
      const b = document.getElementById('gateway-action');
      if (b) b.onclick = () => act(async () => {
        const action = o.authorized_at ? 'capture' : 'authorize';
        await dispatch({ action, order_id:o.id });
        if (action === 'capture') location.href = 'order-success.html?order=' + encodeURIComponent(o.id);
      });
    } else if (page === 'payment' && new URLSearchParams(location.search).has('order')) {
      content.innerHTML = '<h1>Order unavailable</h1><p>This order belongs to another rehearsal mode or was reset. <a href="payment.html">Start a new checkout</a>.</p>';
    } else if (page === 'success') {
      if (!o) { content.innerHTML = '<h1>Order unavailable</h1><p>The active rehearsal has no matching order. <a href="index.html">Return to the store</a>.</p>'; return; }
      content.innerHTML = `<h1>${o.state === 'created' ? 'Payment incomplete' : 'Thank you for your order'}</h1>
        <p>Order number: <code>${esc(o.id)}</code></p><p class="status">${o.state === 'fulfilled' ? 'Fulfilled' : o.state === 'paid' ? 'Payment received · fulfillment pending' : 'Awaiting payment'}</p>
        <p>${o.state === 'fulfilled' ? 'Your demo invoice is ready below.' : 'Your order will update here when fulfillment completes. Pending is a normal state.'}</p>
        ${summary(o.items, o.total)}${o.invoice ? `<a class="invoice" id="invoice-download" download="${esc(o.invoice)}.txt">Download demo invoice · ${esc(o.invoice)}</a>` : ''}
        <p><a href="index.html">Continue shopping</a>${o.state === 'created' ? ` · <a href="payment.html?order=${encodeURIComponent(o.id)}">Resume payment</a>` : ''}</p>`;
      const invoice = document.getElementById('invoice-download');
      if (invoice) invoice.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent('HOMESERVER · DEMO INVOICE\n' + o.invoice + '\nOrder: ' + o.id + '\n' + o.items.map(it => it.name + ' x ' + it.qty + ' @ ' + money(it.price)).join('\n') + '\nTotal: ' + money(o.total) + '\nSimulated payment only. No goods or money exchanged.');
    }
  }
  function summary(items, total) {
    return '<table><thead><tr><th>Item</th><th>Price</th></tr></thead><tbody>' + items.map(it => '<tr><td>' + esc(it.name) + ' × ' + it.qty + '</td><td>' + money(it.price * it.qty) + '</td></tr>').join('') + '<tr><td><b>Total</b></td><td><b>' + money(total) + '</b></td></tr></tbody></table>';
  }
  function checkout() {
    if (document.body.dataset.page !== 'payment' || location.search.includes('order=')) return;
    let cart; try { cart = JSON.parse(localStorage.getItem('hs_cart') || '{}'); } catch (_) { cart = {}; }
    const items = C.catalog.filter(p => Number.isInteger(cart[p.id]) && cart[p.id] > 0 && cart[p.id] <= 99).map(p => ({ ...p, qty:cart[p.id] }));
    const total = items.reduce((v, it) => v + it.qty * it.price, 0);
    const content = document.getElementById('customer');
    if (!items.length) { content.innerHTML = '<h1>Your cart is empty</h1><p><a href="index.html">Add a part in the store →</a></p>'; return; }
    content.innerHTML = `<h1>Checkout</h1><p class="sub">Review your parts, then continue to simulated payment.</p><div class="checkout-grid"><div>
      <p>No personal or card details are needed for this demonstration.</p><button class="primary customer-action" id="begin-payment">Continue to mock payment · ${money(total)}</button>
      <p class="sub">The gateway will authorize and capture in two steps.</p></div><div>${summary(items, total)}</div></div>`;
    const id = crypto.randomUUID(); // Stable across retries of this checkout submission.
    document.getElementById('begin-payment').onclick = () => act(async () => {
      await dispatch({ action:'create', id, items:items.map(it => ({ id:it.id, qty:it.qty })) });
      location.href = 'payment.html?order=' + encodeURIComponent(id);
    });
  }
  async function boot() {
    await probe();
    try { await refresh(); } catch (e) { error = e.message; }
    checkout(); renderControls(); renderData(); renderCustomer(); renderMessage();
    setInterval(async () => {
      if (busy) return;
      try {
        if ((localStorage.getItem(MODE) || 'local') === 'local') {
          await dispatch({ action:'tick' });
        } else await refresh();
        renderControls(); renderData(); renderCustomer();
      } catch (e) { error = e.message; renderMessage(); }
    }, 1000);
  }
  window.addEventListener('storage', () => { if (!busy) refresh().then(() => { renderControls(); renderData(); renderCustomer(); }).catch(e => { error = e.message; renderMessage(); }); });
  boot();
})();
