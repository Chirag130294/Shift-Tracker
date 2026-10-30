// Shift Calendar: shared state, helpers and the small UI pieces every screen uses.
// Screens live in views-*.js and register themselves in VIEWS and ACT.
import * as E from './engine.js';
import * as B from './banks.js';
import * as SH from './share.js';
import * as PAY from './pay.js';
import { REGIONS, BUILT_IN, holidaysFor, holidaysAny, ensureList, setOnLoaded } from './holidays.js';
export { E, B, SH, PAY, REGIONS };

export const $ = s => document.querySelector(s);
export const $$ = s => Array.from(document.querySelectorAll(s));
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const DOWS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const DOWL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const fmtMD = s => `${MON[E.parts(s).m - 1]} ${E.parts(s).d}`;
export const fmtD = s => `${DOWS[E.weekday(s)]}, ${fmtMD(s)}`;
export const fmtDY = s => `${fmtD(s)}, ${E.parts(s).y}`;
export const fmtH = h => `${+(Number(h) || 0).toFixed(2)} h`;
export const shortT = t => { const [h, m] = t.split(':').map(Number); return `${h % 12 || 12}${m ? ':' + E.pad(m) : ''}${h >= 12 ? 'p' : 'a'}`; };
export const timeRange = sh => `${shortT(sh.start)}-${shortT(sh.end)}`;
export const range = (a, b) => (E.parts(a).m === E.parts(b).m ? `${fmtMD(a)} to ${E.parts(b).d}` : `${fmtMD(a)} to ${fmtMD(b)}`);
export const fmtAgo = at => {
  const s = Math.max(0, (Date.now() - at) / 1000);
  if (s < 90) return 'now'; if (s < 3600) return Math.round(s / 60) + ' min'; if (s < 86400) return Math.round(s / 3600) + ' h';
  const d = new Date(at); return `${MON[d.getMonth()]} ${d.getDate()}`;
};
export const dowFrom = (ws, k) => DOWS[(ws + k) % 7];

// ---------- icons ----------
const P = {
  back: '<path d="M15 5l-7 7 7 7"/>', next: '<path d="M9 5l7 7-7 7"/>',
  cal: '<rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M8 3v4M16 3v4M3.5 10h17"/>',
  leave: '<rect x="3.5" y="8" width="17" height="12" rx="2.5"/><path d="M9 8V6.5A1.5 1.5 0 0 1 10.5 5h3A1.5 1.5 0 0 1 15 6.5V8M3.5 13h17"/>',
  list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
  gear: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
  sun: '<path d="M12 4v2M12 18v2M4 12h2M18 12h2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M17.7 6.3l-1.4 1.4M7.7 16.3l-1.4 1.4"/><circle cx="12" cy="12" r="3.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  star: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9 6.8 19.7l1-5.9L3.5 9.7l5.9-.8z"/>',
  off: '<circle cx="12" cy="12" r="8.5"/><path d="M8 12h8"/>',
  swap: '<path d="M7 7h11l-3-3M17 17H6l3 3"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/>',
  trend: '<path d="M4 17l5-5 4 4 7-8M15 8h5v5"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  warn: '<path d="M12 8v5M12 16.5h.01M10.3 4.2L2.8 17.5A2 2 0 0 0 4.5 20.5h15a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0z"/>',
  bell: '<path d="M6 17V11a6 6 0 1 1 12 0v6l1.5 2h-15zM10 21h4"/>',
  users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 19c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5M16 5.2a3.2 3.2 0 0 1 0 5.6M18 14c2 .6 3.5 2.3 3.5 5"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  download: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  user: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.6 3-6 7-6s7 2.4 7 6"/>',
  globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.5 3.5 5.4 3.5 8.5s-1 6-3.5 8.5c-2.5-2.5-3.5-5.4-3.5-8.5s1-6 3.5-8.5z"/>',
  dollar: '<path d="M12 4v16M16 8.5c0-1.7-1.8-2.8-4-2.8s-4 1.1-4 2.8 1.8 2.6 4 3 4 1.3 4 3-1.8 2.8-4 2.8-4-1.1-4-2.8"/>',
  flag: '<path d="M6 20V4M6 5h11l-2.5 3.5L17 12H6"/>',
  shield: '<path d="M12 3.5l7 2.8v5.2c0 4.3-2.9 7.6-7 9-4.1-1.4-7-4.7-7-9V6.3z"/>',
  screen: '<rect x="3.5" y="4.5" width="17" height="12" rx="2.5"/><path d="M9 20h6M12 16.5V20"/>',
  repeat: '<path d="M4 11a6 6 0 0 1 6-6h8l-2.5-2.5M20 13a6 6 0 0 1-6 6H6l2.5 2.5"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/>',
  lib: '<rect x="4" y="5" width="6" height="14" rx="1.5"/><rect x="14" y="5" width="6" height="14" rx="1.5"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01"/>',
  inbox: '<path d="M4 13l2.5-7h11L20 13v5.5H4zM4 13h5l1 2h4l1-2h5"/>'
};
export const ico = (n, s = 20) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n]}</svg>`;
export const moon = (s = 11) => `<svg class="moon" viewBox="0 0 24 24" width="${s}" height="${s}" aria-hidden="true"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" fill="currentColor"/></svg>`;
export const starFill = (s = 11) => `<svg class="star" viewBox="0 0 24 24" width="${s}" height="${s}" aria-hidden="true"><path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4L2.8 9.5l6.4-.8z" fill="currentColor"/></svg>`;
// A friendly screen for "nothing here yet"
export const empty = (icon, title, text, btn = '', act = '', extra = '') => `<div class="empty"><span class="ei">${ico(icon, 24)}</span><b>${esc(title)}</b><p>${esc(text)}</p>${btn ? `<button class="btn" data-act="${act}" ${extra}>${esc(btn)}</button>` : ''}</div>`;

