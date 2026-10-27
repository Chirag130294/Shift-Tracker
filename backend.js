// Talks to Firebase (sign-in and saving). app.js only uses the small interface returned here.
//   be.onAuth(cb)                       cb(user | null)       user = { uid, email, name }
//   be.signUp / be.signIn               (email, password)
//   be.google()                         Google pop-up sign-in
//   be.reset(email) / be.signOut()
//   be.getDoc(path)                     -> data | null            path looks like 'users/abc/days/2026-10-01'
//   be.setDoc(path, data, merge)        be.delDoc(path)
//   be.watchDoc(path, cb, onErr)        cb(data | null)           returns a function that stops watching
//   be.watchCol(path, cb, onErr, opts)  cb({ id: data })          opts = { orderBy, desc, limit }
//   be.watchWhere(col, field, value, cb, onErr, op)   op is '==' (default) or 'array-contains'
//   be.batch([{ op:'set'|'del', path, data, merge }])
//   be.wipe(uid) / be.deleteAccount()
//   plus the older helpers watchProfile, saveProfile, watchDays, setDay, delDay, setDays
import { firebaseConfig } from './firebase-config.js';

const V = '10.14.1';
const CDN = `https://www.gstatic.com/firebasejs/${V}`;

export const isConfigured = () => !String(firebaseConfig.apiKey).startsWith('PASTE');

export async function createBackend(demo) {
  if (demo) return memoryBackend(demo);
  if (!isConfigured()) return null;
  return firebaseBackend();
}

// helpers shared by both backends
const profilePath = uid => `users/${uid}`;
const dayPath = (uid, d) => `users/${uid}/days/${d}`;
function addCompat(be) {
  be.watchProfile = (uid, cb, onErr) => (be.watchProfileImpl ? be.watchProfileImpl(uid, cb, onErr) : be.watchDoc(profilePath(uid), cb, onErr));
  be.saveProfile = (uid, patch) => be.setDoc(profilePath(uid), { ...patch, updatedAt: Date.now() }, true);
  be.watchDays = (uid, cb, onErr) => be.watchCol(`users/${uid}/days`, cb, onErr);
  be.setDay = (uid, d, obj) => be.setDoc(dayPath(uid, d), obj, false);
  be.delDay = (uid, d) => be.delDoc(dayPath(uid, d));
  be.setDays = (uid, entries) => be.batch(Object.entries(entries).map(([d, obj]) => (obj ? { op: 'set', path: dayPath(uid, d), data: obj } : { op: 'del', path: dayPath(uid, d) })));
  return be;
}
const SUBS = ['days', 'notifications', 'viewers', 'following'];

