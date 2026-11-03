const { test } = require('node:test');
const assert = require('node:assert/strict');
const C = require('../dist/core.js');
const { createSync } = require('../dist/sync.js');

function server(row = null) {
  const db = { row, conflictOnce: false };
  const client = {
    from: () => {
      let op = 'select', payload, version;
      const q = {
        select() { return q; }, eq(col, value) { if (col === 'version') version = value; return q; },
        insert(p) { op = 'insert'; payload = p; return q; }, update(p) { op = 'update'; payload = p; return q; },
        async maybeSingle() { return { data: db.row ? { ...db.row } : null, error: null }; },
        async single() { db.row = { data: payload.data, version: 1 }; return { data: { version: 1 }, error: null }; },
        then(resolve) {
          if (db.conflictOnce) { db.conflictOnce = false; db.row.version++; }
          if (op === 'update' && db.row?.version === version) { db.row = { data: JSON.parse(JSON.stringify(payload.data)), version: version + 1 }; return resolve({ data: [{ version: db.row.version }], error: null }); }
          resolve({ data: [], error: null });
        },
      };
      return q;
    },
  };
  return { db, client };
}
function device(state, client, canApply = () => true) {
  const app = { state, applied: 0, snapshot: () => app.state, canApply, apply(next) { app.state = next; app.applied++; } };
  const map = new Map(), statuses = [];
  const storage = { getItem: k => map.get(k) ?? null, setItem: (k, v) => map.set(k, v), removeItem: k => map.delete(k) };
  const sync = createSync({ client, app, merge: C.mergeStates, storage, onStatus: s => statuses.push(s), setTimer: () => 1, clearTimer: () => {} });
  return { app, sync, statuses };
}
const USER = { id: 'u1', email: 'a@example.com' };
const term = (front, back, written) => ({ id: front, front, back, ...(written ? { progress: { forward: { mc: 1, written, wrong: 0 }, reverse: { mc: 0, written: 0, wrong: 0 } } } : {}) });
const state = (terms, extra = {}) => ({ sets: [{ id: 's', title: 'Set', terms }], settings: {}, history: {}, dialogs: [], ...extra });

test('first login uploads the device state', async () => {
  const { db, client } = server();
  const a = device(state([term('hola', 'hallo', 2)]), client);
  await a.sync.start(USER);
  assert.equal(db.row.version, 1); assert.equal(db.row.data.sets[0].terms[0].progress.forward.written, 2);
  assert.equal(a.statuses.at(-1), 'synced');
});
test('a second device merges on first login and neither side loses progress', async () => {
  const { db, client } = server({ data: state([term('hola', 'hallo', 2), term('adiós', 'tschüss')], { history: { d1: 5 } }), version: 4 });
  const b = device(state([term('hola', 'hallo', 1), term('gracias', 'danke', 1)], { history: { d1: 2, d2: 1 } }), client);
  await b.sync.start(USER);
  assert.equal(db.row.version, 5);
  const terms = db.row.data.sets[0].terms;
  assert.deepEqual(terms.map(t => t.front), ['hola', 'adiós', 'gracias']);
  assert.equal(terms[0].progress.forward.written, 2);
  assert.deepEqual(db.row.data.history, { d1: 5, d2: 1 });
  assert.equal(b.app.applied, 1);
});
test('an unchanged device takes remote data, including deletions', async () => {
  const { db, client } = server();
  const a = device(state([term('hola', 'hallo'), term('adiós', 'tschüss')]), client);
  await a.sync.start(USER);
  db.row = { data: state([term('hola', 'hallo')]), version: 2 };
  await a.sync.run();
  assert.equal(a.app.state.sets[0].terms.length, 1);
});
test('local changes are pushed, and a save from another device in between is merged', async () => {
  const { db, client } = server();
  const a = device(state([term('hola', 'hallo')]), client);
  await a.sync.start(USER);
  a.app.state = state([term('hola', 'hallo', 2)]); a.sync.changed();
  await a.sync.run();
  assert.equal(db.row.version, 2); assert.equal(db.row.data.sets[0].terms[0].progress.forward.written, 2);
  a.app.state = state([term('hola', 'hallo', 2), term('sí', 'ja')]); a.sync.changed();
  db.row = { data: state([term('hola', 'hallo', 2), term('no', 'nein')]), version: 3 };
  await a.sync.run();
  assert.deepEqual(db.row.data.sets[0].terms.map(t => t.front), ['hola', 'no', 'sí']);
});
test('a losing update retries instead of overwriting the other device', async () => {
  const { db, client } = server();
  const a = device(state([term('hola', 'hallo')]), client);
  await a.sync.start(USER);
  a.sync.changed(); db.conflictOnce = true;
  await a.sync.run();
  assert.equal(a.statuses.at(-1), 'synced'); assert.ok(db.row.version >= 3);
});
test('remote data waits while a round is running', async () => {
  const { db, client } = server();
  let busy = false;
  const a = device(state([term('hola', 'hallo')]), client, () => !busy);
  await a.sync.start(USER);
  db.row = { data: state([term('no', 'nein')]), version: 9 };
  busy = true; await a.sync.run();
  assert.equal(a.statuses.at(-1), 'waiting'); assert.equal(a.app.state.sets[0].terms[0].front, 'hola');
  busy = false; await a.sync.run();
  assert.equal(a.app.state.sets[0].terms[0].front, 'no');
});
test('network errors report offline and keep the local state', async () => {
  const a = device(state([term('hola', 'hallo')]), { from: () => { throw new Error('offline'); } });
  await a.sync.start(USER);
  assert.equal(a.statuses.at(-1), 'offline'); assert.equal(a.app.state.sets[0].terms.length, 1);
});
