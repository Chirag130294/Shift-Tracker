// Talks to Firebase (sign-in and saving). app.js only uses the small interface returned here.
//   be.onAuth(cb)            cb(user | null)       user = { uid, email, name }
//   be.signUp / be.signIn    (email, password)
//   be.google()              Google pop-up sign-in
//   be.reset(email)          password reset email
//   be.signOut()
//   be.watchProfile(uid, cb, onErr)   cb(profile | null)
//   be.saveProfile(uid, patch)        merges fields into the profile
//   be.watchDays(uid, cb, onErr)      cb({ 'YYYY-MM-DD': { type, hours, ... } })
//   be.setDay / be.delDay / be.setDays
//   be.wipe(uid) / be.deleteAccount()
import { firebaseConfig } from './firebase-config.js';

const V = '10.14.1';
const CDN = `https://www.gstatic.com/firebasejs/${V}`;

export const isConfigured = () => !String(firebaseConfig.apiKey).startsWith('PASTE');

export async function createBackend(demo) {
  if (demo) return memoryBackend();
  if (!isConfigured()) return null;
  return firebaseBackend();
}

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
  const { doc, setDoc, deleteDoc, onSnapshot, collection, getDocs, writeBatch } = fsM;
  const profileRef = uid => doc(db, 'users', uid);
  const dayRef = (uid, d) => doc(db, 'users', uid, 'days', d);
  const toUser = u => (u ? { uid: u.uid, email: u.email || '', name: u.displayName || '' } : null);

  return {
    kind: 'firebase',
    onAuth: cb => authM.onAuthStateChanged(auth, u => cb(toUser(u))),
    signUp: (e, p) => authM.createUserWithEmailAndPassword(auth, e, p),
    signIn: (e, p) => authM.signInWithEmailAndPassword(auth, e, p),
    google: () => authM.signInWithPopup(auth, new authM.GoogleAuthProvider()),
    reset: e => authM.sendPasswordResetEmail(auth, e),
    signOut: () => authM.signOut(auth),

    watchProfile(uid, cb, onErr) {
      let settled = false, timer = null;
      const stop = onSnapshot(profileRef(uid), { includeMetadataChanges: true }, snap => {
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
    saveProfile: (uid, patch) => setDoc(profileRef(uid), { ...patch, updatedAt: Date.now() }, { merge: true }),

    watchDays: (uid, cb, onErr) => onSnapshot(collection(db, 'users', uid, 'days'), snap => {
      const m = {};
      snap.forEach(d => { m[d.id] = d.data(); });
      cb(m);
    }, onErr),
    setDay: (uid, d, obj) => setDoc(dayRef(uid, d), obj),
    delDay: (uid, d) => deleteDoc(dayRef(uid, d)),
    async setDays(uid, entries) {
      const batch = writeBatch(db);
      for (const [d, obj] of Object.entries(entries)) {
        if (obj) batch.set(dayRef(uid, d), obj); else batch.delete(dayRef(uid, d));
      }
      return batch.commit();
    },

    async wipe(uid) {
      const snap = await getDocs(collection(db, 'users', uid, 'days'));
      const ids = [];
      snap.forEach(d => ids.push(d.id));
      for (let i = 0; i < ids.length; i += 400) {
        const batch = writeBatch(db);
        ids.slice(i, i + 400).forEach(id => batch.delete(dayRef(uid, id)));
        await batch.commit();
      }
      await deleteDoc(profileRef(uid));
    },
    async deleteAccount() {
      if (auth.currentUser) await authM.deleteUser(auth.currentUser);
    }
  };
}

// In-memory copy used for the "Preview with sample data" button. Nothing is saved anywhere.
function memoryBackend() {
  const user = { uid: 'demo', email: 'demo@example.com', name: 'Demo' };
  let profile = null, days = {};
  const pl = new Set(), dl = new Set(), al = new Set();
  const fire = (set, v) => set.forEach(f => f(v));
  return {
    kind: 'demo',
    onAuth(cb) { al.add(cb); setTimeout(() => cb(user), 0); return () => al.delete(cb); },
    signUp: async () => { fire(al, user); }, signIn: async () => { fire(al, user); }, google: async () => { fire(al, user); }, reset: async () => {},
    signOut: async () => { fire(al, null); },
    watchProfile(uid, cb) { pl.add(cb); setTimeout(() => cb(profile), 0); return () => pl.delete(cb); },
    saveProfile: async (uid, patch) => { profile = { ...(profile || {}), ...patch }; fire(pl, profile); },
    watchDays(uid, cb) { dl.add(cb); setTimeout(() => cb({ ...days }), 0); return () => dl.delete(cb); },
    setDay: async (uid, d, obj) => { days = { ...days, [d]: obj }; fire(dl, { ...days }); },
    delDay: async (uid, d) => { const n = { ...days }; delete n[d]; days = n; fire(dl, { ...days }); },
    setDays: async (uid, entries) => {
      const n = { ...days };
      for (const [d, o] of Object.entries(entries)) { if (o) n[d] = o; else delete n[d]; }
      days = n; fire(dl, { ...days });
    },
    wipe: async () => { profile = null; days = {}; fire(pl, null); fire(dl, {}); },
    deleteAccount: async () => { fire(al, null); }
  };
}
