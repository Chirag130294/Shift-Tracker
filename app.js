// Shift Calendar v1.4: start-up, sign-in and live data. Screens live in the views-*.js files.
import { createBackend } from './backend.js';
import {
  E, S, VIEWS, ACT, $, esc, ico, bstyle, field, render, go, tab, saveErr, toast, normalize, newProfile, todayParts
} from './core.js';
import './views-cal.js';
import './views-leave.js';
import './views-rot.js';
import './views-settings.js';
import { publishSoon, syncFollow, applySwaps, resetSocial, joinFromUrl, maybeShowJoin } from './views-social.js';

VIEWS.boot = () => `<div class="center" style="flex-direction:column;gap:12px;text-align:center">${S.bootErr ? `<div class="note err">${esc(S.bootErr)}</div><button class="btn sec" data-act="signOut">Log out</button>` : 'Loading...'}</div>`;

VIEWS.config = () => `<div class="stack" style="padding-top:40px">
  <h1>Almost there</h1>
  <p class="mute">Open <b>firebase-config.js</b> and paste your Firebase web app settings, then save the file. Step by step instructions are in SETUP-GUIDE.md.</p>
  <a class="btn sec" style="display:flex;align-items:center;justify-content:center;text-decoration:none" href="?demo=1">Preview with sample data</a></div>`;

VIEWS.fatal = () => `<div class="stack" style="padding-top:40px"><h1>Could not start</h1><div class="note err">${esc(S.bootErr)}</div><button class="btn" data-act="reload">Try again</button></div>`;

VIEWS.login = () => {
  const su = S.authMode === 'signup';
  return `<div class="hero"><div class="logo">${ico('cal', 34)}</div><h1>Shift Calendar</h1>
    <p>Your rotation, holidays, leave and pay days in one calendar.</p>
    <div class="row" style="margin-top:18px;gap:8px">${E.DEFAULT_SHIFTS().map(s => `<span class="bdg" style="${bstyle(s)};min-width:44px;height:32px;border:1.5px solid #fff;font-size:13px">${esc(s.code)}</span>`).join('')}</div></div>
  <div class="sheet stack">
    <h2 style="font-size:22px">${su ? 'Create account' : 'Log in'}</h2>
    <button class="btn sec" data-act="google" type="button">Continue with Google</button>
    <div class="row mute small"><span class="grow" style="height:1px;background:var(--line)"></span>or use email<span class="grow" style="height:1px;background:var(--line)"></span></div>
    <form id="authForm" class="stack" novalidate>
      ${field('<span id="l1">Email</span>', '<input id="email" type="email" autocomplete="email" inputmode="email" aria-labelledby="l1">')}
      ${field('<span id="l2">Password</span>', `<input id="pw" type="password" autocomplete="${su ? 'new-password' : 'current-password'}" placeholder="At least 8 characters" aria-labelledby="l2">`)}
      <div id="authMsg" class="small" role="alert"></div>
      <button class="btn" id="authBtn" type="submit">${su ? 'Create account' : 'Log in'}</button>
    </form>
    ${su ? '' : '<button class="link" data-act="reset" type="button">Forgot password?</button>'}
    <p class="mute" style="text-align:center">${su ? 'Already have an account?' : 'New here?'} <button class="link" data-act="authMode" type="button">${su ? 'Log in' : 'Create an account'}</button></p>
    <p class="mute small" style="text-align:center">Your schedule is saved to your account and works offline.</p>
  </div>`;
};// ---------- sign in ----------
function setAuthMsg(msg, ok) {
  const el = $('#authMsg');
  if (el) { el.textContent = msg; el.style.color = ok ? 'var(--acc)' : 'var(--err)'; }
}
function authMsg(e) {
  const c = (e && e.code) || '';
  const map = {
    'auth/invalid-email': 'That email address does not look right.',
    'auth/invalid-credential': 'Wrong email or password.', 'auth/wrong-password': 'Wrong email or password.', 'auth/user-not-found': 'Wrong email or password.',
    'auth/email-already-in-use': 'An account with this email already exists. Log in instead.',
    'auth/weak-password': 'Use a password of at least 8 characters.',
    'auth/too-many-requests': 'Too many tries. Wait a few minutes and try again.',
    'auth/network-request-failed': 'No connection. Check your internet and try again.',
    'auth/popup-closed-by-user': 'The Google window was closed before sign-in finished.',
    'auth/cancelled-popup-request': '',
    'auth/popup-blocked': 'Your browser blocked the Google window. Allow pop-ups for this site and try again.',
    'auth/unauthorized-domain': `Add ${location.hostname} in Firebase > Authentication > Settings > Authorized domains.`,
    'auth/operation-not-allowed': 'This sign-in method is not turned on in Firebase > Authentication > Sign-in method.'
  };
  return c in map ? map[c] : (e && e.message) || 'Something went wrong.';
}
async function doAuth() {
  const email = $('#email').value.trim(), pw = $('#pw').value, su = S.authMode === 'signup';
  if (!email || pw.length < 8) return setAuthMsg('Enter your email and a password of at least 8 characters.');
  const btn = $('#authBtn'); btn.disabled = true; setAuthMsg('');
  try { await (su ? S.be.signUp(email, pw) : S.be.signIn(email, pw)); } catch (e) { setAuthMsg(authMsg(e)); }
  const b = $('#authBtn'); if (b) b.disabled = false;
}
// ---------- sign-in actions ----------
Object.assign(ACT, {
  signOut: () => S.be.signOut(),
  authMode: () => { S.authMode = S.authMode === 'login' ? 'signup' : 'login'; render(false); },
  google: async () => { try { await S.be.google(); } catch (e) { const m = authMsg(e); if (m) setAuthMsg(m); } },
  reset: async () => {
    const email = (($('#email') || {}).value || '').trim();
    if (!email) return setAuthMsg('Type your email above first.');
    try { await S.be.reset(email); setAuthMsg('Password reset email sent. Check your inbox and spam folder.', true); } catch (e) { setAuthMsg(authMsg(e)); }
  }
});
document.addEventListener('submit', e => { if (e.target.id === 'authForm') { e.preventDefault(); doAuth(); } });

