// Shift Calendar: screens and actions. Schedule math lives in engine.js, saving in backend.js.
import * as E from './engine.js';
import { holidaysFor, REGIONS } from './holidays.js';
import { createBackend } from './backend.js';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DOWS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DOWL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const fmtMD = s => `${MON[E.parts(s).m - 1]} ${E.parts(s).d}`;
const fmtD = s => `${DOWS[E.weekday(s)]}, ${fmtMD(s)}`;
const fmtDY = s => `${fmtD(s)}, ${E.parts(s).y}`;
const fmtH = h => `${+(Number(h) || 0).toFixed(2)} h`;
const shortT = t => { const [h, m] = t.split(':').map(Number); return `${h % 12 || 12}${m ? ':' + E.pad(m) : ''}${h >= 12 ? 'p' : 'a'}`; };
const range = (a, b) => (E.parts(a).m === E.parts(b).m ? `${fmtMD(a)} to ${E.parts(b).d}` : `${fmtMD(a)} to ${fmtMD(b)}`);

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
  warn: '<path d="M12 8v5M12 16.5h.01M10.3 4.2L2.8 17.5A2 2 0 0 0 4.5 20.5h15a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0z"/>'
};
const ico = (n, s = 20) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n]}</svg>`;
const moon = (s = 11) => `<svg class="moon" viewBox="0 0 24 24" width="${s}" height="${s}" aria-hidden="true"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" fill="currentColor"/></svg>`;
const starFill = (s = 11) => `<svg class="star" viewBox="0 0 24 24" width="${s}" height="${s}" aria-hidden="true"><path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4L2.8 9.5l6.4-.8z" fill="currentColor"/></svg>`;

// ---------- colors ----------
function inkFor(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return '#fff';
  const n = parseInt(m[1], 16);
  const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const L = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  return 1.05 / (L + 0.05) > (L + 0.05) / 0.061 ? '#fff' : '#1B1B1B';
}
const bstyle = sh => `background:${esc(sh.color)};color:${inkFor(sh.color)}`;
const badge = (sh, cls = '', style = '') => `<span class="bdg ${cls}" style="${bstyle(sh)};${style}">${esc(sh.code)}</span>`;
const LV = {
  VAC: { l: 'VAC', name: 'Vacation', bg: '#CFE0F5' },
  SICK: { l: 'SICK', name: 'Sick day', bg: '#F6D9D4' },
  LIEU: { l: 'LIEU', name: 'Lieu day', bg: '#E3D5F5' },
  OFF: { l: 'OFF', name: 'Day off (requested)', bg: '#E3ECE9' }
};
const lvStyle = t => `background:${LV[t].bg};color:#14302B`;

// ---------- state ----------
const S = {
  be: null, user: null, profile: null, days: {}, view: 'boot', p: {}, C: null,
  month: null, authMode: 'login', rot: null, se: null, sw: { person: '', note: '', shiftId: '' }, bk: null,
  unsub: [], bootErr: '', seeded: false
};
const todayParts = () => { const t = E.parts(E.todayIso()); return { y: t.y, m: t.m }; };

const newProfile = () => ({
  name: '', country: 'CA', region: 'ON', showHolidays: true, customHolidays: [],
  shifts: E.DEFAULT_SHIFTS(), patterns: [],
  payFreq: 'biweekly', payAnchor: '', payWeekend: 'before',
  vacHours: 0, vacAsOf: E.todayIso(), sickHours: 0, sickAsOf: E.todayIso(),
  accrual: 0, vacYearly: 0, carryLimit: '', deadline: '', reminderMin: 120, onboarded: false
});
const normalize = p => { const n = { ...newProfile(), ...p }; if (!n.shifts || !n.shifts.length) n.shifts = E.DEFAULT_SHIFTS(); return n; };
const buildCtx = () => ({ shifts: Object.fromEntries((S.profile.shifts || []).map(s => [s.id, s])), patterns: S.profile.patterns || [], days: S.days });

// ---------- helpers on the data ----------
const hcache = {};
function holiday(date) {
  const p = S.profile;
  const c = (p.customHolidays || []).find(x => x.date === date);
  if (c) return c.name;
  if (p.showHolidays === false || !p.country) return null;
  const y = E.parts(date).y, k = `${y}|${p.country}|${p.region}`;
  return (hcache[k] || (hcache[k] = holidaysFor(y, p.country, p.region)))[date] || null;
}
function leaveCalc(type, skipDate) {
  const p = S.profile, today = E.todayIso();
  const asOf = type === 'vac' ? p.vacAsOf : p.sickAsOf;
  const base = Number(type === 'vac' ? p.vacHours : p.sickHours) || 0;
  const t = type === 'vac' ? 'VAC' : 'SICK';
  let used = 0, booked = 0;
  for (const [d, o] of Object.entries(S.days)) {
    if (o.type !== t || d <= asOf || d === skipDate) continue;
    const h = Number(o.hours) || 0;
    if (d <= today) used += h; else booked += h;
  }
  const earned = type === 'vac' && Number(p.accrual) > 0 && asOf < today ? Number(p.accrual) * E.payDates(p, E.addDays(asOf, 1), today).length : 0;
  const left = base + earned - used;
  return { left, booked, after: left - booked };
}
function lieuOwed() {
  let earned = 0, taken = 0;
  for (const o of Object.values(S.days)) { if (o.lieu) earned++; if (o.type === 'LIEU') taken++; }
  return earned - taken;
}
function nextShift() {
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
function shiftTimes(sh, date) {
  if (!E.crossesMidnight(sh)) return `${sh.start} to ${sh.end}`;
  return `${DOWS[E.weekday(date)]} ${sh.start} to ${DOWS[(E.weekday(date) + 1) % 7]} ${sh.end}`;
}
function leaveGroups() {
  const ds = Object.keys(S.days).filter(d => LV[S.days[d].type] && S.days[d].type !== 'OFF').sort();
  const out = [];
  const offBetween = (a, b) => { for (let n = E.dayNum(a) + 1; n < E.dayNum(b); n++) if (E.baseShiftId(E.fromDayNum(n), S.C.patterns)) return false; return true; };
  for (const d of ds) {
    const t = S.days[d].type, h = Number(S.days[d].hours) || 0, last = out[out.length - 1];
    if (last && last.type === t && offBetween(last.end, d)) { last.end = d; last.n++; last.hours += h; }
    else out.push({ type: t, start: d, end: d, n: 1, hours: h });
  }
  return out;
}
function timeOffIdeas() {
  const today = E.todayIso(), from = E.addDays(today, 1), to = E.addDays(today, 240);
  const runs = E.offRuns(from, to, S.C);
  if (runs.length && runs[0].start === from && !E.dayInfo(today, S.C).isWorking) runs.shift();
  const names = r => { const out = []; for (let n = E.dayNum(r.start); n <= E.dayNum(r.end); n++) { const h = holiday(E.fromDayNum(n)); if (h) out.push(h); } return out; };
  const booked = r => { let c = 0; for (let n = E.dayNum(r.start); n <= E.dayNum(r.end); n++) if (['VAC', 'SICK', 'LIEU'].includes(E.dayInfo(E.fromDayNum(n), S.C).type)) c++; return c; };
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

// ---------- small UI helpers ----------
let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg; el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 2800);
}
const top = (title, back = true, right = '') => `<div class="top">${back ? `<button class="iconbtn" data-act="back" aria-label="Back">${ico('back')}</button>` : ''}<h1 class="grow">${esc(title)}</h1>${right}</div>`;
const NAV = [['cal', 'Calendar', 'cal'], ['leave', 'Leave', 'leave'], ['up', 'Upcoming', 'list'], ['settings', 'Settings', 'gear']];
const nav = a => `<nav class="tabs" aria-label="Main">${NAV.map(([v, l, i]) => `<button data-act="tab" data-v="${v}" class="${a === v ? 'on' : ''}" ${a === v ? 'aria-current="page"' : ''}>${ico(i, 22)}${l}</button>`).join('')}</nav>`;
const demoNote = () => (S.be && S.be.kind === 'demo' ? '<div class="note warn small">Preview with sample data. Nothing is saved.</div>' : '');
// The label wraps its input, so screen readers and taps on the label work without ids.
const field = (label, input, hint = '') => `<div class="field"><label><span class="lbl">${label}</span>${input}</label>${hint ? `<div class="hint">${hint}</div>` : ''}</div>`;
const sw = (on, act, extra = '', label = '') => `<button class="sw" role="switch" aria-checked="${on}" aria-label="${esc(label)}" data-act="${act}" ${extra}><i></i></button>`;

// =====================================================================
// VIEWS
// =====================================================================
const VIEWS = {};
const VIEWCLS = { cal: 'nav', leave: 'nav', up: 'nav', settings: 'nav', setup: 'bar', rot: 'bar', shiftEdit: 'bar', swap: 'bar', book: 'bar' };

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
};

