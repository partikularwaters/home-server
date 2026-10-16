/* Apply the saved theme before paint; keep navigation identical on every page. */
(function () {
  function savedTheme() { try { return localStorage.getItem('hs_theme') === 'light' ? 'light' : 'dark'; } catch (_) { return 'dark'; } }
  function apply(theme) {
    document.documentElement.dataset.theme = theme;
    document.querySelectorAll('.theme-toggle').forEach(button => {
      button.innerHTML = theme === 'dark'
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.5 13A8.5 8.5 0 0 1 11 3.5 8.5 8.5 0 1 0 20.5 13Z"/></svg>';
      const label = 'Switch to ' + (theme === 'dark' ? 'light' : 'dark') + ' mode';
      button.setAttribute('aria-label', label); button.title = label;
    });
  }
  apply(savedTheme());
  document.addEventListener('DOMContentLoaded', () => {
    apply(savedTheme());
    document.querySelectorAll('.theme-toggle').forEach(button => button.onclick = () => {
      const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem('hs_theme', theme); } catch (_) {}
      apply(theme);
    });
    const page = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('header.top nav a').forEach(link => {
      if (link.getAttribute('href') === (['payment.html', 'order-success.html'].includes(page) ? 'index.html' : page)) link.setAttribute('aria-current', 'page');
    });
  });
  window.addEventListener('storage', event => { if (event.key === 'hs_theme') apply(savedTheme()); });
})();