// =====================================================================
// LIVE DATA
// =====================================================================
const stopWatching = () => { S.unsub.forEach(f => { try { f(); } catch (err) { /* ignore */ } }); S.unsub = []; };
function fail(e) {
  console.error(e);
  S.bootErr = saveErr(e).replace('Not saved: ', 'Cannot load your data: ');
  if (!S.profile) render(false); else toast(saveErr(e));
}
let ruleToast = false;
function softFail(e) {
  console.warn(e);
  if (!ruleToast && (e.code || '').includes('permission')) { ruleToast = true; toast('Sharing needs the new Firestore rules. See the upgrade steps.'); }
}
const SOC = ['cal', 'notices', 'sharing', 'follow', 'colleague', 'swapView', 'settings', 'up', 'leave'];
const rerender = () => { if (S.profile && SOC.includes(S.view)) render(false); };

function seedDemo() {
  S.seeded = true;
  const t = E.todayIso(), as = S.be.as || '';
  const PAT = {
    '': ['am', 'am', '', '', 'pm', 'pm', '', '', 'd', 'e', 'n', '', '', 'am'],
    alice: ['am', 'am', '', '', 'pm', 'pm', '', '', 'd', 'e', 'n', '', '', 'am'],
    sam: ['pm', '', 'am', 'am', '', '', 'e', 'd', '', '', 'am', 'am', 'pm', '']
  };
  const pat = { id: 'p1', mode: 'week', anchor: '2026-10-11', effectiveFrom: '1900-01-01', days: PAT[as] || PAT.alice };
  const prof = { ...newProfile(), name: as ? as[0].toUpperCase() + as.slice(1) : 'Demo', patterns: [pat], payFreq: 'biweekly', payAnchor: '2026-10-29', vacYearly: 120, carryLimit: 20, deadline: '2026-12-31', onboarded: true };
  prof.banks = prof.banks.map(b => (b.id === 'vac' ? { ...b, balance: 84, asOf: t, earn: { rule: 'pay', amount: 3.7 } } : b.id === 'sick' ? { ...b, balance: 36, asOf: t } : b.id === 'bank' ? { ...b, balance: 12, asOf: t } : { ...b, asOf: t }));
  S.be.saveProfile(S.user.uid, prof);
  const days = {};
  const ctx = { shifts: Object.fromEntries(prof.shifts.map(s => [s.id, s])), patterns: [pat], days: {} };
  for (let n = 3; n < 40 && Object.keys(days).length < 2; n++) { const d = E.addDays(t, n), i = E.dayInfo(d, ctx); if (i.base) days[d] = { type: 'VAC', hours: i.baseHours }; }
  S.be.setDays(S.user.uid, days);
}
function onProfile(p) {
  S.bootErr = '';
  if (p && p.onboarded) {
    S.profile = normalize(p);
    if (['boot', 'login', 'setup'].includes(S.view)) { S.view = 'cal'; S.p = {}; S.month = S.month || todayParts(); history.replaceState({ view: 'cal', p: {}, depth: 0 }, ''); if (maybeShowJoin()) return; }
    render(false); publishSoon();
    return;
  }
  if (S.be.kind === 'demo' && !S.seeded) { seedDemo(); return; }
  if (!S.profile || S.profile.onboarded) {
    S.profile = newProfile(); S.profile.name = S.user.name || '';
    S.setup = { step: 1, err: '' }; S.rot = null; S.view = 'setup'; S.p = {};
  }
  render(false);
}
let firstNotes = true;
function onUser(user) {
  stopWatching(); resetSocial();
  S.user = user; S.days = {}; S.profile = null; S.rot = null; S.bootErr = '';
  S.viewers = {}; S.following = {}; S.notes = {}; S.swaps = {}; S.invites = {}; firstNotes = true;
  if (!user) { S.view = 'login'; S.authMode = 'login'; render(true); return; }
  S.view = 'boot'; render(false);
  const be = S.be, uid = user.uid, u = S.unsub;
  u.push(be.watchProfile(uid, onProfile, fail));
  u.push(be.watchDays(uid, d => { S.days = d; if (S.profile && !['bankEdit', 'shiftEdit', 'swapNew', 'export', 'setup'].includes(S.view)) render(false); publishSoon(); applySwaps(); }, fail));
  u.push(be.watchCol(`users/${uid}/viewers`, d => { S.viewers = d; publishSoon(); rerender(); }, softFail));
  u.push(be.watchCol(`users/${uid}/following`, d => { S.following = d; syncFollow(); rerender(); }, softFail));
  u.push(be.watchCol(`users/${uid}/notifications`, d => {
    S.notes = d; rerender();
    const n = Object.values(d).filter(x => !x.read).length;
    if (firstNotes) { firstNotes = false; if (n) toast(`You have ${n} new notification${n === 1 ? '' : 's'}`); }
  }, softFail, { orderBy: 'at', desc: true, limit: 50 }));
  u.push(be.watchWhere('shareInvites', 'owner', uid, d => { S.invites = d; if (S.view === 'sharing') render(false); }, softFail));
  u.push(be.watchWhere('swaps', 'members', uid, d => { S.swaps = Object.fromEntries(Object.entries(d).map(([id, s]) => [id, { ...s, id }])); applySwaps(); rerender(); if (S.view === 'swapNew') return; }, softFail, 'array-contains'));
}
async function start() {
  $('#app').dataset.started = '1';
  S.month = todayParts();
  joinFromUrl();
  history.replaceState({ view: 'boot', p: {}, depth: 0 }, '');
  window.addEventListener('online', () => $('#offline').classList.add('hidden'));
  window.addEventListener('offline', () => $('#offline').classList.remove('hidden'));
  if (!navigator.onLine) $('#offline').classList.remove('hidden');
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
  try {
    S.be = await createBackend(new URLSearchParams(location.search).has('demo'));
  } catch (e) {
    console.error(e);
    S.view = 'fatal'; S.bootErr = 'Could not load Firebase. Check your internet connection and the settings in firebase-config.js. ' + (e.message || '');
    render(true); return;
  }
  if (!S.be) { S.view = 'config'; render(true); return; }
  S.be.onAuth(onUser);
}
start();