// ---------- calendar ----------
VIEWS.cal = () => {
  const C = S.C, p = S.profile, today = E.todayIso(), { y, m } = S.month;
  const first = E.ymd(y, m, 1), dim = E.daysInMonth(y, m), lead = E.weekday(first);
  const pays = new Set(E.payDates(p, first, E.ymd(y, m, dim)));
  const ti = E.dayInfo(today, C), tsh = C.shifts[ti.work], tbase = C.shifts[ti.base];
  const pos = E.rotationPosition(today, C.patterns);
  let todayCard;
  if (!C.patterns.length) {
    todayCard = `<button class="today" data-act="openRot"><span class="bdg" style="background:#fff;color:#17695A">${ico('cal', 26)}</span><span class="grow"><span style="display:block;font-size:12px;font-weight:600;color:#D4E8E3">Today · ${fmtD(today)}</span><span style="display:block;font-size:18px;font-weight:800">Set up your rotation</span><span style="display:block;font-size:12px;color:#D4E8E3">Pick your shifts so they show here</span></span></button>`;
  } else {
    const lv = LV[ti.type];
    const head = tsh ? `<span class="bdg" style="${bstyle(tsh)}">${esc(tsh.code)}</span>` : `<span class="bdg" style="background:#fff;color:#17695A;font-size:14px">${lv ? lv.l : 'OFF'}</span>`;
    const title = tsh ? `${esc(tsh.name)} · ${tsh.start} to ${tsh.end}` : lv ? lv.name : 'Day off';
    const sub = tsh ? `${fmtH(ti.hours)} paid${pos ? ` · Week ${pos.week} of ${pos.weeks}` : ''}` : (tbase && lv ? `Instead of ${esc(tbase.code)}` : 'Enjoy it');
    todayCard = `<button class="today" data-act="openDay" data-d="${today}" aria-label="Open today">${head}<span class="grow"><span style="display:block;font-size:12px;font-weight:600;color:#D4E8E3">Today · ${fmtD(today)}</span><span style="display:block;font-size:18px;font-weight:800">${title}</span><span style="display:block;font-size:12px;color:#D4E8E3">${sub}</span></span></button>`;
  }
  const v = leaveCalc('vac'), sk = leaveCalc('sick'), np = E.payDates(p, today, E.addDays(today, 70))[0];
  let cells = '';
  for (let i = 0; i < lead; i++) cells += '<span class="cell blank"></span>';
  for (let d = 1; d <= dim; d++) {
    const date = E.ymd(y, m, d), i = E.dayInfo(date, C), o = i.type;
    const prev = E.dayInfo(E.addDays(date, -1), C), psh = prev.isWorking && C.shifts[prev.work];
    const cont = psh && E.crossesMidnight(psh);
    let label = '', cls = '', st = '', aria = '';
    const wsh = C.shifts[i.work];
    if (LV[o]) { label = LV[o].l; st = lvStyle(o); cls = 'sm'; aria = LV[o].name; }
    else if (o === 'SWAP_OUT') { const b = C.shifts[i.base]; label = b ? esc(b.code) : '-'; st = b ? bstyle(b) : ''; cls = 'out dash'; aria = 'shift given away'; }
    else if (wsh) { label = esc(wsh.code); st = bstyle(wsh); if (o === 'SWAP_IN' || o === 'EXTRA') cls = 'dash'; aria = `${wsh.name} shift${o === 'SWAP_IN' ? ', picked up' : o === 'EXTRA' ? ', extra shift' : ''}`; }
    else aria = 'day off';
    const hn = holiday(date);
    const ic = [
      wsh && E.crossesMidnight(wsh) ? moon() : '',
      hn ? starFill() : '',
      pays.has(date) ? '<span>$</span>' : '',
      o === 'SWAP_OUT' || o === 'SWAP_IN' || o === 'EXTRA' ? ico('swap', 11) : '',
      o === 'OT' ? '<span>OT</span>' : ''
    ].join('');
    cells += `<button class="cell ${date === today ? 'now' : ''} ${hn ? 'hol' : ''}" data-act="openDay" data-d="${date}" aria-label="${DOWL[E.weekday(date)]} ${MONTHS[m - 1]} ${d}, ${esc(aria)}${hn ? ', ' + esc(hn) : ''}${pays.has(date) ? ', pay day' : ''}${cont ? ', previous night shift ends this morning' : ''}">
      ${cont ? `<i class="cont" style="background:${esc(psh.color)}"></i>` : ''}
      <span class="dn">${d}</span><span class="bdg ${cls}" style="${st}">${label || '&nbsp;'}</span><span class="ic">${ic}</span></button>`;
  }
  const legend = (p.shifts || []).map(s => `<span>${badge(s)}${shortT(s.start)} to ${shortT(s.end)}</span>`).join('');
  return `${demoNote()}
  <div class="stack">
    <div class="mh"><button class="link" data-act="thisMonth" style="text-decoration:none;color:var(--ink)" aria-label="Go to this month"><span style="font-size:28px;font-weight:800;letter-spacing:-.02em">${MONTHS[m - 1]}</span><span class="yr">${y}</span></button>
      <span class="row" style="gap:6px"><button class="iconbtn" data-act="month" data-n="-1" aria-label="Previous month">${ico('back')}</button><button class="iconbtn" data-act="month" data-n="1" aria-label="Next month">${ico('next')}</button></span></div>
    ${todayCard}
    <div class="stats"><div class="stat"><span>Vacation left</span><b>${fmtH(v.left)}</b></div><div class="stat"><span>Sick left</span><b>${fmtH(sk.left)}</b></div><div class="stat"><span>Next pay day</span><b>${np ? fmtMD(np) : '-'}</b></div></div>
    <div class="cal">${DOWS.map(d => `<div class="dow">${d.slice(0, 2)}</div>`).join('')}${cells}</div>
    <div class="legend">${legend}</div>
    <div class="legend"><span>${starFill()} Stat holiday</span><span><b style="color:var(--acc)">$</b> Pay day</span><span>${moon()} Night shift</span><span>${ico('swap', 11)} Swap or extra</span><span>Bar = last night's shift ends</span></div>
  </div>${nav('cal')}`;
};

// ---------- day details ----------
VIEWS.day = () => {
  const date = S.p.date, C = S.C, i = E.dayInfo(date, C), o = i.override || {}, hn = holiday(date);
  const wsh = C.shifts[i.work], bsh = C.shifts[i.base];
  const prev = E.dayInfo(E.addDays(date, -1), C), psh = prev.isWorking && C.shifts[prev.work];
  const pos = E.rotationPosition(date, C.patterns);
  const shown = wsh || (i.type === 'SWAP_OUT' ? bsh : null);
  let card;
  if (shown) {
    const extra = i.type === 'SWAP_OUT' ? `Given away${o.person ? ' to ' + esc(o.person) : ''}` : i.type === 'SWAP_IN' ? `Picked up${o.person ? ' from ' + esc(o.person) : ''}` : i.type === 'EXTRA' ? 'Extra shift' : i.type === 'OT' ? `Overtime +${fmtH(o.hours)}` : '';
    card = `<div class="card"><div class="row" style="gap:14px"><span class="bdg" style="${bstyle(shown)};width:60px;height:60px;border-radius:14px;font-size:22px">${esc(shown.code)}</span>
      <div class="grow"><div style="font-size:18px;font-weight:800">${esc(shown.name)}</div><div class="mute">${shiftTimes(shown, date)}</div></div>${E.crossesMidnight(shown) ? moon(20) : ''}</div>
      <div class="chips" style="margin-top:12px;gap:8px">${extra ? `<span class="tag" style="background:var(--soft);color:var(--soft-ink);padding:0 10px">${extra}</span>` : ''}<span class="tag" style="background:var(--soft);color:var(--soft-ink);padding:0 10px">${fmtH(i.type === 'SWAP_OUT' ? i.baseHours : i.hours)} paid</span>${pos && i.base ? `<span class="tag" style="background:var(--soft);color:var(--soft-ink);padding:0 10px">${pos.pattern.mode === 'week' ? `Week ${pos.week} · ${DOWL[E.weekday(date)]}` : `Day ${pos.index + 1} of ${pos.pattern.days.length}`}</span>` : ''}</div>
      ${E.crossesMidnight(shown) ? `<p class="hint">This shift belongs to ${fmtMD(date)}, the date it starts. It ends ${fmtMD(E.addDays(date, 1))} at ${shown.end}.</p>` : ''}</div>`;
  } else if (LV[i.type]) {
    card = `<div class="card"><div class="row" style="gap:14px"><span class="bdg" style="${lvStyle(i.type)};width:60px;height:60px;border-radius:14px;font-size:14px">${LV[i.type].l}</span><div class="grow"><div style="font-size:18px;font-weight:800">${LV[i.type].name}</div><div class="mute">${i.type === 'OFF' ? 'You asked for this day off' : `${fmtH(o.hours)} deducted`}${bsh ? ` · was ${esc(bsh.code)}` : ''}</div></div></div></div>`;
  } else {
    card = `<div class="card"><div style="font-size:18px;font-weight:800">${C.patterns.length ? 'Day off' : 'No rotation yet'}</div><div class="mute">${C.patterns.length ? 'No shift is scheduled.' : 'Set up your rotation to see shifts here.'}</div></div>`;
  }
  const A = [['VAC', 'Vacation', 'sun'], ['SICK', 'Sick', 'plus'], ['LIEU', 'Lieu day', 'star'], ['OFF', 'Request off', 'off'], ['SWAP', 'Swap shift', 'swap'], ['EXTRA', 'Extra shift', 'clock'], ['OT', 'Overtime', 'trend'], ['CLEAR', 'Clear', 'x']];
  let panel = '';
  const pn = S.p.panel;
  if (pn) {
    const isOT = pn === 'OT', existing = o.type === pn && o.hours !== undefined ? o.hours : (isOT ? 1 : i.baseHours);
    const lc = pn === 'VAC' ? leaveCalc('vac', date) : pn === 'SICK' ? leaveCalc('sick', date) : null;
    panel = `<div class="card stack"><h2>${isOT ? 'Overtime' : pn === 'VAC' ? 'Book vacation' : 'Mark sick'}</h2>
      ${field(`<span id="lh">${isOT ? 'Extra hours worked' : 'Hours to take off your balance'}</span>`, `<input id="panelHours" type="number" inputmode="decimal" min="0" step="0.25" value="${+existing}" aria-labelledby="lh">`)}
      ${lc ? `<div id="panelInfo" class="note" data-left="${lc.left}">${fmtH(existing)} comes off your balance, leaving <b>${fmtH(lc.left - existing)}</b>.</div>` : ''}
      <div class="two"><button class="btn sec" data-act="panelCancel">Cancel</button><button class="btn" data-act="panelSave">Save</button></div></div>`;
  }
  return `<div class="stack">${top(fmtDY(date))}
    ${hn ? `<div class="note hol"><b>${esc(hn)}</b> · stat holiday<br>${wsh ? 'You are scheduled to work. Premium pay or a lieu day may apply.' : 'You are not working this day.'}</div>` : ''}
    ${psh && E.crossesMidnight(psh) ? `<div class="note small">${moon(12)} Your ${esc(psh.code)} shift from ${fmtD(E.addDays(date, -1))} ends this morning at ${psh.end}.</div>` : ''}
    ${card}
    <div class="actions">${A.map(([k, l, ic]) => `<button class="act" data-act="dayAct" data-k="${k}">${ico(ic)}${l}</button>`).join('')}</div>
    ${panel}
    ${hn || o.lieu ? `<div class="card row between"><div><div style="font-weight:700">Track a lieu day</div><div class="small mute">Adds 1 lieu day to your balance</div></div>${sw(!!o.lieu, 'lieu', '', 'Track a lieu day')}</div>` : ''}
    <div><label for="dayNote">Note for this day</label><textarea id="dayNote" maxlength="500" placeholder="Add a note">${esc(o.note || '')}</textarea></div>
  </div>`;
};

