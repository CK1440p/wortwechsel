// Account login and sync across devices. The app keeps working from Local Storage; this file mirrors that state to Supabase.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.WWSyncCore = api; api.boot(root); }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  // The publishable key is public by design. Row level security on user_data protects the data.
  const SUPABASE_URL = 'https://wnijrsxqenttxbflebuy.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_1EQNtidqG4sVj6Z_VlXeBQ_IOJaoVIO';
  const SITE_URL = 'https://ck1440p.github.io/wortwechsel/';
  const META_KEY = 'wortwechsel.sync', TABLE = 'user_data', RETRY_MS = 30000, MAX_ATTEMPTS = 3;

  function createSync({ client, app, merge, storage, onStatus = () => {}, delay = 1500, setTimer = setTimeout, clearTimer = clearTimeout }) {
    let user = null, timer = null, running = null, rerun = false, changes = 0;
    let meta = {};
    try { meta = JSON.parse(storage.getItem(META_KEY) || '{}') || {}; } catch { meta = {}; }
    const writeMeta = () => { try { storage.setItem(META_KEY, JSON.stringify(meta)); } catch { /* The next successful save writes it again. */ } };
    const schedule = ms => { clearTimer(timer); timer = setTimer(() => { timer = null; run(); }, ms); };
    async function push(base) {
      const sent = changes;
      const { data: rows, error } = await client.from(TABLE).update({ data: app.snapshot() }).eq('user_id', user.id).eq('version', base).select('version');
      if (error) throw error;
      // No row updated: another device saved in between.
      if (!rows.length) return false;
      meta = { userId: user.id, version: rows[0].version, dirty: changes !== sent };
      writeMeta();
      if (meta.dirty) schedule(delay);
      return true;
    }
    async function reconcile() {
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const { data: row, error } = await client.from(TABLE).select('data,version').eq('user_id', user.id).maybeSingle();
        if (error) throw error;
        const known = meta.userId === user.id;
        if (!row) {
          const sent = changes;
          const { data: created, error: insertError } = await client.from(TABLE).insert({ user_id: user.id, data: app.snapshot() }).select('version').single();
          if (insertError?.code === '23505') continue;
          if (insertError) throw insertError;
          meta = { userId: user.id, version: created.version, dirty: changes !== sent };
          writeMeta();
          return 'synced';
        }
        if (known && !meta.dirty && meta.version === row.version) return 'synced';
        if (known && meta.dirty && meta.version === row.version) { if (await push(row.version)) return 'synced'; continue; }
        // Remote data has to enter this device. Never swap data under a running round.
        if (!app.canApply()) return 'waiting';
        if (known && !meta.dirty) {
          app.apply(row.data);
          meta = { userId: user.id, version: row.version, dirty: false };
          writeMeta();
          return 'synced';
        }
        app.apply(merge(row.data, app.snapshot()));
        if (await push(row.version)) return 'synced';
      }
      return 'error';
    }
    function run() {
      if (!user) return Promise.resolve();
      if (running) { rerun = true; return running; }
      running = (async () => {
        do {
          rerun = false;
          onStatus('syncing');
          try {
            const result = await reconcile();
            onStatus(result);
            if (result !== 'synced') schedule(RETRY_MS);
          } catch {
            onStatus('offline');
            schedule(RETRY_MS);
          }
        } while (rerun && user);
      })().finally(() => { running = null; });
      return running;
    }
    return {
      run,
      start(nextUser) { user = nextUser; return run(); },
      stop() { user = null; clearTimer(timer); timer = null; meta = {}; try { storage.removeItem(META_KEY); } catch { /* Nothing left to clear. */ } onStatus('signedOut'); },
      changed() { changes++; meta.dirty = true; writeMeta(); if (user) schedule(delay); },
      flush() { if (user && meta.dirty) { clearTimer(timer); timer = null; return run(); } return Promise.resolve(); },
    };
  }

  const STATUS_TEXT = { syncing: 'Wird synchronisiert …', synced: 'Synchronisiert', waiting: 'Wird nach der Übung synchronisiert', offline: 'Offline, wird später gesendet', error: 'Synchronisieren hat nicht geklappt, neuer Versuch folgt', signedOut: '' };
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function loginError(error) {
    if (error?.status === 429 || /rate limit/i.test(error?.message || '')) return 'Gerade wurden zu viele E-Mails verschickt. Warte etwa eine Stunde und versuche es dann noch einmal.';
    if (/signups? not allowed|not allowed for otp/i.test(error?.message || '')) return 'Für diese E-Mail-Adresse gibt es kein Konto.';
    return 'Die E-Mail konnte nicht gesendet werden. Prüfe deine Internetverbindung und die Adresse.';
  }

  function boot(window) {
    const { document, supabase, WWApp, WWCore, localStorage } = window;
    const button = document.querySelector('#account-btn');
    if (!button || !supabase?.createClient || !WWApp || !WWCore) return;
    const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { flowType: 'implicit', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true } });
    const dialog = document.querySelector('#settings-dialog'), label = button.querySelector('span');
    let email = '', state = 'signedOut', panelOpen = false;
    const close = '<button class="icon-button" data-close="settings-dialog" aria-label="Schließen"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button>';
    const sync = createSync({ client, app: WWApp, merge: WWCore.mergeStates, storage: localStorage, onStatus(next) { state = next; render(); } });
    window.WWSync = sync;
    function render() {
      button.hidden = false;
      button.classList.toggle('is-signed-in', !!email);
      button.dataset.state = email ? state : '';
      label.textContent = email ? 'Konto' : 'Anmelden';
      button.title = email ? STATUS_TEXT[state] || email : 'Anmelden und auf anderen Geräten weitermachen';
      if (panelOpen && dialog.open && email) drawAccount();
    }
    function drawAccount() {
      dialog.innerHTML = `<div class="dialog-header"><div><h2 id="settings-heading">Dein Konto</h2></div>${close}</div><p class="account-email">${esc(email)}</p><p class="account-status" role="status">${esc(STATUS_TEXT[state] || '')}</p><p class="form-help">Melde dich auf dem anderen Gerät mit derselben Adresse an, dann geht es dort weiter.</p><div class="dialog-footer"><button class="button secondary" id="account-sync" type="button">Jetzt synchronisieren</button><button class="button ghost" id="account-out" type="button">Abmelden</button></div>`;
      dialog.querySelector('#account-sync').addEventListener('click', () => sync.run());
      dialog.querySelector('#account-out').addEventListener('click', async () => {
        await sync.flush();
        await client.auth.signOut({ scope: 'local' });
        dialog.close(); WWApp.toast('Abgemeldet. Deine Daten bleiben auf diesem Gerät.');
      });
    }
    function drawLogin(message = '') {
      dialog.innerHTML = `<div class="dialog-header"><div><h2 id="settings-heading">Anmelden</h2></div>${close}</div><p class="form-help">Mit einem Konto machst du auf jedem Gerät da weiter, wo du aufgehört hast. Du bekommst einen Anmelde-Link per E-Mail und brauchst kein Passwort.</p><form id="account-form"><div class="form-grid"><label class="full">Deine E-Mail-Adresse<input id="account-email" type="email" autocomplete="email" required></label></div><div id="account-error" class="form-error" role="alert" ${message ? '' : 'hidden'}>${esc(message)}</div><div class="dialog-footer"><span class="import-privacy">Deine bisherigen Daten werden übernommen.</span><button class="button primary" id="account-send" type="submit">Link senden</button></div></form>`;
      dialog.querySelector('#account-form').addEventListener('submit', async event => {
        event.preventDefault();
        const address = dialog.querySelector('#account-email').value.trim(), send = dialog.querySelector('#account-send');
        send.disabled = true;
        const redirect = /^https:/.test(window.location.protocol) ? window.location.origin + window.location.pathname : SITE_URL;
        const { error } = await client.auth.signInWithOtp({ email: address, options: { emailRedirectTo: redirect } });
        if (error) return drawLogin(loginError(error));
        dialog.innerHTML = `<div class="dialog-header"><div><h2 id="settings-heading">Schau in dein Postfach</h2></div>${close}</div><p class="form-help">Wir haben einen Link an <strong>${esc(address)}</strong> geschickt. Öffne die E-Mail auf diesem Gerät und tippe auf den Link. Schau auch im Spam-Ordner nach.</p>`;
      });
    }
    button.addEventListener('click', () => {
      panelOpen = true;
      if (email) drawAccount(); else drawLogin();
      dialog.showModal();
    });
    // Supabase warns against calling its client inside this callback, so the work moves to the next task.
    client.auth.onAuthStateChange((event, session) => {
      window.setTimeout(() => {
        const next = session?.user || null;
        if (next && next.email !== email) {
          email = next.email || 'Konto'; render(); sync.start(next);
          if (event === 'SIGNED_IN' && window.location.hash === '') WWApp.toast('Angemeldet. Dein Fortschritt wird synchronisiert.');
        } else if (!next && email) { email = ''; sync.stop(); render(); }
      }, 0);
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden) sync.flush(); else sync.run(); });
    window.addEventListener('online', () => sync.run());
    render();
  }
  return { createSync, boot };
});
