(() => {
  const root = document.documentElement;
  const toggle = document.querySelector('#theme-toggle');
  const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const sync = () => {
    const dark = root.dataset.theme === 'dark';
    toggle.setAttribute('aria-pressed', String(dark));
    toggle.setAttribute('aria-label', dark ? 'Hellen Modus aktivieren' : 'Dunklen Modus aktivieren');
    toggle.title = dark ? 'Heller Modus' : 'Dunkler Modus';
    document.querySelector('meta[name="theme-color"]').content = dark ? '#0b0d16' : '#f7f8fc';
  };
  sync();
  toggle.addEventListener('click', () => {
    root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('wortwechsel.theme', root.dataset.theme); } catch {}
    sync();
    if (!reduced()) toggle.animate?.([{transform:'rotate(-70deg) scale(.65)'},{transform:'rotate(0) scale(1)'}], {duration:420,easing:'cubic-bezier(.16,1,.3,1)'});
  });
  window.addEventListener('storage', e => {
    if (e.key === 'wortwechsel.theme' && ['light','dark'].includes(e.newValue)) { root.dataset.theme = e.newValue; sync(); }
  });
  // Pointer-driven tilt is limited to fine pointers; touch scrolling stays native.
  let frame = 0;
  document.addEventListener('pointermove', e => {
    if (reduced() || e.pointerType !== 'mouse') return;
    const card = e.target.closest('.set-card, .focus-card');
    if (!card || frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0; if (!card.isConnected) return;
      const box = card.getBoundingClientRect();
      const x = (e.clientX-box.left)/box.width, y = (e.clientY-box.top)/box.height;
      card.style.setProperty('--rx', `${(0.5-y)*5}deg`);
      card.style.setProperty('--ry', `${(x-0.5)*7}deg`);
      card.style.setProperty('--mx', `${x*100}%`);
      card.style.setProperty('--my', `${y*100}%`);
    });
  });
  document.addEventListener('pointerout', e => {
    const card = e.target.closest('.set-card, .focus-card');
    if (card && !card.contains(e.relatedTarget)) { card.style.setProperty('--rx','0deg'); card.style.setProperty('--ry','0deg'); }
  });
  document.addEventListener('click', e => {
    if (reduced()) return;
    const button = e.target.closest('.button, .choice-button, .round-button, .new-set-card');
    if (!button || button.disabled || !button.animate) return;
    button.animate([{scale:'.96'}, {scale:'1'}], {duration:300,easing:'cubic-bezier(.2,1.7,.4,1)'});
  });
  function celebrate() {
    if (reduced()) return;
    const layer = document.createElement('div'); layer.className = 'confetti'; layer.setAttribute('aria-hidden','true');
    for(let i=0;i<32;i++) {
      const bit=document.createElement('i');
      bit.style.setProperty('--x', `${(Math.random()-.5)*Math.min(window.innerWidth,900)}px`);
      bit.style.setProperty('--y', `${-120-Math.random()*320}px`);
      bit.style.setProperty('--spin', `${Math.random()*720-360}deg`);
      bit.style.setProperty('--delay', `${Math.random()*180}ms`);
      bit.style.background=['#9d8bff','#6be9d3','#ffd391','#83adff'][i%4];
      layer.append(bit);
    }
    document.body.append(layer); setTimeout(()=>layer.remove(),1800);
  }
  if (typeof MutationObserver !== 'undefined') {
    new MutationObserver(records => {
      if (records.some(r=>Array.from(r.addedNodes).some(n=>n.nodeType===1 && (n.matches?.('.result-page') || n.querySelector?.('.result-page'))))) celebrate();
    }).observe(document.querySelector('#main'),{childList:true});
  }
})();