// ---------- colors ----------
export function inkFor(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return '#fff';
  const n = parseInt(m[1], 16);
  const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const L = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  return 1.05 / (L + 0.05) > (L + 0.05) / 0.061 ? '#fff' : '#1B1B1B';
}
export const bstyle = sh => `background:${esc(sh.color)};color:${inkFor(sh.color)}`;
export const badge = (sh, cls = '', style = '') => `<span class="bdg ${cls}" style="${bstyle(sh)};${style}">${esc(sh.code)}</span>`;
export const LV = {
  VAC: { l: 'VAC', name: 'Vacation', bg: '#CFE0F5' },
  SICK: { l: 'SICK', name: 'Sick day', bg: '#F6D9D4' },
  LIEU: { l: 'LIEU', name: 'Lieu day', bg: '#E3D5F5' },
  OFF: { l: 'OFF', name: 'Day off (requested)', bg: '#E3ECE9' }
};
export const isLvType = t => t === 'VAC' || t === 'SICK' || t === 'LIEU' || t === 'LEAVE' || t === 'OFF';
export const lvStyle = lv => `background:${lv.bg};color:#14302B`;

// ---------- state ----------
export const S = {
  be: null, user: null, profile: null, days: {}, view: 'boot', p: {}, C: null, banks: [],
  month: null, authMode: 'login', rot: null, se: null, sw: { person: '', note: '', shiftId: '' }, bk: null, bedit: null,
  sel: null, slide: '', notes: {}, viewers: {}, following: {}, swaps: {}, invites: {}, colleague: null, joinCode: '', exp: null,
  unsub: [], bootErr: '', seeded: false, setup: null, anim: '', depth: 0, undo: null
};
export const VIEWS = {}, ACT = {}, SWIPE = {};
export const VIEWCLS = { cal: 'calview', setup: '', login: '' };
// Which tab is lit for each screen
export const TABOF = {
  cal: 'cal', day: 'cal', swap: 'cal', whoCan: 'cal', notices: 'cal', swapView: 'cal', swapCounter: 'cal',
  leave: 'leave', book: 'leave', bankDetail: 'leave', bankEdit: 'leave',
  pay: 'pay',
  up: 'up'
};
const NO_TABS = ['boot', 'login', 'config', 'fatal', 'setup'];
export const AFTER = [];      // run after each render
export const ON_CHANGE = [];  // run when profile or days change
export const todayParts = () => { const t = E.parts(E.todayIso()); return { y: t.y, m: t.m }; };
export const defaultRegion = cc => (cc === 'CA' ? 'ON' : cc === 'US' ? 'US' : '');