// ---------- swap / extra ----------
VIEWS.swap = () => {
  const C = S.C, date = S.p.date, mode = S.p.mode, i = E.dayInfo(date, C), bsh = C.shifts[i.base];
  const shifts = S.profile.shifts;
  if (!S.sw.shiftId || !C.shifts[S.sw.shiftId]) S.sw.shiftId = shifts[0].id;
  const pick = C.shifts[S.sw.shiftId];
  const modes = [['gave', 'I gave a shift'], ['took', 'I took a shift'], ['extra', 'Extra shift']];
  let body, sum;
  if (mode === 'gave') {
    body = `<div class="field"><div class="lbl">Shift you are giving away</div>${bsh
      ? `<div class="card row" style="background:var(--bg)">${badge(bsh, '', 'width:44px;height:40px')}<div class="grow"><b>${fmtD(date)}</b><div class="small mute">${bsh.start} to ${bsh.end} · ${fmtH(i.baseHours)}</div></div></div>`
      : '<div class="note warn">You are not scheduled to work on this date. Pick another date.</div>'}</div>
      ${field('<span id="l3">Given to</span>', `<input id="swPerson" type="text" maxlength="100" value="${esc(S.sw.person)}" aria-labelledby="l3">`)}`;
    sum = bsh ? `Hours: <b>−${fmtH(i.baseHours)}</b>. ${fmtMD(date)} will show a swap marker.` : '';
  } else {
    body = `<div class="field"><div class="lbl">Shift</div><div class="chips">${shifts.map(s => `<button class="brush ${s.id === S.sw.shiftId ? 'on' : ''}" data-act="swShift" data-id="${esc(s.id)}" style="${bstyle(s)};border:0">${esc(s.code)}</button>`).join('')}</div>
      <div class="hint">${esc(pick.name)} · ${pick.start} to ${pick.end} · ${fmtH(E.paidHours(pick))} paid</div></div>
      ${mode === 'took' ? field('<span id="l3">Picked up from</span>', `<input id="swPerson" type="text" maxlength="100" value="${esc(S.sw.person)}" aria-labelledby="l3">`) : ''}`;
    sum = `Hours: <b>+${fmtH(E.paidHours(pick))}</b>${i.isWorking ? `. You already work a ${esc(C.shifts[i.work]?.code || '')} shift on this date, this replaces it.` : '.'}`;
  }
  const hist = Object.entries(S.days).filter(([, o]) => ['SWAP_OUT', 'SWAP_IN', 'EXTRA'].includes(o.type)).sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 20);
  return `<div class="stack">${top('Swap or extra shift')}
    <div class="seg" style="grid-template-columns:repeat(3,1fr)">${modes.map(([k, l]) => `<button data-act="swMode" data-k="${k}" class="${mode === k ? 'on' : ''}">${l}</button>`).join('')}</div>
    <div class="card">${field('<span id="l4">Date</span>', `<input id="swDate" type="date" value="${date}" aria-labelledby="l4">`)}${body}${field('<span id="l5">Note (optional)</span>', `<input id="swNote" type="text" maxlength="200" value="${esc(S.sw.note)}" placeholder="Paying back on Dec 19" aria-labelledby="l5">`)}</div>
    ${sum ? `<div class="note">${sum}</div>` : ''}
    <h2>Swap history</h2>
    <div class="card tight">${hist.length ? hist.map(([d, o]) => { const sh = C.shifts[o.shiftId]; return `<button class="item" data-act="openDay" data-d="${d}">${sh ? badge(sh, '', 'min-width:38px;height:30px;font-size:12px') : '<span class="tag" style="background:var(--track)">?</span>'}<span class="grow"><span class="t" style="display:block">${o.type === 'SWAP_OUT' ? 'Given' + (o.person ? ' to ' + esc(o.person) : '') : o.type === 'SWAP_IN' ? 'Picked up' + (o.person ? ' from ' + esc(o.person) : '') : 'Extra shift'}</span><span class="s">${fmtDY(d)}</span></span><b>${o.type === 'SWAP_OUT' ? '−' : '+'}${fmtH(o.hours)}</b></button>`; }).join('') : '<p class="mute" style="padding:16px 0">No swaps yet. Swaps and extra shifts you save appear here.</p>'}</div>
  </div>
  <div class="actbar"><button class="btn" data-act="swSave">Save</button></div>`;
};

// ---------- rotation builder ----------
const blankDraft = () => ({ mode: 'week', weeks: 2, days: Array(14).fill(''), anchorInput: '', brush: S.profile.shifts[0].id, id: '', isNew: false, err: '' });
const draftFrom = p => ({ mode: p.mode, weeks: Math.ceil(p.days.length / 7), days: [...p.days], anchorInput: p.anchor, brush: S.profile.shifts[0].id, id: p.id, isNew: false, err: '' });
function initRot() {
  const list = S.profile.patterns || [];
  const cur = E.patternFor(E.todayIso(), list) || list[list.length - 1];
  S.rot = cur ? draftFrom(cur) : blankDraft();
}
const alignedAnchor = r => (!r.anchorInput ? '' : r.mode === 'week' ? E.alignToSunday(r.anchorInput) : r.anchorInput);
function resizeDays(r, n) { while (r.days.length < n) r.days.push(''); r.days.length = n; }

