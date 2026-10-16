/* Browser adapter. Only Local Sim executes browser timers; Make Live reads
   snapshots and asks Make to run scenarios through the server boundary. */
(function () {
  'use strict';
  const C = window.HSDemo, V = window.HSBackOfficeView;
  const KEY = 'hs_backoffice_v1', MODE = 'hs_backoffice_mode', ID = 'hs_backoffice_id';
  let state, busy = false, ready = false, manualRuns = false, error = '', notice = '', customerSignature = '';
  let liveToken = sessionStorage.getItem('hs_presenter_token') || '';
  let mode = localStorage.getItem(MODE) || 'local';
  let demoId = localStorage.getItem(ID);
  if (!demoId) { demoId = crypto.randomUUID(); localStorage.setItem(ID, demoId); }
  function localState() { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : C.initial(Date.now()); }
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const money = x => '$' + Number(x).toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 });
  const short = x => String(x).slice(0,8).toUpperCase();
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
    busy = true; error = ''; notice = ''; renderMessage();
    renderControls();
    document.querySelectorAll('.customer-action').forEach(b => b.disabled = true);
    try { await fn(); } catch (e) { error = e.message; }
    finally {
      busy = false;
      document.querySelectorAll('.customer-action').forEach(b => b.disabled = false);
      renderControls(); renderData(); renderCustomer(); renderMessage();
    }
  }
  const host = document.getElementById('backoffice');
  const admin = document.body.dataset.page === 'admin';
  let evidenceView = 'orders', selectedOrderId = new URLSearchParams(location.search).get('order');
  const setHTML = (id, html) => { const el = document.getElementById(id); if (el.innerHTML !== html) el.innerHTML = html; };
  const toggle = (key, label) => `<button class="focus-toggle" data-focus-setting="${key}" aria-pressed="false"><span class="switch" aria-hidden="true"></span>${label} <span data-setting-label="${key}">Off</span></button>`;
  host.className = 'bo';
  const setup = `<div class="bo-title"><h2>Webhooks &amp; polling</h2>
      <button id="bo-local">Local Sim</button><button id="bo-live">Make Live</button>
      <a href="admin.html">Open admin view ↗</a></div>
    <details class="bo-connection"><summary>Connection settings</summary><p class="sub">Local Sim runs in this browser. Make Live uses Supabase and Make. Each has separate rehearsal data.</p>
    <div class="bo-actions"><label>Presenter token <input id="bo-token" type="password" autocomplete="off" placeholder="Only needed for Make Live"></label>
      <button id="bo-connect">Connect</button><span id="bo-ready" class="bo-inline-note"></span></div>
    <p class="bo-inline-note">Live session: <code id="bo-session"></code> · generation <span id="bo-generation"></span></p></details>
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
    <div class="bo-actions">
      <button data-bo-action="reset">Reset active demo</button><button id="bo-refresh">Refresh</button></div>
`;
  const raw = `<section class="bo-raw" id="bo-data"><h2>Orders · fulfillment belongs to the first claim</h2><div class="bo-table"><table>
      <thead><tr><th>Order / items</th><th>Total</th><th>Payment / state</th><th>Fulfilled by</th><th>Paid → fulfilled</th><th>Invoice</th></tr></thead><tbody id="bo-orders"></tbody></table></div>
      <h2>Event log · deliveries and clock runs</h2><div class="bo-table"><table>
      <thead><tr><th>Time</th><th>Path</th><th>Status</th><th>Order / event</th><th>Attempt / found</th><th>Observation</th></tr></thead><tbody id="bo-events"></tbody></table></div></section>`;
  host.innerHTML = `<div class="bo-head"><h1>Back Office</h1><span id="bo-executor">Loading…</span>
    ${admin ? '<a href="payment.html">Customer checkout →</a>' : '<button id="bo-settings-open">Settings</button>'}</div>
    ${admin ? '' : `<div class="bo-tabs" role="tablist" aria-label="Back Office view"><button class="bo-tab" role="tab" id="bo-orders-tab" aria-selected="true" aria-controls="bo-presentation">Orders</button><button class="bo-tab" role="tab" id="bo-inventory-tab" aria-selected="false" aria-controls="bo-presentation" tabindex="-1">Inventory</button></div>
    <section id="bo-presentation" class="bo-presentation" role="tabpanel" aria-labelledby="bo-orders-tab">
      <div class="focus-controls" id="focus-order-controls">${toggle('delivery','Webhook')}${toggle('poll','Polling')}${toggle('reconciliation','Recovery')}</div>
      <div class="focus-controls" id="focus-inventory-controls" hidden>${toggle('condition','Scheduled check')}${toggle('armed','Reorder alert')}</div>
      <div class="focus-card"><div class="focus-title"><h2 id="focus-title">Next order</h2><select id="focus-order" aria-label="Inspect order" hidden></select><span id="focus-total" class="muted"></span></div><div id="focus-summary"></div></div>
      <div class="focus-activity"><div class="activity-heading"><h2 id="focus-activity-title">Order activity</h2><button id="bo-inspect-open" class="text-action">Inspect records</button></div><div id="focus-events" class="focus-events"></div></div>
      <div class="focus-actions" id="focus-order-actions"><button data-bo-action="refire">Resend webhook</button><button data-bo-action="poll">Run poller</button><button data-bo-action="reconciliation">Run reconciliation</button></div>
      <div class="focus-actions" id="focus-inventory-actions" hidden><button data-bo-action="condition">Run stock check</button></div>
    </section>`}
    <div id="bo-message" class="bo-error" role="status" aria-live="polite"></div>
    ${admin ? `<section class="bo-settings">${setup.replace('<a href="admin.html">Open admin view ↗</a>','')}</section>${raw}` : `<dialog id="bo-settings" class="bo-settings" aria-labelledby="bo-settings-title"><div class="dialog-heading"><h2 id="bo-settings-title">Presentation settings</h2><button data-close-dialog="bo-settings">Close</button></div>${setup}<p class="sub"><a href="admin.html">Open full admin view →</a></p></dialog><dialog id="bo-inspect" aria-labelledby="bo-inspect-title"><div class="dialog-heading"><h2 id="bo-inspect-title">Rehearsal records</h2><button data-close-dialog="bo-inspect">Close</button></div>${raw}</dialog>`}`;
  document.querySelectorAll('[data-close-dialog]').forEach(button => button.onclick = () => document.getElementById(button.dataset.closeDialog).close());
  document.getElementById('bo-settings-open')?.addEventListener('click', () => document.getElementById('bo-settings').showModal());
  document.getElementById('bo-inspect-open')?.addEventListener('click', () => { document.getElementById('bo-inspect').showModal(); renderData(); });
  function selectView(view) {
    evidenceView = view;
    for (const name of ['orders','inventory']) {
      const tab = document.getElementById('bo-' + name + '-tab');
      tab.setAttribute('aria-selected', String(name === view)); tab.tabIndex = name === view ? 0 : -1;
    }
    document.getElementById('bo-presentation').setAttribute('aria-labelledby', 'bo-' + view + '-tab');
    renderPresentation();
  }
  if (!admin) {
    for (const view of ['orders','inventory']) {
      const tab = document.getElementById('bo-' + view + '-tab');
      tab.onclick = () => selectView(view);
      tab.onkeydown = e => {
        if (!['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) return;
        e.preventDefault(); const next = e.key === 'Home' ? 'orders' : e.key === 'End' ? 'inventory' : view === 'orders' ? 'inventory' : 'orders';
        selectView(next); document.getElementById('bo-' + next + '-tab').focus();
      };
    }
    document.getElementById('focus-order').onchange = e => { selectedOrderId = e.target.value; renderControls(); };
    document.querySelectorAll('[data-focus-setting]').forEach(button => button.onclick = () => act(() => dispatch({ action:'settings', settings:{ [button.dataset.focusSetting]:!state.settings[button.dataset.focusSetting] } })));
  }
  document.getElementById('bo-session').textContent = demoId;
  document.getElementById('bo-token').value = liveToken;
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
      else await dispatch({ action, ...(action === 'refire' ? { order_id:focusedOrder()?.id } : {}) });
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
        message.setAttribute('role', 'status'); message.setAttribute('aria-live', 'polite');
        customer.after(message);
      }
      message.textContent = error;
    }
  }
  function renderControls() {
    const local = mode === 'local';
    document.getElementById('bo-executor').textContent = local ? 'Local Sim' : 'Make Live';
    host.dataset.delivery = state?.settings.delivery ? 'on' : 'off';
    document.getElementById('bo-local').classList.toggle('active', local);
    document.getElementById('bo-live').classList.toggle('active', !local);
    document.getElementById('bo-local').setAttribute('aria-pressed', String(local));
    document.getElementById('bo-live').setAttribute('aria-pressed', String(!local));
    document.getElementById('bo-live').disabled = busy || !ready || !liveToken;
    document.getElementById('bo-local').disabled = busy;
    document.getElementById('bo-ready').textContent = ready ? 'Live server configured' : 'Local Sim available; connect to check Make Live';
    document.getElementById('bo-scheduling').textContent = local
      ? 'Browser schedules active · Webhook, polling, and reconciliation share one order lifecycle.'
      : 'Make owns the clock. Interval values here are rehearsal labels: configure matching schedules in Make. Browser refresh only reads the database.';
    if (state) {
      settingsKeys.forEach(k => { const el = document.getElementById('bo-' + k); if (el.type === 'checkbox') el.checked = state.settings[k]; else if (document.activeElement !== el) el.value = state.settings[k]; });
      document.getElementById('bo-generation').textContent = state.generation;
      document.getElementById('bo-cursor').textContent = 'Cursor: ' + time(state.cursor);
    }
    document.querySelectorAll('[data-bo-action]').forEach(b => {
      b.disabled = busy || !state || (b.closest('#focus-order-actions') && !focusedOrder()) || (b.dataset.boAction === 'refire' && !focusedOrder()?.paid_at) || (!local && !manualRuns && ['poll','reconciliation','condition'].includes(b.dataset.boAction));
      b.title = !local && !manualRuns ? 'Set Make API access for cockpit runs, or press Run once in Make.' : '';
    });
    document.querySelectorAll('[data-focus-setting], .bo-settings input').forEach(el => el.disabled = busy || !state);
    renderPresentation();
  }
  function renderData() {
    if (!state) return;
    renderPresentation();
    if (!admin && !document.getElementById('bo-inspect').open) return;
    document.getElementById('bo-orders').innerHTML = [...state.orders].reverse().map(o => `<tr><td><code title="${esc(o.id)}">${esc(o.id)}</code><br>${o.items.map(it => esc(it.name) + ' × ' + it.qty).join(', ')}</td>
      <td>${money(o.total)}</td><td>${o.state === 'created' && o.authorized_at ? 'authorized' : esc(o.state)}</td><td class="${o.state === 'fulfilled' ? 'fulfilled' : 'pending'}">${esc(o.fulfilled_by)}</td>
      <td>${time(o.paid_at)} → ${time(o.fulfilled_at)}</td><td>${esc(o.invoice || 'pending')}</td></tr>`).join('') || '<tr><td colspan="6">No orders yet. Add a part in the store and check out.</td></tr>';
    document.getElementById('bo-events').innerHTML = [...state.events].reverse().map(e => `<tr><td>${time(e.at)}</td><td>${esc(e.kind)}</td><td>${esc(e.status)}</td>
      <td><code>${esc(e.order_id || '')}<br>${esc(e.event_id || '')}</code></td><td>${e.attempts ?? e.found ?? '—'}</td><td>${esc(e.detail)}</td></tr>`).join('') || '<tr><td colspan="6">No deliveries or runs yet.</td></tr>';
  }
  function focusedOrder() {
    if (selectedOrderId) return state.orders.find(o => o.id === selectedOrderId);
    return document.body.dataset.page === 'payment' ? undefined : state.orders.at(-1);
  }
  function renderPresentation() {
    if (admin || !state) return;
    const inventory = evidenceView === 'inventory', o = focusedOrder();
    for (const key of ['order-controls','order-actions']) document.getElementById('focus-' + key).hidden = inventory;
    for (const key of ['inventory-controls','inventory-actions']) document.getElementById('focus-' + key).hidden = !inventory;
    document.querySelectorAll('[data-focus-setting]').forEach(button => {
      const key = button.dataset.focusSetting, on = state.settings[key];
      button.setAttribute('aria-pressed', String(on)); button.disabled = busy;
      const label = button.querySelector('[data-setting-label]');
      label.textContent = key === 'armed' ? (on ? 'Armed' : 'Off') : (on ? 'On' : 'Off');
      label.className = on ? 'muted' : 'off-label';
    });
    const select = document.getElementById('focus-order');
    select.hidden = inventory || state.orders.length === 0;
    document.getElementById('focus-title').hidden = !select.hidden;
    document.getElementById('focus-title').textContent = inventory ? 'Stock condition' : 'Next order';
    const options = '<option value="">Next order</option>' + [...state.orders].reverse().map(order => `<option value="${esc(order.id)}">Order #${esc(short(order.id))}</option>`).join('');
    if (select.innerHTML !== options && document.activeElement !== select) select.innerHTML = options;
    if (document.activeElement !== select) select.value = o ? o.id : '';
    document.getElementById('focus-total').textContent = inventory ? 'Inventory' : o ? money(o.total) : 'Awaiting checkout';
    const fact = (label,value) => `<div><div class="fact-label">${label}</div><div class="fact-value">${value}</div></div>`;
    if (inventory) {
      setHTML('focus-summary', `<div class="focus-stock">${fact('Current stock',esc(state.settings.stock) + ' <span class="small muted">units</span>')}${fact('Reorder below',esc(state.settings.stockThreshold) + ' <span class="small muted">units</span>')}</div>
        <div class="focus-status ${state.conditionFired ? 'success' : ''}">${state.conditionFired ? 'Reorder alert issued' : state.settings.armed ? 'Waiting for scheduled check' : 'Reorder alert is not armed'}</div>
        <div class="focus-facts">${fact('Trigger','Schedule')}${fact('Payment event','Not required')}${fact('Alerts this condition',state.conditionFired ? 1 : 0)}</div>`);
    } else {
      const m = V.metrics(state,o), fulfilled = o?.state === 'fulfilled';
      const eligibleIn = o?.paid_at ? Math.max(0, Math.ceil((o.paid_at + state.settings.threshold * 1000 - Date.now()) / 1000)) : null;
      const note = o?.invoice ? `Invoice <span class="mono" title="${esc(o.invoice)}">INV-${esc(short(o.id))}</span> · ${state.events.some(e => e.order_id === o.id && e.status === 'duplicate_ignored') ? 'Unchanged after duplicate delivery' : 'One invoice for this order'}`
        : o?.paid_at ? eligibleIn ? `Recovery eligible in ${eligibleIn} seconds.` : 'Paid-age threshold reached. Reconciliation can recover this order.' : 'Complete checkout to see payment and fulfillment.';
      setHTML('focus-summary', `<div class="focus-status ${fulfilled ? 'success' : o?.paid_at ? 'warning' : ''}">${fulfilled ? 'Fulfilled by ' + esc(o.fulfilled_by === 'poll' ? 'polling' : o.fulfilled_by) : o?.paid_at ? 'Paid · Awaiting fulfillment' : o?.authorized_at ? 'Payment authorized' : 'Ready to receive payment'}</div>
        <div class="focus-facts">${fact('Payment',o?.paid_at ? 'Received' : o?.authorized_at ? 'Authorized' : 'Not received')}${fact('Delivery attempts',m.attempts)}${fact('Invoices issued',m.invoices)}</div><p class="focus-note">${note}</p>`);
    }
    document.getElementById('focus-activity-title').textContent = inventory ? 'Stock check activity' : 'Order activity';
    const events = V.activity(state,o,evidenceView);
    setHTML('focus-events', events.map(e => {
      const d = V.describe(e);
      return `<div class="focus-event ${d.tone}"><time>${esc(new Date(e.at).toLocaleTimeString('en-GB', { hour12:false }))}</time><span class="event-dot" aria-hidden="true"></span><div class="event-copy">${esc(d.title)}<div class="event-detail">${esc(d.detail)}</div></div></div>`;
    }).join('') || `<p class="empty-evidence">${inventory ? 'Arm the alert, then run a stock check to see what the schedule finds.' : 'Payment and fulfillment events will appear here.'}</p>`);
  }
  function currentOrder() { return state?.orders.find(o => o.id === new URLSearchParams(location.search).get('order')); }
  let checkoutId = crypto.randomUUID();
  let draft = { name:'Ada Lovelace', email:'ada@example.com', address:'42 Circuit Lane', city:'San Francisco', postal:'94107', country:'United States' };
  try { draft = { ...draft, ...JSON.parse(sessionStorage.getItem('hs_checkout_details') || '{}') }; } catch (_) {}
  function route(url, replace = false) {
    history[replace ? 'replaceState' : 'pushState']({}, '', url);
    document.body.dataset.page = url.startsWith('order-success') ? 'success' : 'payment';
    document.title = document.body.dataset.page === 'success' ? 'Order confirmation — HomeServer' : 'Checkout — HomeServer';
    selectedOrderId = new URLSearchParams(location.search).get('order');
    customerSignature = '';
    renderCustomer(); renderPresentation();
  }
  window.addEventListener('popstate', () => {
    if (!document.getElementById('customer')) return;
    document.body.dataset.page = location.pathname.endsWith('order-success.html') ? 'success' : 'payment';
    selectedOrderId = new URLSearchParams(location.search).get('order');
    customerSignature = ''; renderCustomer(); renderPresentation(); renderMessage();
  });
  function cartItems() {
    let cart; try { cart = JSON.parse(localStorage.getItem('hs_cart') || '{}'); } catch (_) { cart = {}; }
    return C.catalog.filter(p => Number.isInteger(cart[p.id]) && cart[p.id] > 0 && cart[p.id] <= 99).map(p => ({ ...p, qty:cart[p.id] }));
  }
  async function pay(items) {
    await act(async () => {
      let o = currentOrder();
      if (!o) {
        await dispatch({ action:'create', id:checkoutId, items:items.map(it => ({ id:it.id, qty:it.qty })) });
        route('payment.html?order=' + encodeURIComponent(checkoutId), true);
        o = currentOrder();
      }
      try { sessionStorage.setItem('hs_checkout_order_' + o.id, JSON.stringify(draft)); } catch (_) {}
      if (!o.authorized_at) await dispatch({ action:'authorize', order_id:o.id });
      await dispatch({ action:'capture', order_id:o.id });
      route('order-success.html?order=' + encodeURIComponent(o.id));
    });
  }
  const art = { rtx4090:'rtx-4090-24gb', teslap40:'tesla-p40-24gb', rpi5:'raspberry-pi-5-8gb', nvme4tb:'4tb-nvme-gen4-ssd', ddr5kit:'128gb-ddr5-ecc-kit', psu1600:'1600w-titanium-psu' };
  function summary(items, total, includeTotal = true) {
    return items.map(it => `<div class="product">${art[it.id] ? `<img src="thumbs/${art[it.id]}.webp" alt="">` : ''}<div><h3>${esc(it.name)}</h3><p class="small muted">Quantity ${it.qty}</p></div><span class="amount">${money(it.qty * it.price)}</span></div>`).join('') +
      '<div class="summary-line muted small"><span>Standard delivery</span><span>Included</span></div>' +
      (includeTotal ? `<div class="summary-line total"><span>Total</span><span>${money(total)}</span></div>` : '');
  }
  if (document.getElementById('customer')) {
    const field = (key,label,type='text',full=false) => `<label class="${full ? 'full' : ''}">${label}<input name="${key}" type="${type}" required autocomplete="off"></label>`;
    document.body.insertAdjacentHTML('beforeend', `<dialog id="customer-details" aria-labelledby="customer-details-title"><form id="customer-details-form"><div class="dialog-heading"><h2 id="customer-details-title">Contact &amp; delivery details</h2><button type="button" id="customer-details-close">Close</button></div><div class="edit-fields">${field('name','Full name')}${field('email','Email address','email')}${field('address','Street address','text',true)}${field('city','City')}${field('postal','Postal code')}${field('country','Country','text',true)}</div><button class="primary" type="submit">Save details</button></form></dialog>`);
    document.getElementById('customer-details-close').onclick = () => document.getElementById('customer-details').close();
    document.getElementById('customer-details-form').onsubmit = event => {
      event.preventDefault();
      const form = event.currentTarget;
      Object.keys(draft).forEach(key => draft[key] = form.elements.namedItem(key).value.trim());
      try { sessionStorage.setItem('hs_checkout_details', JSON.stringify(draft)); } catch (_) {}
      document.getElementById('customer-details').close(); customerSignature = ''; renderCustomer(); renderMessage();
    };
  }
  function openCustomerDetails() {
    const form = document.getElementById('customer-details-form');
    Object.keys(draft).forEach(key => form.elements.namedItem(key).value = draft[key]);
    document.getElementById('customer-details').showModal();
  }
  function renderCustomer() {
    const content = document.getElementById('customer');
    if (!content || !state) return;
    const page = document.body.dataset.page, o = currentOrder(), items = o ? o.items : cartItems();
    // Scheduled reads update evidence, never replace an actively edited form.
    const signature = JSON.stringify([page, mode, state.generation, o ? [o.id,o.state,o.invoice] : items]);
    if (customerSignature === signature) return;
    customerSignature = signature;
    if (!o && (new URLSearchParams(location.search).has('order') || page === 'success')) {
      content.innerHTML = '<div class="customer-scroll"><h1>Order unavailable</h1><p class="sub">We could not find this order. <a href="payment.html">Return to checkout</a>.</p></div>';
      return;
    }
    if (o && o.state !== 'created') {
      let details = draft;
      try { details = JSON.parse(sessionStorage.getItem('hs_checkout_order_' + o.id)) || draft; } catch (_) {}
      content.innerHTML = `<div class="customer-scroll"><p class="eyebrow">HomeServer / Order confirmation</p><h1>Thank you, ${esc(details.name.split(' ')[0])}.</h1><p class="sub">Your order has been placed.</p>
        <div class="notice"><h2>${o.state === 'fulfilled' ? 'Your order is confirmed' : 'Payment received'}</h2><p class="muted">${o.state === 'fulfilled' ? 'Your invoice is ready. We’ll prepare your parts for dispatch.' : 'We’re preparing your order. Your invoice will appear here when it’s ready.'}</p><p class="mono muted" title="${esc(o.id)}">Order #${esc(short(o.id))}</p></div>
        <section class="customer-section"><h2>Order summary</h2>${summary(o.items,o.total)}</section>
        <section class="customer-section"><h2>Delivering to</h2><p style="margin-top:12px">${esc(details.name)}</p><p class="muted">${esc(details.address)}<br>${esc(details.city)}, ${esc(details.postal)}<br>${esc(details.country)}</p><p class="small muted" style="margin-top:16px">Order updates: ${esc(details.email)}</p></section></div>
        <div class="customer-bottom confirmation-footer">${o.invoice ? `<a class="invoice" id="invoice-download" download="${esc(o.invoice)}.txt">Download invoice</a>` : '<span class="small muted">Your invoice will appear when ready.</span>'}<a href="index.html">Continue shopping →</a></div>`;
      const invoice = document.getElementById('invoice-download');
      if (invoice) invoice.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent('HOMESERVER · INVOICE\n' + o.invoice + '\nOrder: ' + o.id + '\n' + o.items.map(it => it.name + ' x ' + it.qty + ' @ ' + money(it.price)).join('\n') + '\nTotal: ' + money(o.total));
      return;
    }
    if (!items.length) {
      content.innerHTML = '<div class="customer-scroll"><p class="eyebrow">HomeServer / Checkout</p><h1>Your cart is empty</h1><p class="sub">Find the right parts for your next build.</p><a href="index.html">Browse server parts →</a></div>';
      return;
    }
    const total = o ? o.total : items.reduce((v,it) => v + it.qty * it.price,0);
    content.innerHTML = `<div class="customer-scroll"><p class="eyebrow">HomeServer / Checkout</p><h1>Complete your order</h1><p class="sub">The right parts for your next build.</p>
      <section class="customer-section"><div class="section-heading"><h2>Contact &amp; delivery</h2><button class="text-action" id="edit-customer-details">Edit details</button></div><div class="contact-delivery"><div class="saved-address"><p class="small muted">Contact</p><h3>${esc(draft.name)}</h3><p class="small muted">${esc(draft.email)}</p></div><div class="saved-address"><p class="small muted">Delivery address</p><h3>${esc(draft.address)}</h3><p class="small muted">${esc(draft.city)}, ${esc(draft.postal)} · ${esc(draft.country)}</p></div></div></section>
      <section class="customer-section"><div class="section-heading"><h2>Payment</h2></div><div class="payment-card"><div class="card-heading"><span class="visa">VISA</span><span>Credit card</span><span class="cardholder">${esc(draft.name)}</span></div><div class="card-fields"><label>Card number<input value="XXXX XXXX XXXX 4242" readonly></label><label>Expiry<input value="12/29" readonly></label><label>Security code<input value="•••" readonly></label></div></div></section>
      <section class="customer-section"><div class="section-heading"><h2>Order summary</h2><a href="index.html#cart">Edit cart</a></div>${summary(items,total,false)}</section></div>
      <div class="customer-bottom"><div class="summary-line total"><span>Total</span><span>${money(total)}</span></div><button class="primary customer-action" id="begin-payment" ${busy ? 'disabled' : ''}>${busy ? 'Processing payment…' : 'Pay ' + money(total)}</button></div>`;
    document.getElementById('edit-customer-details').onclick = openCustomerDetails;
    document.getElementById('begin-payment').onclick = () => {
      const button = document.getElementById('begin-payment'); button.textContent = 'Processing payment…';
      pay(items).finally(() => { if (button.isConnected) button.textContent = 'Pay ' + money(total); });
    };
  }
  async function boot() {
    renderControls();
    await probe();
    try { await refresh(); } catch (e) { error = e.message; }
    renderControls(); renderData(); renderCustomer(); renderMessage();
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