export const newProfile = () => ({
  name: '', country: 'CA', region: 'ON', showHolidays: true, customHolidays: [], holidayLieu: { on: false, earn: 'day', bank: 'lieu' },
  shifts: E.DEFAULT_SHIFTS(), patterns: [], weekStart: 0, layout: 'auto',
  payFreq: 'biweekly', payAnchor: '', payWeekend: 'before', pay: PAY.defaultPay(),
  banks: B.DEFAULT_BANKS().map(b => ({ ...b, asOf: E.todayIso() })),
  vacYearly: 0, carryLimit: '', deadline: '', reminderMin: 120, onboarded: false
});
export const normalize = p => {
  const n = { ...newProfile(), ...p };
  if (!n.shifts || !n.shifts.length) n.shifts = E.DEFAULT_SHIFTS();
  n.banks = B.migrateBanks(n);
  const w = Number(n.weekStart);
  n.weekStart = Number.isInteger(w) && w >= 0 && w <= 6 ? w : 0;
  n.holidayLieu = { on: false, earn: 'day', bank: 'lieu', ...(p.holidayLieu || {}) };
  n.pay = PAY.normPay(p.pay);
  return n;
};
export const buildCtx = () => ({ shifts: Object.fromEntries((S.profile.shifts || []).map(s => [s.id, s])), patterns: S.profile.patterns || [], days: S.days });
export const ws = () => (S.profile ? S.profile.weekStart || 0 : 0);

// ---------- data helpers ----------
const hcache = {};
// All holidays of one year for the chosen country and region: { 'YYYY-MM-DD': name }
export function holidayList(y, country = S.profile.country, region = S.profile.region) {
  if (!country) return {};
  if (BUILT_IN.includes(country)) { const k = `${y}|${country}|${region}`; return hcache[k] || (hcache[k] = holidaysFor(y, country, region)); }
  ensureList(country, y);
  return holidaysAny(y, country, region);
}
export function holiday(date) {
  const p = S.profile;
  const c = (p.customHolidays || []).find(x => x.date === date);
  if (c) return c.name;
  if (p.showHolidays === false || !p.country) return null;
  return holidayList(E.parts(date).y)[date] || null;
}
export const bankOf = id => B.bankById(S.banks, id);