function rotEditor() {
  const r = S.rot, shifts = S.profile.shifts, byId = Object.fromEntries(shifts.map(s => [s.id, s]));
  const cellBtn = (code, i) => {
    const sh = byId[code];
    return `<button class="pc" data-act="rotCell" data-i="${i}" aria-label="${r.mode === 'week' ? `Week ${Math.floor(i / 7) + 1} ${DOWL[i % 7]}` : `Day ${i + 1}`}, ${sh ? esc(sh.name) : 'off'}" style="${sh ? bstyle(sh) + ';border:0' : ''}">${sh ? esc(sh.code) : 'Off'}</button>`;
  };
  let grid = '';
  if (r.mode === 'week') {
    grid += `<div class="wk"><span></span>${DOWS.map(d => `<span style="text-align:center">${d.slice(0, 2)}</span>`).join('')}</div>`;
    for (let w = 0; w < r.days.length / 7; w++) grid += `<div class="wk"><span>Week ${w + 1}</span>${r.days.slice(w * 7, w * 7 + 7).map((c, k) => cellBtn(c, w * 7 + k)).join('')}</div>`;
  } else {
    for (let s = 0; s < r.days.length; s += 7) {
      const part = r.days.slice(s, s + 7);
      grid += `<div class="wk"><span>Day ${s + 1}</span>${part.map((c, k) => cellBtn(c, s + k)).join('')}${'<span></span>'.repeat(7 - part.length)}</div>`;
    }
  }
  const anchor = alignedAnchor(r);
  let prev = '';
  if (anchor) {
    const tmp = [{ anchor, effectiveFrom: '1900-01-01', days: r.days }], start = E.alignToSunday(E.todayIso());
    prev = `<div><h2 style="margin-bottom:6px">Preview, next 4 weeks</h2><div class="stack" style="gap:4px"><div class="wk"><span></span>${DOWS.map(d => `<span style="text-align:center">${d.slice(0, 2)}</span>`).join('')}</div>${[0, 1, 2, 3].map(w => {
      const ws = E.addDays(start, w * 7);
      return `<div class="wk" style="margin:0"><span>${fmtMD(ws)}</span>${[0, 1, 2, 3, 4, 5, 6].map(k => { const sh = byId[E.baseShiftId(E.addDays(ws, k), tmp)]; return `<span class="pv" style="${sh ? bstyle(sh) : ''}">${sh ? esc(sh.code) : ''}</span>`; }).join('')}</div>`;
    }).join('')}</div></div>`;
  } else prev = '<p class="hint">Choose the start date to see a preview.</p>';
  return `<div class="stack">
    <div><div class="lbl">Repeats every</div><div class="chips">${[1, 2, 3, 4, 6].map(n => `<button class="chip ${r.mode === 'week' && r.weeks === n ? 'on' : ''}" data-act="rotWeeks" data-n="${n}">${n} wk${n > 1 ? 's' : ''}</button>`).join('')}<button class="chip ${r.mode === 'cycle' ? 'on' : ''}" data-act="rotCycleMode">Day cycle</button></div></div>
    ${r.mode === 'cycle' ? `<div class="row"><span class="lbl" style="margin:0">Days in the cycle</span><button class="iconbtn" data-act="rotCycle" data-n="-1" aria-label="One day shorter">${ico('off')}</button><b style="min-width:28px;text-align:center">${r.days.length}</b><button class="iconbtn" data-act="rotCycle" data-n="1" aria-label="One day longer">${ico('plus')}</button></div>` : ''}
    <div><div class="lbl">Pick a shift, then tap days to paint</div><div class="row wrap" style="gap:6px"><button class="brush ${!r.brush ? 'on' : ''}" data-act="rotBrush" data-id="">Off</button>${shifts.map(s => `<button class="brush ${r.brush === s.id ? 'on' : ''}" data-act="rotBrush" data-id="${esc(s.id)}" style="${bstyle(s)};border:0">${esc(s.code)}</button>`).join('')}</div></div>
    <div class="card">${grid}</div>
    <div class="chips"><button class="chip" data-act="rotTpl" data-k="pitman">2-2-3 (14 days)</button><button class="chip" data-act="rotTpl" data-k="4on4off">4 on, 4 off</button>${r.mode === 'week' && r.weeks > 1 ? '<button class="chip" data-act="rotTpl" data-k="copy">Copy Week 1 to all</button>' : ''}<button class="chip" data-act="rotTpl" data-k="clear">Clear all</button></div>
    <div class="card">${field(`<span id="l6">${r.mode === 'week' ? 'Week 1 starts' : 'Day 1 of the cycle is'}</span>`, `<input id="rotAnchor" type="date" value="${esc(r.anchorInput)}" aria-labelledby="l6">`,
      r.mode === 'week' ? (anchor ? `Pick any date in your Week 1. We use the Sunday of that week: <b>${fmtDY(anchor)}</b>.` : 'Pick any date that falls inside your Week 1.') : 'Pick the date your first day of the cycle falls on.')}
      ${r.isNew && anchor ? `<p class="hint">The new schedule starts on ${fmtDY(anchor)}. Earlier dates keep your old schedule.</p>` : ''}</div>
    ${r.err ? `<div class="note err" role="alert">${esc(r.err)}</div>` : ''}
    ${prev}</div>`;
}
function validateRot(r) {
  if (!r.anchorInput) return 'Choose the date your rotation starts.';
  if (!r.days.some(Boolean)) return 'Paint at least one working day.';
  return '';
}
function commitRotation() {
  const r = S.rot, err = validateRot(r);
  if (err) { r.err = err; render(false); return false; }
  const anchor = alignedAnchor(r), list = [...(S.profile.patterns || [])];
  const idx = r.id ? list.findIndex(p => p.id === r.id) : -1;
  const pat = { id: r.id || 'p' + Date.now().toString(36), mode: r.mode, anchor, days: [...r.days],
    effectiveFrom: idx >= 0 ? list[idx].effectiveFrom : (list.length ? anchor : '1900-01-01') };
  if (idx >= 0) list[idx] = pat; else list.push(pat);
  list.sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? -1 : 1));
  setProfile({ patterns: list });
  r.id = pat.id; r.isNew = false;
  return true;
}
VIEWS.rot = () => {
  if (!S.rot) initRot();
  const list = S.profile.patterns || [];
  const sched = list.length > 1 ? `<div><h2 style="margin-bottom:6px">Your schedules</h2><div class="card tight">${list.map(p => `<div class="item"><span class="grow"><span class="t" style="display:block">${p.effectiveFrom < '1901' ? 'First schedule' : 'From ' + fmtDY(p.effectiveFrom)}${S.rot.id === p.id ? ' (editing)' : ''}</span><span class="s">${p.mode === 'week' ? p.days.length / 7 + '-week rotation' : p.days.length + '-day cycle'}</span></span><button class="link" data-act="rotEdit" data-id="${esc(p.id)}">Edit</button><button class="link" data-act="rotDel" data-id="${esc(p.id)}" style="color:var(--err)">Delete</button></div>`).join('')}</div></div>` : '';
  return `<div class="stack">${top('Rotation')}
    <p class="mute">Paint your repeating schedule. We work out every future day from it.</p>
    ${sched}${rotEditor()}
    <button class="btn sec" data-act="rotNew">My employer gave me a new schedule</button></div>
  <div class="actbar"><button class="btn" data-act="rotSave">Save rotation</button></div>`;
};

// ---------- shifts ----------
VIEWS.shifts = () => `<div class="stack">${top('Shift library')}
  <p class="mute">These are the shifts you can paint into your rotation. Codes can be up to 3 characters and must be different from each other.</p>
  <div class="stack" style="gap:8px">${S.profile.shifts.map(s => `<button class="card row" data-act="seOpen" data-id="${esc(s.id)}" style="text-align:left;width:100%">${badge(s, '', 'flex:none;width:52px;height:44px;border-radius:11px;font-size:16px')}<span class="grow"><b style="display:block;font-size:15px">${esc(s.name)}</b><span class="small mute" style="display:block">${s.start} to ${s.end}${E.crossesMidnight(s) ? ' (next day)' : ''}</span><span class="small mute">${fmtH(E.paidHours(s))} paid · ${+s.brk || 0} min unpaid break</span></span>${E.crossesMidnight(s) ? moon(16) : ''}${ico('next', 18)}</button>`).join('')}</div>
  <button class="btn dash" data-act="seNew">${ico('plus', 18)} Add a shift</button>
  <div class="note">A night shift belongs to the day it starts. A PM on Monday shows on Monday and ends Tuesday at 07:00. Changing a code updates every day that uses it.</div></div>`;

const SWATCH = ['#F2B705', '#25327A', '#17785A', '#E0782B', '#6B44A8', '#C0392B', '#0E7490', '#BE185D', '#4D7C0F', '#475569'];
VIEWS.shiftEdit = () => {
  const s = S.se, paid = E.paidHours({ start: s.start || '00:00', end: s.end || '00:00', brk: s.brk });
  return `<div class="stack">${top(s.id ? 'Edit shift' : 'New shift')}
    <div class="card">
      <div class="two">${field('<span id="s1">Name</span>', `<input id="seName" type="text" maxlength="40" value="${esc(s.name)}" aria-labelledby="s1">`)}${field('<span id="s2">Code (up to 3)</span>', `<input id="seCode" type="text" maxlength="3" value="${esc(s.code)}" autocapitalize="characters" aria-labelledby="s2">`)}</div>
      <div class="two">${field('<span id="s3">Starts</span>', `<input id="seStart" type="time" value="${esc(s.start)}" aria-labelledby="s3">`)}${field('<span id="s4">Ends</span>', `<input id="seEnd" type="time" value="${esc(s.end)}" aria-labelledby="s4">`)}</div>
      ${field('<span id="s5">Unpaid break (minutes)</span>', `<input id="seBrk" type="number" inputmode="numeric" min="0" max="240" value="${+s.brk || 0}" aria-labelledby="s5">`)}
      <div class="field"><div class="lbl">Color</div><div class="chips">${SWATCH.map(c => `<button class="brush ${c.toLowerCase() === String(s.color).toLowerCase() ? 'on' : ''}" data-act="seColor" data-c="${c}" aria-label="Color ${c}" style="background:${c};border:0;flex:none;min-width:44px"></button>`).join('')}<input id="seColor" type="color" value="${esc(s.color)}" aria-label="Custom color"></div></div>
      <div id="sePaid" class="note">${fmtH(paid)} paid${E.crossesMidnight({ start: s.start || '00:00', end: s.end || '00:00' }) ? ' · ends the next day' : ''}</div>
    </div>
    ${s.err ? `<div class="note err" role="alert">${esc(s.err)}</div>` : ''}
    ${s.id ? '<button class="btn danger" data-act="seDel">Delete this shift</button>' : ''}</div>
  <div class="actbar"><button class="btn" data-act="seSave">Save shift</button></div>`;
};

// ---------- leave ----------
VIEWS.leave = () => {
  const p = S.profile, today = E.todayIso(), v = leaveCalc('vac'), sk = leaveCalc('sick'), lieu = lieuOwed();
  const yearly = Number(p.vacYearly) || 0;
  // use-it-or-lose-it warning
  let warn = '';
  if (p.deadline && p.carryLimit !== '' && p.carryLimit !== null) {
    const md = p.deadline.slice(5);
    let dl = `${E.parts(today).y}-${md}`;
    if (dl < today) dl = `${E.parts(today).y + 1}-${md}`;
    let booked = 0;
    for (const [d, o] of Object.entries(S.days)) if (o.type === 'VAC' && d > today && d <= dl) booked += Number(o.hours) || 0;
    const earn = Number(p.accrual) > 0 ? Number(p.accrual) * E.payDates(p, E.addDays(today, 1), dl).length : 0;
    const excess = v.left + earn - booked - Number(p.carryLimit || 0);
    if (excess > 0.01) warn = `<div class="note warn row" style="align-items:flex-start"><span style="flex:none;margin-top:1px">${ico('warn', 18)}</span><span><b>Use ${fmtH(excess)} by ${fmtDY(dl)}</b> or it does not carry over (limit ${fmtH(p.carryLimit)}).</span></div>`;
  }
  const rows = leaveGroups().sort((a, b) => (a.start < b.start ? 1 : -1)).slice(0, 14);
  return `${demoNote()}<div class="stack"><div class="top"><h1>Leave</h1></div>
    <div class="card"><div class="row between" style="align-items:baseline"><b class="mute">Vacation</b>${yearly ? `<span class="small mute">of ${fmtH(yearly)} this year</span>` : ''}</div>
      <div class="big">${fmtH(v.left)}</div>
      ${yearly ? `<div class="bar2" style="margin-top:8px"><i style="width:${Math.max(0, Math.min(100, v.left / yearly * 100))}%"></i></div>` : ''}
      <div class="row between small mute" style="margin-top:8px"><span>${Number(p.accrual) > 0 ? `+${fmtH(p.accrual)} each pay period` : 'Add what you earn per pay in Settings'}</span><span>${v.booked ? `<b style="color:var(--ink)">${fmtH(v.after)}</b> after booked time` : ''}</span></div></div>
    <div class="two"><div class="card"><b class="mute">Sick</b><div style="font-size:26px;font-weight:800">${fmtH(sk.left)}</div>${sk.booked ? `<div class="small mute">${fmtH(sk.after)} after booked</div>` : ''}</div>
      <div class="card"><b class="mute">Lieu days owed</b><div style="font-size:26px;font-weight:800">${lieu} day${lieu === 1 ? '' : 's'}</div></div></div>
    ${warn}
    <h2>Time off</h2>
    <div class="card tight">${rows.length ? rows.map(g => `<button class="item" data-act="openDay" data-d="${g.start}"><span class="tag" style="${lvStyle(g.type)};min-width:44px;height:30px">${LV[g.type].l}</span><span class="grow"><span class="t" style="display:block">${g.start === g.end ? fmtDY(g.start) : range(g.start, g.end)}</span><span class="s">${LV[g.type].name} · ${g.end > today ? 'booked' : 'taken'} · ${g.n} shift${g.n === 1 ? '' : 's'}</span></span><b>−${fmtH(g.hours)}</b></button>`).join('') : '<p class="mute" style="padding:16px 0">Nothing booked yet. Tap a day on the calendar, or use Book time off.</p>'}</div>
    <button class="btn" data-act="bookOpen">Book time off</button></div>${nav('leave')}`;
};