async function firebaseBackend() {
  const [appM, authM, fsM] = await Promise.all([
    import(`${CDN}/firebase-app.js`),
    import(`${CDN}/firebase-auth.js`),
    import(`${CDN}/firebase-firestore.js`)
  ]);
  const app = appM.initializeApp(firebaseConfig);
  const auth = authM.getAuth(app);
  let db;
  try {
    // Keeps your data on the phone so the app opens and edits offline, and syncs later.
    db = fsM.initializeFirestore(app, {
      localCache: fsM.persistentLocalCache({ tabManager: fsM.persistentMultipleTabManager() })
    });
  } catch (e) {
    console.warn('Offline cache not available, using memory cache', e);
    db = fsM.getFirestore(app);
  }
  const { doc, setDoc, deleteDoc, getDoc, onSnapshot, collection, getDocs, writeBatch, query, where, orderBy, limit } = fsM;
  const ref = path => doc(db, ...path.split('/'));
  const col = path => collection(db, ...path.split('/'));
  const toUser = u => (u ? { uid: u.uid, email: u.email || '', name: u.displayName || '' } : null);
  const mapSnap = snap => { const m = {}; snap.forEach(d => { m[d.id] = d.data(); }); return m; };

  const be = {
    kind: 'firebase',
    onAuth: cb => authM.onAuthStateChanged(auth, u => cb(toUser(u))),
    signUp: (e, p) => authM.createUserWithEmailAndPassword(auth, e, p),
    signIn: (e, p) => authM.signInWithEmailAndPassword(auth, e, p),
    google: () => authM.signInWithPopup(auth, new authM.GoogleAuthProvider()),
    reset: e => authM.sendPasswordResetEmail(auth, e),
    signOut: () => authM.signOut(auth),

    async getDoc(path) { const s = await getDoc(ref(path)); return s.exists() ? s.data() : null; },
    setDoc: (path, data, merge) => (merge ? setDoc(ref(path), data, { merge: true }) : setDoc(ref(path), data)),
    delDoc: path => deleteDoc(ref(path)),
    watchDoc: (path, cb, onErr) => onSnapshot(ref(path), s => cb(s.exists() ? s.data() : null), onErr),
    watchCol(path, cb, onErr, opts = {}) {
      const qs = [];
      if (opts.orderBy) qs.push(orderBy(opts.orderBy, opts.desc ? 'desc' : 'asc'));
      if (opts.limit) qs.push(limit(opts.limit));
      return onSnapshot(qs.length ? query(col(path), ...qs) : col(path), s => cb(mapSnap(s)), onErr);
    },
    watchWhere: (c, field, value, cb, onErr, op = '==') => onSnapshot(query(col(c), where(field, op, value)), s => cb(mapSnap(s)), onErr),
    async batch(ops) {
      for (let i = 0; i < ops.length; i += 400) {
        const b = writeBatch(db);
        ops.slice(i, i + 400).forEach(o => (o.op === 'del' ? b.delete(ref(o.path)) : o.merge ? b.set(ref(o.path), o.data, { merge: true }) : b.set(ref(o.path), o.data)));
        await b.commit();
      }
    },

    watchProfileImpl(uid, cb, onErr) {
      let settled = false, timer = null;
      const stop = onSnapshot(ref(profilePath(uid)), { includeMetadataChanges: true }, snap => {
        if (!snap.exists() && snap.metadata.fromCache) {
          // On a new phone the first answer can come from an empty cache. Wait for the server a few seconds.
          if (!timer && !settled) timer = setTimeout(() => { settled = true; cb(null); }, 6000);
          return;
        }
        settled = true;
        if (timer) { clearTimeout(timer); timer = null; }
        cb(snap.exists() ? snap.data() : null);
      }, onErr);
      return () => { if (timer) clearTimeout(timer); stop(); };
    },

    async wipe(uid) {
      const ops = [];
      for (const sub of SUBS) {
        const snap = await getDocs(col(`users/${uid}/${sub}`));
        snap.forEach(d => ops.push({ op: 'del', path: `users/${uid}/${sub}/${d.id}` }));
      }
      try {
        const inv = await getDocs(query(col('shareInvites'), where('owner', '==', uid)));
        inv.forEach(d => ops.push({ op: 'del', path: `shareInvites/${d.id}` }));
      } catch (e) { /* ignore */ }
      ops.push({ op: 'del', path: `shared/${uid}` }, { op: 'del', path: profilePath(uid) });
      await be.batch(ops);
    },
    async deleteAccount() {
      if (auth.currentUser) await authM.deleteUser(auth.currentUser);
    }
  };
  return addCompat(be);
}