// Lieu time earned by working a holiday (when the switch in Holidays is on)
export function lieuInfo(date) {
  const p = S.profile, L = p.holidayLieu;
  if (!L || !L.on) return null;
  const name = holiday(date);
  if (!name) return null;
  const custom = (p.customHolidays || []).find(x => x.date === date);
  if (custom && custom.lieu === false) return null;
  const i = E.dayInfo(date, S.C), o = S.days[date] || {};
  if (!i.isWorking || o.noLieu || o.lieu) return null;
  const bank = bankOf(L.bank || 'lieu');
  if (!bank) return null;
  const worked = Number(i.hours) || 0;
  const hours = L.earn === 'hours' ? worked : L.earn === 'x15' ? worked * 1.5 : bank.dayHours;
  return { bank: bank.id, hours, name, sub: `${name} worked`, text: bank.unit === 'd' ? `+${+B.toUnit(bank, hours).toFixed(2)} day${Math.abs(B.toUnit(bank, hours) - 1) < 0.005 ? '' : 's'}` : `+${B.fmtAmt(bank, hours)}` };
}
export function lieuCredits(from, to) {
  const L = S.profile.holidayLieu;
  if (!L || !L.on) return [];
  const dates = new Set();
  for (let y = E.parts(from).y; y <= E.parts(to).y; y++) Object.keys(holidayList(y)).forEach(d => dates.add(d));
  (S.profile.customHolidays || []).forEach(h => dates.add(h.date));
  const out = [];
  for (const d of Array.from(dates).sort()) {
    if (d < from || d > to) continue;
    const li = lieuInfo(d);
    if (li) out.push({ bank: li.bank, date: d, hours: li.hours, sub: li.sub });
  }
  return out;
}
// What a bank holds: today, booked, available to book, and the ledger rows.
export function bankStat(id, skipDate, draft) {
  const bank = draft || bankOf(id);
  if (!bank) return { bank: null, left: 0, booked: 0, after: 0, rows: [] };
  let days = S.days;
  if (skipDate && days[skipDate]) { days = { ...days }; delete days[skipDate]; }
  const today = E.todayIso(), L0 = S.profile.holidayLieu;
  const autoCredits = L0 && L0.on && (L0.bank || 'lieu') === bank.id ? lieuCredits(bank.asOf || today, E.addDays(today, 120)).filter(c => c.date !== skipDate) : [];
  const L = B.ledger(bank, { profile: S.profile, days, autoCredits }, today);
  return { bank, left: L.today, booked: L.booked, after: L.available, rows: L.rows, opening: L.opening, asOf: L.asOf };
}
export const leaveCalc = (type, skipDate) => bankStat(type === 'vac' ? 'vac' : type === 'sick' ? 'sick' : type, skipDate);
export function lvOf(o) {
  if (!o || o.type === 'OFF') return LV.OFF;
  const s = B.daySplits(o)[0], b = s && bankOf(s.bank);
  if (b) return { l: b.short, name: b.name, bg: B.softColor(b.color), bankId: b.id };
  return LV[o.type] || LV.VAC;
}
// "Taken from Vacation: 11.5 h"
export function leaveText(o) {
  const parts = B.daySplits(o).map(sp => { const b = bankOf(sp.bank); return b ? `${b.name} ${B.fmtAmt(b, sp.legacyDay ? (b.unit === 'd' ? 1 : b.dayHours) : B.toUnit(b, sp.h))}` : ''; }).filter(Boolean);
  return parts.length ? `Taken from ${parts.join(' + ')}` : '';
}
export function nextShift() {
  const today = E.todayIso(), now = new Date();
  for (let n = 0; n < 120; n++) {
    const d = E.addDays(today, n), i = E.dayInfo(d, S.C);
    const sh = i.isWorking && S.C.shifts[i.work];
    if (!sh) continue;
    if (n === 0) {
      const [eh, em] = sh.end.split(':').map(Number);
      const endAt = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (E.crossesMidnight(sh) ? 1 : 0), eh, em);
      if (now > endAt) continue;
    }
    return { date: d, sh, info: i };
  }
  return null;
}
export function shiftTimes(sh, date) {
  if (!E.crossesMidnight(sh)) return `${sh.start} to ${sh.end}`;
  return `${DOWS[E.weekday(date)]} ${sh.start} to ${DOWS[(E.weekday(date) + 1) % 7]} ${sh.end}`;
}
export function leaveGroups() {
  const ds = Object.keys(S.days).filter(d => isLvType(S.days[d].type) && S.days[d].type !== 'OFF').sort();
  const out = [];
  const offBetween = (a, b) => { for (let n = E.dayNum(a) + 1; n < E.dayNum(b); n++) if (E.baseShiftId(E.fromDayNum(n), S.C.patterns)) return false; return true; };
  for (const d of ds) {
    const o = S.days[d], lv = lvOf(o), h = Number(o.hours) || 0, last = out[out.length - 1];
    if (last && last.key === lv.l && offBetween(last.end, d)) { last.end = d; last.n++; last.hours += h; }
    else out.push({ key: lv.l, lv, type: o.type, start: d, end: d, n: 1, hours: h });
  }
  return out;
}
export function timeOffIdeas() {
  const today = E.todayIso(), from = E.addDays(today, 1), to = E.addDays(today, 240);
  const runs = E.offRuns(from, to, S.C);
  if (runs.length && runs[0].start === from && !E.dayInfo(today, S.C).isWorking) runs.shift();
  const names = r => { const out = []; for (let n = E.dayNum(r.start); n <= E.dayNum(r.end); n++) { const h = holiday(E.fromDayNum(n)); if (h) out.push(h); } return out; };
  const booked = r => { let c = 0; for (let n = E.dayNum(r.start); n <= E.dayNum(r.end); n++) if (['VAC', 'SICK', 'LIEU', 'LEAVE'].includes(E.dayInfo(E.fromDayNum(n), S.C).type)) c++; return c; };
  const lw = runs.find(r => r.len >= 3 && names(r).length) || runs.find(r => r.len >= 4) || null;
  const tips = [];
  for (let i = 0; i + 1 < runs.length && tips.length < 2; i++) {
    const a = runs[i], b = runs[i + 1], gap = E.diffDays(a.end, b.start) - 1;
    if (gap < 1 || gap > 2 || a.len < 2 || b.len < 2 || a.len + gap + b.len < 6) continue;
    let hours = 0;
    for (let n = 1; n <= gap; n++) hours += E.dayInfo(E.addDays(a.end, n), S.C).baseHours;
    tips.push({ start: a.start, end: b.end, len: a.len + gap + b.len, gap, hours });
  }
  return { lw: lw && { ...lw, names: names(lw), booked: booked(lw) }, tips };
}
// Last choices are remembered on this phone (a bank to book from, export options)
export const memGet = k => { try { return JSON.parse(localStorage.getItem('shiftcal_' + k) || 'null'); } catch (e) { return null; } };
export const memSet = (k, v) => { try { localStorage.setItem('shiftcal_' + k, JSON.stringify(v)); } catch (e) { /* ignore */ } };

