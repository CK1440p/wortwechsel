// Every <select> on the site gets a custom dropdown in the Buchungstrainer look.
// The native popup ignores the dark theme (light text on a white list). The real <select> stays in the DOM,
// invisible: forms, `.value`, `change` listeners and `disabled` keep working; this only adds the button and the list.
// Opt out with <select data-native>.
(() => {
  if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return;
  const proto = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const CHEV = '<svg class="xs-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
  const CHECK = '<svg class="xs-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10"/></svg>';
  let open = null, seq = 0;

  function sync(sel) {
    const x = sel._xs; if (!x) return;
    const opt = sel.options[sel.selectedIndex], empty = !opt || opt.value === '';
    x.label.textContent = opt ? opt.textContent : '';
    x.btn.classList.toggle('placeholder', empty);
    x.btn.disabled = sel.disabled;
    x.wrap.classList.remove('ok', 'bad');
    for (const c of ['ok', 'bad']) if (sel.classList.contains(c)) x.wrap.classList.add(c);
  }
  function enhance(sel) {
    if (sel._xs || sel.hasAttribute('data-native') || sel.multiple) return;
    const id = `xs-${++seq}`, wrap = document.createElement('span'), btn = document.createElement('button'), label = document.createElement('span');
    wrap.className = 'xs'; btn.type = 'button'; btn.className = 'xs-btn'; label.className = 'xs-label';
    btn.setAttribute('aria-haspopup', 'listbox'); btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-controls', id);
    const name = sel.getAttribute('aria-label') || (sel.id && document.querySelector(`label[for="${sel.id}"]`)?.textContent.trim()) || sel.closest('label')?.firstChild?.textContent?.trim() || '';
    if (name) btn.setAttribute('aria-label', name);
    btn.append(label); btn.insertAdjacentHTML('beforeend', CHEV); wrap.append(btn);
    sel.after(wrap); sel.classList.add('xs-native'); sel.tabIndex = -1; sel.setAttribute('aria-hidden', 'true');
    // A label pointing at the select now focuses the button.
    if (sel.id) document.querySelectorAll(`label[for="${sel.id}"]`).forEach(l => l.addEventListener('click', e => { e.preventDefault(); btn.focus(); }));
    sel._xs = { wrap, btn, label, id };
    // Code that sets sel.value (e.g. showing the solution) must update the button too.
    if (proto?.set) Object.defineProperty(sel, 'value', { configurable: true, get() { return proto.get.call(this); }, set(v) { proto.set.call(this, v); sync(this); } });
    new MutationObserver(() => sync(sel)).observe(sel, { attributes: true, attributeFilter: ['class', 'disabled'], childList: true, subtree: true });
    sel.addEventListener('change', () => sync(sel));
    btn.addEventListener('click', () => (open?.sel === sel ? close() : show(sel)));
    btn.addEventListener('keydown', e => {
      if (open?.sel !== sel) { if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); e.stopPropagation(); show(sel); } return; }
      key(e);
    });
    sync(sel);
  }

  function show(sel) {
    close();
    const x = sel._xs, host = sel.closest('dialog') || document.body, list = document.createElement('ul');
    list.className = 'xs-dd'; list.id = x.id; list.setAttribute('role', 'listbox');
    const opts = [...sel.options].filter(o => !o.hidden);
    list.innerHTML = opts.map((o, i) => `<li role="option" data-i="${i}" aria-selected="${o.selected}" class="${o.selected ? 'active' : ''}${o.value === '' ? ' placeholder' : ''}${o.disabled ? ' disabled' : ''}">${CHECK}<span>${esc(o.textContent)}</span></li>`).join('');
    host.append(list);
    open = { sel, list, opts };
    if (!list.querySelector('.active')) list.firstElementChild?.classList.add('active');
    place();
    x.btn.setAttribute('aria-expanded', 'true'); x.wrap.classList.add('open');
    list.addEventListener('pointerdown', e => { const li = e.target.closest('li'); if (!li) return; e.preventDefault(); choose(Number(li.dataset.i)); });
    list.querySelector('.active')?.scrollIntoView?.({ block: 'nearest' });
  }
  function place() {
    if (!open) return;
    const r = open.sel._xs.btn.getBoundingClientRect(), list = open.list, vh = window.innerHeight, below = vh - r.bottom - 12, above = r.top - 12;
    const up = below < 180 && above > below, max = Math.max(120, Math.min(320, up ? above : below));
    list.style.minWidth = `${r.width}px`; list.style.maxWidth = `${Math.min(440, window.innerWidth - 16)}px`; list.style.maxHeight = `${max}px`;
    list.style.left = `${Math.max(8, Math.min(r.left, window.innerWidth - list.offsetWidth - 8))}px`;
    list.style.top = up ? '' : `${r.bottom + 6}px`; list.style.bottom = up ? `${vh - r.top + 6}px` : '';
    list.classList.toggle('up', up);
  }
  function close(focus = false) {
    if (!open) return;
    const x = open.sel._xs; open.list.remove(); x.btn.setAttribute('aria-expanded', 'false'); x.wrap.classList.remove('open');
    if (focus) x.btn.focus();
    open = null;
  }
  function choose(i) {
    const { sel, opts } = open, o = opts[i];
    if (!o || o.disabled) return;
    const changed = sel.selectedIndex !== o.index;
    sel.selectedIndex = o.index; sync(sel); close(true);
    if (changed) { sel.dispatchEvent(new Event('input', { bubbles: true })); sel.dispatchEvent(new Event('change', { bubbles: true })); }
  }
  function key(e) {
    const items = [...open.list.children], i = items.findIndex(li => li.classList.contains('active'));
    const go = j => { j = Math.max(0, Math.min(items.length - 1, j)); items.forEach((li, n) => li.classList.toggle('active', n === j)); items[j]?.scrollIntoView?.({ block: 'nearest' }); };
    const stop = () => { e.preventDefault(); e.stopPropagation(); };
    if (e.key === 'ArrowDown') { stop(); go(i + 1); }
    else if (e.key === 'ArrowUp') { stop(); go(i - 1); }
    else if (e.key === 'Home') { stop(); go(0); }
    else if (e.key === 'End') { stop(); go(items.length - 1); }
    else if (e.key === 'Enter' || e.key === ' ') { stop(); choose(Math.max(0, i)); }
    else if (e.key === 'Escape') { stop(); close(true); }
    else if (e.key === 'Tab') close();
    else if (e.key.length === 1) { const k = e.key.toLowerCase(), j = items.findIndex((li, n) => n > i && li.textContent.trim().toLowerCase().startsWith(k)); const f = j >= 0 ? j : items.findIndex(li => li.textContent.trim().toLowerCase().startsWith(k)); if (f >= 0) { stop(); go(f); } }
  }

  document.addEventListener('pointerdown', e => { if (open && !open.list.contains(e.target) && !open.sel._xs.wrap.contains(e.target)) close(); }, true);
  window.addEventListener('resize', () => close());
  document.addEventListener('scroll', e => { if (open && !open.list.contains(e.target)) close(); }, true);
  const scan = root => { if (root.tagName === 'SELECT') enhance(root); root.querySelectorAll?.('select').forEach(enhance); };
  new MutationObserver(ms => { for (const m of ms) m.addedNodes.forEach(n => { if (n.nodeType === 1) scan(n); }); if (open && !open.sel.isConnected) { open.list.remove(); open = null; } }).observe(document.body, { childList: true, subtree: true });
  scan(document.body);
})();
