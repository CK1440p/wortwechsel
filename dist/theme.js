// Apply before CSS loads to avoid a light flash on refresh.
(() => {
  let theme = 'dark';
  try { const saved = localStorage.getItem('wortwechsel.theme'); if (saved === 'light' || saved === 'dark') theme = saved; } catch {}
  document.documentElement.dataset.theme = theme;
})();