// ---------- small UI helpers ----------
export const buzz = () => { try { if (navigator.vibrate && !matchMedia('(prefers-reduced-motion:reduce)').matches) navigator.vibrate(8); } catch (e) { /* ignore */ } };
let toastTimer, syncTimer, pending = 0;
export function toast(msg, undo) {
  if (msg === 'Saved' || msg === 'Note saved') return flashSaved();
  const el = $('#toast');
  if (!el) return;
  S.undo = undo || null;
  el.innerHTML = `<span>${esc(msg)}</span>${undo ? '<button type="button" data-act="undo">Undo</button>' : ''}`;
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.classList.add('hidden'); S.undo = null; }, undo ? 6000 : 2600);
}
// "Saving... / Offline, will sync / Saved" chip, so people can see their change reached the cloud
function syncEl(text, off) {
  const el = $('#sync');
  if (!el) return;
  if (!text) { el.classList.add('hidden'); return; }
  el.textContent = text; el.classList.toggle('off', !!off); el.classList.remove('hidden');
}
function showSync() {
  clearTimeout(syncTimer);
  if (pending > 0) syncEl(navigator.onLine === false ? 'Offline, will sync' : 'Saving...', navigator.onLine === false);
  else syncEl('');
}
export function flashSaved() {
  if (pending > 0) return showSync();
  syncEl('Saved ✓'); clearTimeout(syncTimer); syncTimer = setTimeout(() => syncEl(''), 1400);
}
export function track(p) {
  if (!p || typeof p.then !== 'function') return p;
  pending++; showSync();
  const done = () => { pending = Math.max(0, pending - 1); if (pending === 0) flashSaved(); else showSync(); };
  p.then(done, done);
  return p;
}
window.addEventListener('online', showSync);
window.addEventListener('offline', showSync);

export const top = (title, back = true, right = '') => `<div class="top">${back ? `<button class="iconbtn" data-act="back" aria-label="Back">${ico('back')}</button>` : ''}<h1 class="grow">${esc(title)}</h1>${right}</div>`;
const NAV = [['cal', 'Calendar', 'cal'], ['leave', 'Leave', 'leave'], ['pay', 'Pay', 'pay'], ['up', 'Upcoming', 'list'], ['settings', 'Settings', 'gear']];
// The Pay tab shows the currency sign the person chose
const navIcon = i => (i === 'pay' ? `<span class="cursign" aria-hidden="true">${esc(PAY.currencySymbol(S.profile))}</span>` : ico(i, 22));
export const nav = a => `<nav class="tabs" aria-label="Main">${NAV.map(([v, l, i]) => `<button data-act="tab" data-v="${v}" class="${a === v ? 'on' : ''}" ${a === v ? 'aria-current="page"' : ''}>${navIcon(i)}${l}</button>`).join('')}</nav>`;
export const demoNote = () => (S.be && S.be.kind === 'demo' ? `<div class="note warn small">Preview${S.be.as ? ' as ' + esc(S.be.as) : ''} with sample data. Nothing is saved to the internet.</div>` : '');
// The label wraps its input, so screen readers and taps on the label work without ids.
export const field = (label, input, hint = '') => `<div class="field"><label><span class="lbl">${label}</span>${input}</label>${hint ? `<div class="hint">${hint}</div>` : ''}</div>`;
export const sw = (on, act, extra = '', label = '') => `<button class="sw" role="switch" aria-checked="${on}" aria-label="${esc(label)}" data-act="${act}" ${extra}><i></i></button>`;
export const num = (key, val, step = '0.5', extra = '') => `<input type="number" inputmode="decimal" min="0" step="${step}" data-set="${key}" data-type="num" value="${val === '' || val === null || val === undefined ? '' : +val}" ${extra}>`;
// Settings-style row: coloured icon tile, title, small text, chevron
export const mrow = (act, icon, color, title, sub = '', attrs = '', value = '') => `<button class="mrow" data-act="${act}" ${attrs}><span class="mi" style="background:${color}">${ico(icon, 18)}</span><span class="grow"><span class="mt">${title}</span>${sub ? `<span class="ms">${sub}</span>` : ''}</span>${value ? `<span class="mv">${value}</span>` : ''}${ico('next', 16).replace('<svg ', '<svg class="chev" ')}</button>`;