VIEWS.book = () => {
  const b = S.bk, C = S.C, dates = [];
  if (b.from && b.to && b.to >= b.from) for (let n = E.dayNum(b.from); n <= E.dayNum(b.to) && dates.length < 60; n++) { const d = E.fromDayNum(n), i = E.dayInfo(d, C); if (i.base) dates.push({ d, h: i.baseHours }); }
  const total = dates.reduce((a, x) => a + x.h, 0), lc = b.type === 'VAC' ? leaveCalc('vac') : b.type === 'SICK' ? leaveCalc('sick') : null;
  const types = [['VAC', 'Vacation'], ['SICK', 'Sick'], ['LIEU', 'Lieu day']];
  return `<div class="stack">${top('Book time off')}
    <div class="seg" style="grid-template-columns:repeat(3,1fr)">${types.map(([k, l]) => `<button data-act="bkType" data-k="${k}" class="${b.type === k ? 'on' : ''}">${l}</button>`).join('')}</div>
    <div class="card two">${field('<span id="b1">First day</span>', `<input id="bkFrom" type="date" value="${b.from}" aria-labelledby="b1">`)}${field('<span id="b2">Last day</span>', `<input id="bkTo" type="date" value="${b.to}" aria-labelledby="b2">`)}</div>
    <div class="note">${b.to < b.from ? 'The last day must be on or after the first day.' : dates.length ? `<b>${dates.length} working shift${dates.length === 1 ? '' : 's'}</b> in this range${b.type === 'LIEU' ? '.' : `, <b>${fmtH(total)}</b> off your balance${lc ? `, leaving <b>${fmtH(lc.after - total)}</b>` : ''}.`}<br>Days you are already off are skipped.` : 'You are off on every day in this range, so there is nothing to book.'}</div></div>
  <div class="actbar"><button class="btn" data-act="bkSave" ${dates.length ? '' : 'disabled'}>Book ${dates.length || ''} day${dates.length === 1 ? '' : 's'}</button></div>`;
};

// ---------- upcoming ----------
VIEWS.up = () => {
  const C = S.C, today = E.todayIso(), p = S.profile, ns = nextShift(), pays = E.payDates(p, today, E.addDays(today, 70));
  const { lw, tips } = timeOffIdeas();
  const ev = [];
  for (let n = 0; n < 60; n++) {
    const d = E.addDays(today, n), hn = holiday(d), i = E.dayInfo(d, C);
    if (hn) ev.push({ d, t: hn, s: i.isWorking ? `You work: ${esc(C.shifts[i.work]?.code || '')}${C.shifts[i.work] ? ' · premium pay may apply' : ''}` : 'Day off', tag: 'HOL', bg: '#FFE3D3' });
    if (pays.includes(d)) ev.push({ d, t: 'Pay day', s: { weekly: 'Every week', biweekly: 'Every 2 weeks', semimonthly: 'Twice a month', monthly: 'Monthly' }[p.payFreq] || '', tag: 'PAY', bg: '#DCEEE9' });
  }
  for (const g of leaveGroups()) if (g.end >= today && g.start <= E.addDays(today, 60)) ev.push({ d: g.start < today ? today : g.start, t: `${LV[g.type].name}, ${g.n} shift${g.n === 1 ? '' : 's'}`, s: `${range(g.start, g.end)} · ${fmtH(g.hours)}`, tag: LV[g.type].l, bg: LV[g.type].bg });
  ev.sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0));
  const lwCard = lw
    ? `<div class="today" style="display:block"><div class="small" style="font-weight:700;color:#D4E8E3">Next long weekend</div><div style="font-size:20px;font-weight:800;margin-top:2px">${range(lw.start, lw.end)} · ${lw.len} days off</div><div style="font-size:13px;line-height:1.45;color:#D4E8E3;margin-top:4px">${lw.names.length ? `Includes ${lw.names.map(esc).join(' and ')}. ` : ''}${lw.booked ? `Includes ${lw.booked} day${lw.booked === 1 ? '' : 's'} of time off you have already booked.` : 'You do not work any of these days, so no vacation hours are needed.'}</div></div>`
    : `<div class="card"><b>No long weekend found</b><div class="small mute">${C.patterns.length ? 'Nothing of 3 or more days off in the next 8 months.' : 'Set up your rotation to find long weekends.'}</div></div>`;
  return `${demoNote()}<div class="stack"><div class="top"><h1>Upcoming</h1></div>
    ${lwCard}
    ${tips.map(t => `<div class="note"><b>Make it longer:</b> take ${t.gap} shift${t.gap > 1 ? 's' : ''} off (${fmtH(t.hours)}) to get <b>${t.len} days off in a row</b>, ${range(t.start, t.end)}.</div>`).join('')}
    <div class="two"><div class="card"><span class="small mute" style="font-weight:700">Next shift</span><div style="font-size:18px;font-weight:800;margin-top:2px">${ns ? `${ns.date === today ? 'Today' : fmtD(ns.date)} · ${esc(ns.sh.code)}` : 'None'}</div><div class="small mute">${ns ? `${ns.sh.start} to ${ns.sh.end}` : 'Set up your rotation'}</div></div>
      <div class="card"><span class="small mute" style="font-weight:700">Next pay day</span><div style="font-size:18px;font-weight:800;margin-top:2px">${pays[0] ? fmtD(pays[0]) : 'Not set'}</div><div class="small mute">${pays[0] ? (E.diffDays(today, pays[0]) === 0 ? 'Today' : `In ${E.diffDays(today, pays[0])} days`) : 'Add it in Settings'}</div></div></div>
    <h2>Coming up</h2>
    <div class="card tight">${ev.length ? ev.slice(0, 10).map(e => `<button class="item" data-act="openDay" data-d="${e.d}"><span style="flex:none;width:44px;text-align:center"><span class="small mute" style="font-weight:700;display:block">${MON[E.parts(e.d).m - 1].toUpperCase()}</span><b style="font-size:20px;line-height:1.1">${E.parts(e.d).d}</b></span><span class="grow"><span class="t" style="display:block">${esc(e.t)}</span><span class="s">${e.s}</span></span><span class="tag" style="background:${e.bg}">${e.tag}</span></button>`).join('') : '<p class="mute" style="padding:16px 0">Nothing coming up in the next 60 days.</p>'}</div></div>${nav('up')}`;
};