// ---------------------------------------------------------------------
// In-memory copy used for the preview buttons. Nothing leaves the browser.
//   ?demo=1            one sample person, nothing kept
//   ?demo=1&as=alice   a named sample person. Open a second tab with &as=sam: both tabs share
//                      one pretend database (kept in this browser), so sharing and swaps can be tried.
function memoryBackend() {
  const params = new URLSearchParams(location.search);
  const as = (params.get('as') || '').replace(/[^a-z0-9_-]/gi, '').slice(0, 20);
  const persist = !!as;
  const uid = as || 'demo';
  const user = { uid, email: `${uid}@example.com`, name: as ? as[0].toUpperCase() + as.slice(1) : 'Demo' };
  const KEY = 'shiftcal_demo_db_v1';
  let docs = {};
  const load = () => { try { docs = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { docs = {}; } };
  const save = () => { if (persist) { try { localStorage.setItem(KEY, JSON.stringify(docs)); } catch (e) { /* ignore */ } } };
  if (persist) load();
  const isObj = x => x && typeof x === 'object' && !Array.isArray(x);
  const mergeDeep = (a, b) => { const o = { ...(a || {}) }; for (const [k, v] of Object.entries(b)) o[k] = isObj(v) && isObj(o[k]) ? mergeDeep(o[k], v) : v; return o; };
  const clone = x => (x === undefined ? x : JSON.parse(JSON.stringify(x)));
  const watchers = new Set();
  const al = new Set();
  const childOf = (c, p) => p.startsWith(c + '/') && !p.slice(c.length + 1).includes('/');

  const run = w => {
    let out;
    if (w.t === 'doc' && w.path.startsWith('shared/') && w.path !== `shared/${uid}`) {
      // same rule as the real database: only an active viewer may read someone's safe copy
      const v = docs[`users/${w.path.slice(7)}/viewers/${uid}`];
      if (!v || !v.active) { if (w.last !== 'DENIED') { w.last = 'DENIED'; if (w.onErr) setTimeout(() => w.onErr({ code: 'permission-denied' }), 0); } return; }
    }
    if (w.t === 'doc') out = docs[w.path] === undefined ? null : docs[w.path];
    else {
      out = {};
      let ids = Object.keys(docs).filter(p => childOf(w.path, p));
      if (w.field) ids = ids.filter(p => (w.op === 'array-contains' ? (docs[p][w.field] || []).includes(w.value) : docs[p][w.field] === w.value));
      for (const p of ids) out[p.slice(w.path.length + 1)] = docs[p];
      if (w.opts && w.opts.orderBy) {
        const k = w.opts.orderBy, ent = Object.entries(out).sort((a, b) => (a[1][k] < b[1][k] ? -1 : a[1][k] > b[1][k] ? 1 : 0));
        if (w.opts.desc) ent.reverse();
        out = Object.fromEntries(w.opts.limit ? ent.slice(0, w.opts.limit) : ent);
      }
    }
    const s = JSON.stringify(out);
    if (s !== w.last) { w.last = s; setTimeout(() => w.cb(clone(out)), 0); }
  };
  const runAll = () => watchers.forEach(run);
  window.addEventListener('storage', e => { if (e.key === KEY) { load(); runAll(); } });
  const add = w => { watchers.add(w); run(w); return () => watchers.delete(w); };

  const be = {
    kind: 'demo', as,
    onAuth(cb) { al.add(cb); setTimeout(() => cb(user), 0); return () => al.delete(cb); },
    signUp: async () => { al.forEach(f => f(user)); }, signIn: async () => { al.forEach(f => f(user)); }, google: async () => { al.forEach(f => f(user)); }, reset: async () => {},
    signOut: async () => { al.forEach(f => f(null)); },
    async getDoc(path) { if (persist) load(); return docs[path] === undefined ? null : clone(docs[path]); },
    async setDoc(path, data, merge) { if (persist) load(); docs[path] = merge ? mergeDeep(docs[path], clone(data)) : clone(data); save(); runAll(); },
    async delDoc(path) { if (persist) load(); delete docs[path]; save(); runAll(); },
    watchDoc: (path, cb, onErr) => add({ t: 'doc', path, cb, onErr }),
    watchCol: (path, cb, onErr, opts) => add({ t: 'col', path, cb, opts }),
    watchWhere: (path, field, value, cb, onErr, op = '==') => add({ t: 'col', path, field, value, op, cb }),
    async batch(ops) {
      if (persist) load();
      for (const o of ops) { if (o.op === 'del') delete docs[o.path]; else docs[o.path] = o.merge ? mergeDeep(docs[o.path], clone(o.data)) : clone(o.data); }
      save(); runAll();
    },
    async wipe(u) {
      if (persist) load();
      Object.keys(docs).forEach(p => { if (p === `users/${u}` || p.startsWith(`users/${u}/`) || p === `shared/${u}` || (p.startsWith('shareInvites/') && docs[p].owner === u)) delete docs[p]; });
      save(); runAll();
    },
    deleteAccount: async () => { al.forEach(f => f(null)); }
  };
  return addCompat(be);
}