// Horizontal roller: swipe sideways, tap to pick
export const roll = (act, opts, val, attrs = '', label = '') => `<div class="hroll" role="radiogroup" aria-label="${esc(label)}">${opts.map(([v, l]) => `<button type="button" role="radio" aria-checked="${String(v) === String(val)}" class="hr ${String(v) === String(val) ? 'on' : ''}" data-act="${act}" data-v="${esc(v)}" ${attrs}>${esc(l)}</button>`).join('')}</div>`;
export const rollSet = (key, opts, val, type = '', label = '') => roll('rollSet', opts, val, `data-key="${esc(key)}" ${type ? `data-type="${type}"` : ''}`, label || key);
// Vertical wheel: swipe up and down, tap to pick
export const wheel = (act, items, sel, label, cls = '') => `<div class="wheelbox ${cls}"><div class="wsel"></div><div class="wheel" tabindex="0" role="listbox" aria-label="${esc(label)}" data-wheel="${act}" data-sel="${esc(sel)}">${items.map(([v, l]) => `<button type="button" tabindex="-1" role="option" aria-selected="${String(v) === String(sel)}" class="wi ${String(v) === String(sel) ? 'on' : ''}" data-act="wheelPick" data-w="${act}" data-v="${esc(v)}">${esc(l)}</button>`).join('')}</div></div>`;

// =====================================================================
// RENDER AND NAVIGATION
// =====================================================================
let lastKey = '', fitNow = false;
const narrow = () => window.innerWidth < 700;
const wantFit = () => S.view === 'cal' && narrow() && !!S.profile && (S.profile.layout === 'compact' || ((S.profile.layout || 'auto') === 'auto' && window.innerHeight >= 700));
const pinned = html => {
  const t = document.createElement('template');
  t.innerHTML = html;
  const bars = { tabs: '', act: '' };
  Array.from(t.content.children).forEach(el => { if (el.matches('.tabs')) { bars.tabs = el.outerHTML; el.remove(); } else if (el.matches('.actbar')) { bars.act = el.outerHTML; el.remove(); } });
  const host = document.createElement('div');
  host.appendChild(t.content);
  return { html: host.innerHTML, ...bars };
};
export function render(reset) {
  const app = $('#app');
  if (!app) return;
  const y = app.scrollTop;
  if (S.profile) { S.C = buildCtx(); S.banks = S.profile.banks || []; }
  const needsProfile = !['boot', 'login', 'config', 'fatal'].includes(S.view);
  let html;
  try {
    html = needsProfile && !S.profile ? VIEWS.boot() : (VIEWS[S.view] || VIEWS.cal)();
  } catch (e) {
    console.error(e);
    html = `<div class="note err">Something went wrong showing this screen: ${esc(e.message)}</div><button class="btn" data-act="tab" data-v="cal" style="margin-top:12px">Back to calendar</button>`;
  }
  const pin = pinned(html);
  const showTabs = !!(S.profile && S.profile.onboarded) && !NO_TABS.includes(S.view);
  const tabs = showTabs ? (pin.tabs || nav(TABOF[S.view] || 'settings')) : '';
  fitNow = wantFit();
  const cls = `${VIEWCLS[S.view] || ''} l-${(S.profile && S.profile.layout) || 'auto'}${fitNow ? ' fit' : ''}`;
  const key = `${S.view}|${cls}|${pin.html}|${pin.act}|${tabs}`;
  const ae = document.activeElement, fid = ae && ae.id && app.contains(ae) ? ae.id : '';
  let selRange = null;
  try { if (fid && ae.selectionStart != null) selRange = [ae.selectionStart, ae.selectionEnd]; } catch (e) { /* number inputs have no selection */ }
  if (!reset && key === lastKey && !S.anim) { S.slide = ''; return; }   // nothing changed: leave the screen alone
  lastKey = key;
  const keep = reset ? [] : Array.from(app.querySelectorAll('.hroll,.rotgrid,.bgrid,.tiles')).map(el => [el.scrollLeft, el.scrollTop]);
  app.innerHTML = pin.html;
  app.className = cls;
  const bars = $('#bars');
  Array.from(bars.children).forEach(el => { if (el.id !== 'toast') el.remove(); });
  bars.insertAdjacentHTML('beforeend', pin.act + tabs);
  S._reset = !!reset;
  if (!reset) Array.from(app.querySelectorAll('.hroll,.rotgrid,.bgrid,.tiles')).forEach((el, i) => { if (keep[i]) { el.scrollLeft = keep[i][0]; el.scrollTop = keep[i][1]; } });
  app.scrollTop = reset ? 0 : y;
  if (S.anim) { app.classList.add('enter-' + S.anim); S.anim = ''; }
  if (fid) { const el = document.getElementById(fid); if (el) { el.focus({ preventScroll: true }); if (selRange && el.setSelectionRange) { try { el.setSelectionRange(selRange[0], selRange[1]); } catch (e) { /* ignore */ } } } }
  S.slide = '';
  AFTER.forEach(f => { try { f(); } catch (e) { console.error(e); } });
}
export function go(view, p = {}) {
  const depth = ((history.state && history.state.depth) || 0) + 1;
  history.pushState({ view, p, depth }, '');
  S.view = view; S.p = p; S.depth = depth; S.anim = 'f'; render(true);
}
export function tab(v) {
  history.replaceState({ view: v, p: {}, depth: 0 }, '');
  S.view = v; S.p = {}; S.depth = 0; S.anim = 't'; render(true);
}
export function back() {
  if (history.state && history.state.depth > 0) history.back(); else tab('cal');
}
window.addEventListener('popstate', e => {
  const st = e.state;
  if (!st || !st.view || !S.profile || !S.profile.onboarded) return;
  S.anim = (st.depth || 0) < (S.depth || 0) ? 'b' : 'f'; S.depth = st.depth || 0;
  S.view = st.view; S.p = st.p || {};
  render(true);
});
let rz;
window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (S.profile && (wantFit() !== fitNow)) render(false); }, 150); });
setOnLoaded(() => { if (S.profile) render(false); });