// ---------- settings ----------
const sel = (key, opts, val, type = '') => `<select data-set="${key}" ${type ? `data-type="${type}"` : ''} aria-label="${esc(key)}">${opts.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(val) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
const num = (key, val, step = '0.5', extra = '') => `<input type="number" inputmode="decimal" min="0" step="${step}" data-set="${key}" data-type="num" value="${val === '' || val === null || val === undefined ? '' : +val}" ${extra}>`;
let deferredInstall = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; if (S.view === 'settings') render(false); });
const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;

VIEWS.settings = () => {
  const p = S.profile, f = p.payFreq, regions = REGIONS[p.country] || [];
  const group = (title, body) => `<div><h2 class="mute" style="margin:6px 2px 6px">${title}</h2><div class="card">${body}</div></div>`;
  const links = (a, b, c) => `<button class="item" data-act="${a}"><span class="grow"><span class="t" style="display:block">${b}</span><span class="s">${c}</span></span>${ico('next', 18)}</button>`;
  const cur = E.patternFor(E.todayIso(), p.patterns) || (p.patterns || [])[p.patterns.length - 1];
  return `${demoNote()}<div class="stack"><div class="top"><h1>Settings</h1></div>
    <div class="card row"><span class="bdg" style="width:52px;height:52px;border-radius:26px;background:var(--acc);color:var(--acc-ink);font-size:20px">${esc((p.name || S.user.email || '?').trim()[0]?.toUpperCase() || '?')}</span><div class="grow"><b style="font-size:16px">${esc(p.name || 'Your name')}</b><div class="small mute" style="overflow-wrap:anywhere">${esc(S.user.email)}</div></div><button class="btn sec" style="width:auto;min-height:44px" data-act="signOut">Log out</button></div>
    ${standalone() ? '' : `<div class="note">${deferredInstall ? '<button class="btn" data-act="install">Install on this phone</button>' : 'To install: in Chrome tap the menu (three dots), then <b>Install app</b> or <b>Add to Home screen</b>.'}</div>`}
    ${group('My schedule', `<div class="card tight" style="border:0;padding:0">${links('openRot', 'Rotation', cur ? (cur.mode === 'week' ? cur.days.length / 7 + '-week rotation' : cur.days.length + '-day cycle') + ' · starts ' + fmtMD(cur.anchor) : 'Not set up yet')}${links('shiftsOpen', 'Shift library', p.shifts.map(s => esc(s.code)).join(', '))}</div>
      <div style="height:12px"></div>${field('Your name', `<input type="text" data-set="name" maxlength="60" value="${esc(p.name)}">`)}
      ${field('Country', sel('country', [['', 'None'], ['CA', 'Canada'], ['US', 'United States']], p.country))}
      ${regions.length > 1 ? field('Province', sel('region', regions.map(r => [r.id, r.name]), p.region)) : ''}
      <div class="row between" style="margin-bottom:14px"><div><b>Show stat holidays</b><div class="small mute">Marks the day and whether you work it</div></div>${sw(p.showHolidays !== false, 'toggleHol', '', 'Show stat holidays')}</div>
      <div class="lbl">Your own holidays</div>
      ${(p.customHolidays || []).map((h, k) => `<div class="row between" style="min-height:44px"><span>${fmtDY(h.date)} · ${esc(h.name)}</span><button class="link" data-act="delHol" data-k="${k}" style="color:var(--err)">Remove</button></div>`).join('')}
      <div class="two" style="margin-top:6px"><input id="chDate" type="date" aria-label="Holiday date"><input id="chName" type="text" maxlength="40" placeholder="Holiday name" aria-label="Holiday name"></div>
      <button class="btn sec" data-act="addHol" style="margin-top:8px;min-height:44px">Add holiday</button>
      <p class="hint">Holiday lists are calculated for you. Check them against your employer's list and add anything missing.</p>`)}
    ${group('Pay and leave', `${field('Pay frequency', sel('payFreq', [['weekly', 'Weekly'], ['biweekly', 'Every 2 weeks'], ['semimonthly', 'Twice a month (15th and last day)'], ['monthly', 'Monthly']], f))}
      ${field(f === 'monthly' ? 'A pay date (its day repeats each month)' : 'A pay date you know', `<input type="date" data-set="payAnchor" value="${esc(p.payAnchor)}">`, f === 'semimonthly' ? 'Not needed for twice a month.' : '')}
      ${f === 'semimonthly' || f === 'monthly' ? field('If pay day is on a weekend', sel('payWeekend', [['before', 'Paid the Friday before'], ['none', 'Keep the weekend date']], p.payWeekend)) : ''}
      <div class="two">${field('Vacation hours left', num('vacHours', p.vacHours))}${field('Sick hours left', num('sickHours', p.sickHours))}</div>
      <p class="hint" style="margin:-6px 0 14px">Balances count from the day you save them. Time you book after that is subtracted for you.</p>
      ${field('Vacation earned each pay period (hours)', num('accrual', p.accrual, '0.01'))}
      ${field('Vacation hours per year (optional)', num('vacYearly', p.vacYearly))}
      <div class="two">${field('Most hours you can carry over', num('carryLimit', p.carryLimit, '0.5'))}${field('Year-end deadline', `<input type="date" data-set="deadline" value="${esc(p.deadline)}">`)}</div>
      <p class="hint" style="margin:-6px 0 0">Optional. Fill both to get a use-it-or-lose-it warning on the Leave tab.</p>`)}
    ${group('Calendar export and reminders', `<p class="mute" style="margin-bottom:12px">Download your next 12 months of shifts and add them to Google Calendar or your phone calendar. Your calendar app sends the reminders.</p>
      ${field('Remind me before each shift', sel('reminderMin', [[0, 'No reminder'], [30, '30 minutes'], [60, '1 hour'], [120, '2 hours'], [720, '12 hours']], p.reminderMin, 'num'))}
      <button class="btn" data-act="exportIcs">Download calendar file (.ics)</button>`)}
    ${group('Your data', `<p class="mute" style="margin-bottom:12px">Your schedule is saved to your account, and also kept on this phone so the app works offline.</p>
      <div class="stack"><button class="btn danger" data-act="wipe">Delete all my data</button><button class="btn danger" data-act="delAccount">Delete my account</button></div>`)}
    <p class="small mute" style="text-align:center">Shift Calendar · version 1.0</p></div>${nav('settings')}`;
};

// ---------- first-time setup ----------
VIEWS.setup = () => {
  const st = S.setup.step, p = S.profile, labels = ['Where', 'Rotation', 'Pay and leave', 'Done'];
  let body = '';
  if (st === 1) {
    const regions = REGIONS[p.country] || [];
    body = `<h1>Where do you work?</h1><p class="mute">We use this to show your statutory holidays.</p>
      <div class="card">${field('Your name', `<input type="text" data-set="name" maxlength="60" value="${esc(p.name)}" autocomplete="name">`)}
      ${field('Country', sel('country', [['', 'None'], ['CA', 'Canada'], ['US', 'United States']], p.country))}
      ${regions.length > 1 ? field('Province', sel('region', regions.map(r => [r.id, r.name]), p.region), 'Not listed? Choose the federal list and add your own holidays later in Settings.') : ''}</div>`;
  } else if (st === 2) {
    if (!S.rot) initRot();
    body = `<h1>Your rotation</h1><p class="mute">Paint the shifts you work. It repeats on its own, so you only do this once.</p>${rotEditor()}`;
  } else if (st === 3) {
    const f = p.payFreq;
    body = `<h1>How do you get paid?</h1><p class="mute">We use this to mark pay days and track your leave.</p>
      <div class="card"><div class="field"><div class="lbl">Pay frequency</div><div class="chips">${[['weekly', 'Weekly'], ['biweekly', 'Every 2 weeks'], ['semimonthly', 'Twice a month'], ['monthly', 'Monthly']].map(([k, l]) => `<button class="chip ${f === k ? 'on' : ''}" data-act="payFreq" data-k="${k}">${l}</button>`).join('')}</div></div>
      ${f === 'semimonthly' ? '<p class="hint" style="margin-top:-6px">Pay days are the 15th and the last day of each month.</p>' : field(f === 'monthly' ? 'A pay date (its day repeats each month)' : 'A pay date you know', `<input type="date" data-set="payAnchor" value="${esc(p.payAnchor)}">`, 'Every pay day is counted from this date.')}
      <div class="two">${field('Vacation hours left', num('vacHours', p.vacHours))}${field('Sick hours left', num('sickHours', p.sickHours))}</div>
      <p class="hint" style="margin:-6px 0 14px">Find these on your latest pay stub. You can change them anytime.</p>
      ${field('Vacation earned each pay period (optional)', num('accrual', p.accrual, '0.01'))}</div>
      ${S.setup.err ? `<div class="note err" role="alert">${esc(S.setup.err)}</div>` : ''}`;
  } else {
    const ns = nextShift();
    body = `<h1>You are all set</h1><p class="mute">Here is what we saved. You can change anything later in Settings.</p>
      <div class="card tight">${[['Rotation', S.C.patterns.length ? 'Starts ' + fmtDY(S.C.patterns[0].anchor) : 'Not set'], ['Holidays', p.country ? (REGIONS[p.country].find(r => r.id === p.region)?.name || p.country) : 'None'], ['Next shift', ns ? `${fmtD(ns.date)} · ${esc(ns.sh.code)}` : 'None yet'], ['Vacation / sick', `${fmtH(p.vacHours)} / ${fmtH(p.sickHours)}`]].map(([a, b]) => `<div class="item" style="min-height:52px"><span class="grow t">${a}</span><span class="mute">${b}</span></div>`).join('')}</div>
      <div class="note">Tip: install this app from your browser menu so it opens like any other app. In Settings you can download your shifts to Google Calendar for reminders.</div>`;
  }
  return `<div class="stack"><div class="top">${st > 1 ? `<button class="iconbtn" data-act="setupBack" aria-label="Back">${ico('back')}</button>` : ''}<b class="mute">Step ${st} of 4</b></div>
    <div class="steps">${[1, 2, 3, 4].map(n => `<i class="${n <= st ? 'on' : ''}"></i>`).join('')}</div>
    <div class="row between small mute" style="font-weight:600">${labels.map((l, k) => `<span ${k + 1 === st ? 'style="color:var(--acc);font-weight:800"' : ''}>${l}</span>`).join('')}</div>
    ${body}</div>
  <div class="actbar"><button class="btn" data-act="setupNext">${st === 4 ? 'Open my calendar' : 'Continue'}</button></div>`;
};

// =====================================================================
// RENDER
// =====================================================================
function render(reset) {
  const y = window.scrollY;
  if (S.profile) S.C = buildCtx();
  const needsProfile = !['boot', 'login', 'config', 'fatal'].includes(S.view);
  let html;
  try {
    html = needsProfile && !S.profile ? VIEWS.boot() : (VIEWS[S.view] || VIEWS.cal)();
  } catch (e) {
    console.error(e);
    html = `<div class="note err">Something went wrong showing this screen: ${esc(e.message)}</div><button class="btn" data-act="tab" data-v="cal" style="margin-top:12px">Back to calendar</button>`;
  }
  const app = $('#app');
  app.innerHTML = html;
  app.className = VIEWCLS[S.view] || '';
  window.scrollTo(0, reset ? 0 : y);
}

// ---------- navigation ----------
function go(view, p = {}) {
  const depth = ((history.state && history.state.depth) || 0) + 1;
  history.pushState({ view, p, depth }, '');
  S.view = view; S.p = p; render(true);
}
function tab(v) {
  history.replaceState({ view: v, p: {}, depth: 0 }, '');
  S.view = v; S.p = {}; render(true);
}
function back() {
  if (history.state && history.state.depth > 0) history.back(); else tab('cal');
}
window.addEventListener('popstate', e => {
  const st = e.state;
  if (!st || !st.view || !S.profile || !S.profile.onboarded) return;
  S.view = st.view; S.p = st.p || {};
  render(true);
});

// ---------- saving ----------
function saveErr(e) {
  const c = (e && e.code) || '';
  if (c.includes('permission-denied')) return 'Not saved: publish the Firestore rules from the setup guide.';
  return 'Could not save. ' + ((e && e.message) || '');
}
function setProfile(patch) {
  S.profile = { ...S.profile, ...patch };
  if (S.profile.onboarded && S.be) S.be.saveProfile(S.user.uid, patch).catch(e => toast(saveErr(e)));
}
function clean(o) { for (const k of Object.keys(o)) { const v = o[k]; if (v === undefined || v === null || v === '' || v === false) delete o[k]; } return o; }
function commitDay(date, fn) {
  const next = clean(fn({ ...(S.days[date] || {}) }) || {});
  const uid = S.user.uid;
  const op = Object.keys(next).length ? S.be.setDay(uid, date, next) : S.be.delDay(uid, date);
  op.catch(e => toast(saveErr(e)));
}
const TYPE_KEYS = d => { delete d.type; delete d.shiftId; delete d.hours; delete d.person; return d; };

// =====================================================================
// ACTIONS
// =====================================================================
const ACT = {
  back, tab: d => tab(d.v), reload: () => location.reload(),
  signOut: () => S.be.signOut(),
  openDay: d => go('day', { date: d.d }),
  month: d => { let { y, m } = S.month; m += Number(d.n); if (m < 1) { m = 12; y--; } if (m > 12) { m = 1; y++; } S.month = { y, m }; render(false); },
  thisMonth: () => { S.month = todayParts(); render(false); },
  openRot: () => { initRot(); go('rot'); },
  shiftsOpen: () => go('shifts'),
  bookOpen: () => { const t = E.todayIso(); S.bk = { type: 'VAC', from: t, to: t }; go('book'); },
  install: async () => { if (!deferredInstall) return; deferredInstall.prompt(); await deferredInstall.userChoice; deferredInstall = null; render(false); },

  // login
  authMode: () => { S.authMode = S.authMode === 'login' ? 'signup' : 'login'; render(false); },
  google: async () => { try { await S.be.google(); } catch (e) { const m = authMsg(e); if (m) setAuthMsg(m); } },
  reset: async () => {
    const email = ($('#email') || {}).value?.trim();
    if (!email) return setAuthMsg('Type your email above first.');
    try { await S.be.reset(email); setAuthMsg('Password reset email sent. Check your inbox and spam folder.', true); } catch (e) { setAuthMsg(authMsg(e)); }
  },

  // day
  dayAct(d) {
    const date = S.p.date, i = E.dayInfo(date, S.C), k = d.k;
    if (k === 'VAC' || k === 'SICK' || k === 'OT') { S.p.panel = k; render(false); return; }
    if (k === 'LIEU' || k === 'OFF') { commitDay(date, o => ({ ...TYPE_KEYS(o), type: k })); toast(k === 'LIEU' ? 'Marked as a lieu day' : 'Marked as a day off'); return; }
    if (k === 'SWAP') { S.sw = { person: '', note: '', shiftId: '' }; go('swap', { date, mode: i.base ? 'gave' : 'took' }); return; }
    if (k === 'EXTRA') { S.sw = { person: '', note: '', shiftId: '' }; go('swap', { date, mode: 'extra' }); return; }
    if (k === 'CLEAR') { commitDay(date, o => TYPE_KEYS(o)); S.p.panel = null; toast('Cleared'); }
  },
  panelCancel: () => { S.p.panel = null; render(false); },
  panelSave() {
    const date = S.p.date, k = S.p.panel, h = Math.max(0, Number($('#panelHours').value) || 0);
    commitDay(date, o => ({ ...TYPE_KEYS(o), type: k, hours: h }));
    S.p.panel = null; toast('Saved');
  },
  lieu: () => { const date = S.p.date; commitDay(date, o => ({ ...o, lieu: !o.lieu })); },

  // swap
  swMode: d => { readSwap(); S.p.mode = d.k; history.replaceState({ view: 'swap', p: S.p, depth: history.state?.depth || 1 }, ''); render(false); },
  swShift: d => { readSwap(); S.sw.shiftId = d.id; render(false); },
  swSave() {
    readSwap();
    const { date, mode } = S.p, i = E.dayInfo(date, S.C), person = S.sw.person.trim(), note = S.sw.note.trim();
    if (!date) return toast('Choose a date');
    if (mode === 'gave') {
      if (!i.base) return toast('You are not scheduled to work on that date.');
      commitDay(date, o => ({ ...TYPE_KEYS(o), type: 'SWAP_OUT', shiftId: i.base, hours: i.baseHours, person, note: note || o.note }));
    } else {
      const sh = S.C.shifts[S.sw.shiftId];
      commitDay(date, o => ({ ...TYPE_KEYS(o), type: mode === 'took' ? 'SWAP_IN' : 'EXTRA', shiftId: sh.id, hours: E.paidHours(sh), person: mode === 'took' ? person : '', note: note || o.note }));
    }
    toast('Saved'); back();
  },

  // book time off
  bkType: d => { readBook(); S.bk.type = d.k; render(false); },
  bkSave() {
    readBook();
    const b = S.bk, entries = {};
    for (let n = E.dayNum(b.from); n <= E.dayNum(b.to) && n < E.dayNum(b.from) + 60; n++) {
      const d = E.fromDayNum(n), i = E.dayInfo(d, S.C);
      if (!i.base) continue;
      entries[d] = clean({ ...TYPE_KEYS({ ...(S.days[d] || {}) }), type: b.type, hours: b.type === 'LIEU' ? 0 : i.baseHours });
    }
    if (!Object.keys(entries).length) return;
    S.be.setDays(S.user.uid, entries).catch(e => toast(saveErr(e)));
    toast('Time off booked'); back();
  },

  // rotation
  rotWeeks: d => { const r = S.rot; r.mode = 'week'; r.weeks = Number(d.n); resizeDays(r, r.weeks * 7); render(false); },
  rotCycleMode: () => { const r = S.rot; if (r.mode !== 'cycle') { r.mode = 'cycle'; resizeDays(r, Math.min(28, r.days.length)); } render(false); },
  rotCycle: d => { const r = S.rot, n = Math.max(2, Math.min(28, r.days.length + Number(d.n))); resizeDays(r, n); render(false); },
  rotBrush: d => { S.rot.brush = d.id; render(false); },
  rotCell: d => { S.rot.days[Number(d.i)] = S.rot.brush; S.rot.err = ''; render(false); },
  rotTpl(d) {
    const r = S.rot, on = r.brush || S.profile.shifts[0].id;
    if (d.k === 'pitman') { r.mode = 'cycle'; r.days = [1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0].map(x => (x ? on : '')); }
    else if (d.k === '4on4off') { r.mode = 'cycle'; r.days = [1, 1, 1, 1, 0, 0, 0, 0].map(x => (x ? on : '')); }
    else if (d.k === 'copy') { const w = r.days.slice(0, 7); r.days = r.days.map((_, i) => w[i % 7]); }
    else r.days = r.days.map(() => '');
    r.err = ''; render(false);
  },
  rotSave() { if (commitRotation()) { toast('Rotation saved'); back(); } },
  rotNew() { S.rot = { ...blankDraft(), isNew: true }; toast('Paint the new schedule and choose when it starts'); render(true); },
  rotEdit: d => { const p = S.profile.patterns.find(x => x.id === d.id); if (p) { S.rot = draftFrom(p); render(true); } },
  rotDel(d) {
    if (!confirm('Delete this schedule? Dates it covered will use the schedule before it.')) return;
    setProfile({ patterns: S.profile.patterns.filter(x => x.id !== d.id) });
    initRot(); render(false);
  },

  // shifts
  seOpen: d => { const s = S.profile.shifts.find(x => x.id === d.id); S.se = { ...s, err: '' }; go('shiftEdit'); },
  seNew: () => { S.se = { id: '', name: '', code: '', start: '07:00', end: '15:00', brk: 30, color: '#0E7490', err: '' }; go('shiftEdit'); },
  seColor: d => { readShift(); S.se.color = d.c; render(false); },
  seSave() {
    readShift();
    const s = S.se, code = s.code.trim().toUpperCase();
    s.err = '';
    if (!s.name.trim()) s.err = 'Give the shift a name.';
    else if (!code) s.err = 'Give the shift a code of 1 to 3 characters.';
    else if (S.profile.shifts.some(x => x.id !== s.id && x.code.toUpperCase() === code)) s.err = `The code ${code} is already used by another shift.`;
    else if (!s.start || !s.end) s.err = 'Choose a start and end time.';
    if (s.err) { render(false); return; }
    const rec = { id: s.id || 's' + Date.now().toString(36), name: s.name.trim(), code, start: s.start, end: s.end, brk: Math.max(0, Number(s.brk) || 0), color: s.color };
    const list = s.id ? S.profile.shifts.map(x => (x.id === s.id ? rec : x)) : [...S.profile.shifts, rec];
    setProfile({ shifts: list }); toast('Shift saved'); back();
  },
  seDel() {
    const id = S.se.id;
    if ((S.profile.patterns || []).some(p => p.days.includes(id))) { S.se.err = 'This shift is used in your rotation. Remove it from the rotation first.'; render(false); return; }
    if (!confirm('Delete this shift?')) return;
    setProfile({ shifts: S.profile.shifts.filter(x => x.id !== id) }); back();
  },

  // settings
  toggleHol: () => { setProfile({ showHolidays: S.profile.showHolidays === false }); render(false); },
  addHol() {
    const date = $('#chDate').value, name = $('#chName').value.trim();
    if (!date || !name) return toast('Enter a date and a name');
    setProfile({ customHolidays: [...(S.profile.customHolidays || []), { date, name }].sort((a, b) => (a.date < b.date ? -1 : 1)) }); render(false);
  },
  delHol: d => { const l = [...S.profile.customHolidays]; l.splice(Number(d.k), 1); setProfile({ customHolidays: l }); render(false); },
  exportIcs: () => downloadIcs(),
  async wipe() {
    if (!confirm('Delete all your schedule data? This cannot be undone. Your login stays.')) return;
    try { await S.be.wipe(S.user.uid); toast('Data deleted'); } catch (e) { toast(saveErr(e)); }
  },
  async delAccount() {
    if (!confirm('Delete your account and all your data? This cannot be undone.')) return;
    try {
      await S.be.wipe(S.user.uid);
      await S.be.deleteAccount();
    } catch (e) {
      if ((e.code || '').includes('requires-recent-login')) alert('Your data is deleted. For security, log out, log in again, then choose Delete my account once more to remove your login.');
      else toast(saveErr(e));
    }
  },

  // setup
  payFreq: d => { setProfile({ payFreq: d.k }); render(false); },
  setupBack: () => { S.setup.step--; S.setup.err = ''; if (S.setup.step === 2) initRotIfNeeded(); render(true); },
  setupNext() {
    const st = S.setup.step;
    if (st === 2) { if (!commitRotation()) return; }
    if (st === 3) {
      const f = S.profile.payFreq;
      if ((f === 'weekly' || f === 'biweekly' || f === 'monthly') && !S.profile.payAnchor) { S.setup.err = 'Choose a pay date you know so we can mark your pay days.'; render(false); return; }
    }
    if (st === 4) {
      const patch = { ...S.profile, onboarded: true, vacAsOf: S.profile.vacAsOf || E.todayIso(), sickAsOf: S.profile.sickAsOf || E.todayIso() };
      S.profile = patch;
      S.be.saveProfile(S.user.uid, patch).catch(e => toast(saveErr(e)));
      S.month = todayParts(); tab('cal'); return;
    }
    S.setup.step++; S.setup.err = '';
    if (S.setup.step === 2) initRotIfNeeded();
    render(true);
  }
};
function initRotIfNeeded() { if (!S.rot) initRot(); }

document.addEventListener('click', e => {
  const t = e.target.closest('[data-act]');
  if (!t || !ACT[t.dataset.act]) return;
  ACT[t.dataset.act](t.dataset, t, e);
});

// ---------- form fields ----------
function readSwap() {
  const g = id => { const el = $(id); return el ? el.value : null; };
  const person = g('#swPerson'), note = g('#swNote'), date = g('#swDate');
  if (person !== null) S.sw.person = person;
  if (note !== null) S.sw.note = note;
  if (date) S.p.date = date;
}
function readBook() {
  const f = $('#bkFrom'), t = $('#bkTo');
  if (f && f.value) S.bk.from = f.value;
  if (t && t.value) S.bk.to = t.value;
}
function readShift() {
  const g = (id, k) => { const el = $(id); if (el) S.se[k] = el.value; };
  g('#seName', 'name'); g('#seCode', 'code'); g('#seStart', 'start'); g('#seEnd', 'end'); g('#seBrk', 'brk'); g('#seColor', 'color');
}
function onSet(t) {
  const key = t.dataset.set;
  let val = t.type === 'checkbox' ? t.checked : t.dataset.type === 'num' ? (t.value === '' ? (key === 'carryLimit' ? '' : 0) : Math.max(0, Number(t.value) || 0)) : t.value;
  const patch = { [key]: val };
  if (key === 'vacHours') patch.vacAsOf = E.todayIso();
  if (key === 'sickHours') patch.sickAsOf = E.todayIso();
  if (key === 'country') patch.region = (REGIONS[val] || [{ id: '' }])[0].id;
  setProfile(patch);
  if (S.profile.onboarded) toast('Saved');
  if (['country', 'payFreq'].includes(key)) render(false);
}
document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset && t.dataset.set) return onSet(t);
  switch (t.id) {
    case 'rotAnchor': S.rot.anchorInput = t.value; S.rot.err = ''; render(false); break;
    case 'swDate': readSwap(); render(false); break;
    case 'bkFrom': case 'bkTo': readBook(); render(false); break;
    case 'dayNote': commitDay(S.p.date, o => ({ ...o, note: t.value.trim().slice(0, 500) })); toast('Note saved'); break;
    case 'seColor': readShift(); render(false); break;
    case 'seStart': case 'seEnd': case 'seBrk': readShift(); { const el = $('#sePaid'); if (el) el.innerHTML = `${fmtH(E.paidHours({ start: S.se.start || '00:00', end: S.se.end || '00:00', brk: S.se.brk }))} paid`; } break;
  }
});
document.addEventListener('input', e => {
  if (e.target.id === 'panelHours') {
    const info = $('#panelInfo');
    if (info) { const h = Math.max(0, Number(e.target.value) || 0); info.innerHTML = `${fmtH(h)} comes off your balance, leaving <b>${fmtH(Number(info.dataset.left) - h)}</b>.`; }
  }
});
document.addEventListener('submit', e => { if (e.target.id === 'authForm') { e.preventDefault(); doAuth(); } });

// ---------- sign in ----------
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

// ---------- calendar file ----------
function downloadIcs() {
  const C = S.C, today = E.todayIso(), rem = Number(S.profile.reminderMin) || 0;
  const esc2 = s => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Shift Calendar//EN', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:My shifts'];
  let count = 0;
  for (let n = 0; n < 365; n++) {
    const d = E.addDays(today, n), i = E.dayInfo(d, C), ds = d.replace(/-/g, '');
    const sh = i.isWorking && C.shifts[i.work];
    if (sh) {
      const ed = (E.crossesMidnight(sh) ? E.addDays(d, 1) : d).replace(/-/g, '');
      L.push('BEGIN:VEVENT', `UID:${d}-${sh.id}@shiftcalendar`, `DTSTAMP:${stamp}`, `DTSTART:${ds}T${sh.start.replace(':', '')}00`, `DTEND:${ed}T${sh.end.replace(':', '')}00`, `SUMMARY:${esc2(sh.code + ' shift')}`, `DESCRIPTION:${esc2(sh.name)}`);
      if (rem > 0) L.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Shift reminder', `TRIGGER:-PT${rem}M`, 'END:VALARM');
      L.push('END:VEVENT'); count++;
    } else if (['VAC', 'SICK', 'LIEU'].includes(i.type)) {
      L.push('BEGIN:VEVENT', `UID:${d}-${i.type}@shiftcalendar`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${ds}`, `DTEND;VALUE=DATE:${E.addDays(d, 1).replace(/-/g, '')}`, `SUMMARY:${LV[i.type].name}`, 'END:VEVENT'); count++;
    }
  }
  L.push('END:VCALENDAR');
  if (!count) return toast('No shifts to export yet');
  const url = URL.createObjectURL(new Blob([L.join('\r\n')], { type: 'text/calendar' }));
  const a = document.createElement('a');
  a.href = url; a.download = 'my-shifts.ics'; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  toast(`Downloaded ${count} events`);
}

