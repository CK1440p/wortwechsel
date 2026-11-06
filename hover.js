// Hover layer: cursor spotlight, magnetic buttons, a sliding nav highlight and 3D tilt.
// Only for a real mouse; touch and reduced motion keep the plain states.
(() => {
  const fine = window.matchMedia?.('(hover: hover) and (pointer: fine)');
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const active = () => fine?.matches && !reduced?.matches;
  const SPOT = '.button,.icon-button,.round-button,.account-button,.qa-filter-chip,.accent-keys button,.qa-stepper button,.set-card,.new-set-card,.dialog-card,.choice-button,.dlg-stage,.qa-item,.qa-test-option,.qa-rate-btn,.qa-test-item,.flashcard,.upload-zone,.progress-card,.term-row,.subject-tab,.radio-card';
  const MAGNET = '.button,.icon-button,.round-button,.account-button,.qa-filter-chip,.qa-stepper button,.accent-keys button';
  const TILT = '.dialog-card,.qa-test-option,.qa-rate-btn';
  let magnet = null, tilt = null, frame = 0, last = null;

  function release(el, kind) {
    if (!el) return;
    el.classList.remove(kind === 'magnet' ? 'is-magnet' : 'is-tilt');
    if (kind === 'magnet') { el.style.setProperty('--mgx', '0px'); el.style.setProperty('--mgy', '0px'); }
    else { el.style.setProperty('--trx', '0deg'); el.style.setProperty('--try', '0deg'); }
  }
  function update() {
    frame = 0;
    const e = last; if (!e || !active()) return;
    const target = e.target instanceof Element ? e.target : null;
    // Every matching ancestor gets the cursor position, so a card keeps glowing while the pointer is on its button.
    for (let el = target?.closest(SPOT); el; el = el.parentElement?.closest(SPOT)) {
      const box = el.getBoundingClientRect();
      el.style.setProperty('--hx', `${e.clientX - box.left}px`);
      el.style.setProperty('--hy', `${e.clientY - box.top}px`);
    }
    const m = target?.closest(MAGNET);
    if (m !== magnet) { release(magnet, 'magnet'); magnet = m && !m.disabled ? m : null; }
    if (magnet) {
      const box = magnet.getBoundingClientRect();
      const dx = (e.clientX - box.left) / box.width - 0.5, dy = (e.clientY - box.top) / box.height - 0.5;
      const pull = Math.min(10, box.width * 0.09);
      magnet.classList.add('is-magnet');
      magnet.style.setProperty('--mgx', `${(dx * pull).toFixed(2)}px`);
      magnet.style.setProperty('--mgy', `${(dy * pull * 0.8).toFixed(2)}px`);
    }
    const t = target?.closest(TILT);
    if (t !== tilt) { release(tilt, 'tilt'); tilt = t; }
    if (tilt) {
      const box = tilt.getBoundingClientRect();
      const x = (e.clientX - box.left) / box.width - 0.5, y = (e.clientY - box.top) / box.height - 0.5;
      const k = box.width > 400 ? 2.5 : 6;
      tilt.classList.add('is-tilt');
      tilt.style.setProperty('--trx', `${(-y * k).toFixed(2)}deg`);
      tilt.style.setProperty('--try', `${(x * k).toFixed(2)}deg`);
    }
  }
  document.addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') return; last = e; if (!frame) frame = requestAnimationFrame(update); }, { passive: true });
  document.addEventListener('pointerleave', () => { release(magnet, 'magnet'); release(tilt, 'tilt'); magnet = tilt = null; });
  window.addEventListener('blur', () => { release(magnet, 'magnet'); release(tilt, 'tilt'); magnet = tilt = null; });
  // Content is redrawn with innerHTML; a stale reference must not keep a removed button "pulled".
  document.addEventListener('click', () => { if (magnet && !magnet.isConnected) magnet = null; if (tilt && !tilt.isConnected) tilt = null; }, true);

  // One highlight that glides between navigation items instead of each item lighting up on its own.
  const nav = document.querySelector('.sidebar nav');
  if (!nav) return;
  const pill = document.createElement('span'); pill.className = 'nav-pill'; pill.setAttribute('aria-hidden', 'true'); nav.prepend(pill);
  let shown = false;
  const place = item => {
    const n = nav.getBoundingClientRect(), b = item.getBoundingClientRect();
    if (!shown) pill.style.transition = 'none';
    pill.style.transform = `translate(${b.left - n.left}px, ${b.top - n.top}px)`;
    pill.style.width = `${b.width}px`; pill.style.height = `${b.height}px`;
    if (!shown) { void pill.offsetWidth; pill.style.transition = ''; }
    pill.classList.add('visible'); shown = true;
  };
  nav.addEventListener('pointerover', e => { if (!active()) return; const item = e.target.closest('.nav-item'); if (item && !item.closest('[hidden]')) place(item); });
  nav.addEventListener('pointerleave', () => { pill.classList.remove('visible'); shown = false; });
})();