// ---------- saving ----------
export function saveErr(e) {
  const c = (e && e.code) || '';
  if (c.includes('permission-denied')) return 'Not saved: publish the Firestore rules from the setup guide.';
  if (c.includes('unavailable') || navigator.onLine === false) return 'You are offline. It is kept on this phone and will sync later.';
  return 'Could not save. Please try again.';
}
export function setProfile(patch) {
  S.profile = { ...S.profile, ...patch };
  if (S.profile.onboarded && S.be) track(S.be.saveProfile(S.user.uid, patch).catch(e => toast(saveErr(e))));
  ON_CHANGE.forEach(f => f());
}
export function clean(o) { for (const k of Object.keys(o)) { const v = o[k]; if (v === undefined || v === null || v === '' || v === false) delete o[k]; } return o; }
// Change one day. Give a message and the toast offers Undo for a few seconds.
export function commitDay(date, fn, msg) {
  const prev = S.days[date] ? { ...S.days[date] } : null;
  const next = clean(fn({ ...(prev || {}) }) || {});
  const uid = S.user.uid;
  const op = Object.keys(next).length ? S.be.setDay(uid, date, next) : S.be.delDay(uid, date);
  track(op.catch(e => toast(saveErr(e))));
  if (msg) toast(msg, () => track((prev ? S.be.setDay(uid, date, prev) : S.be.delDay(uid, date)).catch(e => toast(saveErr(e)))));
}
// Many days at once, with one Undo. entries = { date: newDoc | null }
export function commitDays(entries, msg) {
  const uid = S.user.uid, prev = {};
  for (const d of Object.keys(entries)) prev[d] = S.days[d] ? { ...S.days[d] } : null;
  track(S.be.setDays(uid, entries).catch(e => toast(saveErr(e))));
  if (msg) toast(msg, () => track(S.be.setDays(uid, prev).catch(e => toast(saveErr(e)))));
}
export const TYPE_KEYS = d => { delete d.type; delete d.shiftId; delete d.hours; delete d.person; delete d.bank; delete d.splits; delete d.toBank; return d; };

// One place that applies a changed setting (typed or rolled)
export function applySet(key, raw, type) {
  const val = type === 'num' ? (raw === '' ? (key === 'carryLimit' ? '' : 0) : Math.max(0, Number(raw) || 0)) : raw;
  const patch = { [key]: val };
  if (key === 'weekStart') patch.weekStart = Number(raw);
  if (key === 'country') patch.region = defaultRegion(val);
  // old setup fields now live inside the banks
  if (key === 'vacHours' || key === 'sickHours') {
    const id = key === 'vacHours' ? 'vac' : 'sick';
    patch.banks = (S.profile.banks || []).map(b => (b.id === id ? { ...b, balance: val, asOf: E.todayIso() } : b));
    delete patch[key];
  }
  if (key === 'accrual') {
    patch.banks = (S.profile.banks || []).map(b => (b.id === 'vac' ? { ...b, earn: { rule: 'pay', amount: val } } : b));
    delete patch[key];
  }
  setProfile(patch);
  if (S.profile.onboarded) flashSaved();
  if (['country', 'region', 'payFreq', 'weekStart', 'layout', 'payWeekend'].includes(key)) render(false);
}