// =====================================================================
// START
// =====================================================================
function stopWatching() { S.unsub.forEach(f => { try { f(); } catch (e) { /* ignore */ } }); S.unsub = []; }
function fail(e) {
  console.error(e);
  S.bootErr = saveErr(e).replace('Not saved: ', 'Cannot load your data: ');
  if (!S.profile) render(false); else toast(saveErr(e));
}
function seedDemo() {
  S.seeded = true;
  const t = E.todayIso();
  const pat = { id: 'p1', mode: 'week', anchor: '2026-10-11', effectiveFrom: '1900-01-01', days: ['am', 'am', '', '', 'pm', 'pm', '', '', 'd', 'e', 'n', '', '', 'am'] };
  const prof = { ...newProfile(), name: 'Demo', patterns: [pat], payFreq: 'biweekly', payAnchor: '2026-10-29', vacHours: 84, sickHours: 36, accrual: 3.7, vacYearly: 120, carryLimit: 20, deadline: '2026-12-31', onboarded: true };
  S.be.saveProfile('demo', prof);
  const days = {};
  for (let n = 3; n < 40 && Object.keys(days).length < 2; n++) { const d = E.addDays(t, n), i = E.dayInfo(d, { shifts: Object.fromEntries(prof.shifts.map(s => [s.id, s])), patterns: [pat], days: {} }); if (i.base) days[d] = { type: 'VAC', hours: i.baseHours }; }
  S.be.setDays('demo', days);
}
function onProfile(p) {
  S.bootErr = '';
  if (p && p.onboarded) {
    S.profile = normalize(p);
    if (['boot', 'login', 'setup'].includes(S.view)) { S.view = 'cal'; S.p = {}; S.month = S.month || todayParts(); history.replaceState({ view: 'cal', p: {}, depth: 0 }, ''); }
    render(false);
    return;
  }
  if (S.be.kind === 'demo' && !S.seeded) { seedDemo(); return; }
  if (!S.profile || S.profile.onboarded) {
    S.profile = newProfile(); S.profile.name = S.user.name || '';
    S.setup = { step: 1, err: '' }; S.rot = null; S.view = 'setup'; S.p = {};
  }
  render(false);
}
function onUser(user) {
  stopWatching();
  S.user = user; S.days = {}; S.profile = null; S.rot = null; S.bootErr = '';
  if (!user) { S.view = 'login'; S.authMode = 'login'; render(true); return; }
  S.view = 'boot'; render(false);
  S.unsub.push(S.be.watchProfile(user.uid, onProfile, fail));
  S.unsub.push(S.be.watchDays(user.uid, d => { S.days = d; if (S.profile) render(false); }, fail));
}
async function start() {
  S.month = todayParts();
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
