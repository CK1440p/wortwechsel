// Phone helpers: browser chrome follows the theme, and the tab bar steps aside while the keyboard is open.
(() => {
  const root = document.documentElement;
  const meta = document.querySelector('#theme-color');
  const paint = () => meta?.setAttribute('content', root.dataset.theme === 'light' ? '#f7f8fc' : '#0b0d16');
  paint();
  new MutationObserver(paint).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

  const vv = window.visualViewport;
  const typing = () => { const el = document.activeElement; return !!el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && !['checkbox', 'radio', 'range', 'button', 'submit', 'file'].includes(el.type)) || el.isContentEditable); };
  const check = () => document.body.classList.toggle('keyboard-open', typing() && !!vv && vv.height < window.innerHeight * 0.8);
  document.addEventListener('focusin', check);
  document.addEventListener('focusout', () => setTimeout(check, 60));
  vv?.addEventListener('resize', check);

})();