// ---------- rollers, wheels and swipes ----------
const WH = 36;
function initRollers() {
  if (S._reset) $$('.hroll').forEach(el => { const on = el.querySelector('.on'); if (on) el.scrollLeft = Math.max(0, on.offsetLeft - (el.clientWidth - on.offsetWidth) / 2); });
  $$('.wheel').forEach(el => { const i = Array.from(el.children).findIndex(c => c.classList.contains('on')); el.scrollTop = Math.max(0, i) * WH; });
}
AFTER.push(initRollers);
AFTER.push(() => { if (S.refocus) { const el = document.querySelector(`.wheel[data-wheel="${S.refocus}"]`); if (el) el.focus({ preventScroll: true }); S.refocus = ''; } });
let wt;
document.addEventListener('scroll', e => {
  const el = e.target;
  if (!el || !el.classList || !el.classList.contains('wheel')) return;
  clearTimeout(wt);
  wt = setTimeout(() => {
    const i = Math.max(0, Math.min(el.children.length - 1, Math.round(el.scrollTop / WH)));
    const v = el.children[i] && el.children[i].dataset.v;
    if (v !== undefined && String(v) !== String(el.dataset.sel)) { el.dataset.sel = v; if (ACT[el.dataset.wheel]) ACT[el.dataset.wheel]({ v }); }
  }, 140);
}, true);
document.addEventListener('keydown', e => {
  const el = e.target;
  if (!el || !el.classList || !el.classList.contains('wheel') || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
  e.preventDefault();
  S.refocus = el.dataset.wheel;
  const kids = Array.from(el.children), i = kids.findIndex(c => c.classList.contains('on')), j = Math.max(0, Math.min(kids.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)));
  if (j !== i && ACT[el.dataset.wheel]) ACT[el.dataset.wheel]({ v: kids[j].dataset.v });
});
let tx = null, ty = 0, tt = 0, tel = null;
document.addEventListener('touchstart', e => {
  tel = e.target.closest && e.target.closest('[data-swipe]');
  if (!tel) { tx = null; return; }
  tx = e.touches[0].clientX; ty = e.touches[0].clientY; tt = Date.now();
}, { passive: true });
document.addEventListener('touchend', e => {
  if (tx === null || !tel) return;
  const c = e.changedTouches[0], dx = c.clientX - tx, dy = c.clientY - ty, kind = tel.dataset.swipe;
  tx = null;
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5 && Date.now() - tt < 800 && SWIPE[kind]) SWIPE[kind](dx < 0 ? 1 : -1);
}, { passive: true });

// The tab bar steps aside while the keyboard is open, and the field being typed in stays in view
const coarse = window.matchMedia ? window.matchMedia('(pointer:coarse)') : { matches: false };
const isTyping = el => el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) && !['checkbox', 'radio', 'button', 'range', 'color'].includes(el.type);
document.addEventListener('focusin', e => {
  if (!coarse.matches || !isTyping(e.target)) return;
  document.body.classList.add('typing');
  setTimeout(() => { try { e.target.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (err) { /* ignore */ } }, 300);
});
document.addEventListener('focusout', () => setTimeout(() => { if (!isTyping(document.activeElement)) document.body.classList.remove('typing'); }, 120));

ACT.back = back;
ACT.tab = d => tab(d.v);
ACT.reload = () => location.reload();
ACT.rollSet = d => applySet(d.key, d.v, d.type);
ACT.wheelPick = d => { if (ACT[d.w]) ACT[d.w]({ v: d.v }); };
ACT.undo = () => {
  const f = S.undo; S.undo = null;
  const el = $('#toast'); if (el) el.classList.add('hidden');
  if (f) { buzz(); f(); flashSaved(); }
};
document.addEventListener('click', e => {
  const t = e.target.closest('[data-act]');
  if (!t || !ACT[t.dataset.act]) return;
  if (t.matches('.sw,.hr,.chip,.pc,.brush,.seg button,.daypick button')) buzz();
  ACT[t.dataset.act](t.dataset, t, e);
});

export const setProfileBanks = list => setProfile({ banks: list });
