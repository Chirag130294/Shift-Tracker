// Settings, first-time setup and calendar export (.ics).
import {
  E, B, S, VIEWS, ACT, $, esc, fmtD, fmtMD, fmtDY, fmtH, shortT, ico, REGIONS, bankOf, nextShift, LV, lvOf, holiday, holidayList, lieuInfo, DOWL, MON,
  toast, top, nav, demoNote, field, sw, num, roll, rollSet, render, go, tab, back, setProfile, saveErr, applySet, todayParts, normalize, mrow, empty, memGet, memSet, flashSaved
} from './core.js';
import { COUNTRIES, countryName } from './countries.js';
import { regionsOf, REGION_TITLE, regionLabel, ensureList, cachedList, BUILT_IN } from './holidays.js';
import { initRot, rotEditor, commitRotation } from './views-rot.js';
import { maybeShowJoin } from './views-social.js';

export const VERSION = '1.6';
const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
let deferredInstall = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; if (S.view === 'settings') render(false); });

const PAYF = [['weekly', 'Weekly'], ['biweekly', 'Every 2 weeks'], ['semimonthly', 'Twice a month'], ['monthly', 'Monthly']];
const WEEKSTART = DOWL.map((d, i) => [i, d]);
const LIEU_EARN = [['day', '1 day'], ['hours', 'Hours I worked'], ['x15', 'Hours x 1.5']];
const placeText = p => {
  if (!p.country) return 'None';
  const reg = (REGIONS[p.country] || []).find(r => r.id === p.region);
  const r = reg ? reg.name : p.region ? regionLabel(p.region) : '';
  return r && !['US'].includes(p.region) ? `${countryName(p.country)} · ${r}` : countryName(p.country);
};

// ---------- settings: a short menu, one topic per screen ----------
VIEWS.settings = () => {
  const p = S.profile, nv = Object.values(S.viewers || {}), nf = Object.keys(S.following || {}).length;
  const cur = E.patternFor(E.todayIso(), p.patterns) || (p.patterns || [])[p.patterns.length - 1];
  const L = p.holidayLieu || {};
  const rot = cur ? (cur.mode === 'week' ? cur.days.length / 7 + '-week rotation' : cur.days.length + '-day cycle') : 'Not set up yet';
  return `${demoNote()}<div class="stack"><div class="top"><h1>Settings</h1></div>
    <button class="profcard" data-act="sProfileOpen"><span class="bdg av" style="width:48px;height:48px;border-radius:24px;background:var(--acc);color:var(--acc-ink);font-size:19px">${esc(((p.name || S.user.email || '?').trim()[0] || '?').toUpperCase())}</span><span class="grow"><b style="font-size:16px;display:block">${esc(p.name || 'Your name')}</b><span class="small mute" style="overflow-wrap:anywhere">${esc(S.user.email || 'Signed in')}</span></span>${ico('next', 16)}</button>
    ${standalone() ? '' : `<div class="note">${deferredInstall ? '<button class="btn" data-act="install">Install on this phone</button>' : 'To install: in Chrome tap the menu (three dots), then <b>Install app</b> or <b>Add to Home screen</b>.'}</div>`}
    <div class="mgroup">${mrow('sharingOpen', 'users', '#17695A', 'Share my calendar', nv.length ? `${nv.filter(v => v.active).length} of ${nv.length} colleague${nv.length === 1 ? '' : 's'} can see it` : 'Nobody yet')}${mrow('followOpen', 'eye', '#0E7490', 'Calendars shared with me', nf ? `${nf} colleague${nf === 1 ? '' : 's'}` : 'None yet')}</div>
    <div class="mgroup">${mrow('openRot', 'repeat', '#7A4FB5', 'Rotation', `${rot}${cur ? ' · starts ' + fmtMD(cur.anchor) : ''}`)}${mrow('shiftsOpen', 'lib', '#E0782B', 'Shift library', p.shifts.map(s => esc(s.code)).join(', '))}${mrow('tabLeave', 'leave', '#1E6FD9', 'Leave banks', S.banks.map(b => esc(b.name)).join(', '))}</div>
    <div class="mgroup">${mrow('holidaysOpen', 'flag', '#B3401F', 'Holidays and lieu', p.showHolidays === false ? 'Hidden on the calendar' : L.on ? 'Lieu day earned automatically' : 'Add your own, set up lieu')}${mrow('countryOpen', 'globe', '#0E7490', 'Country and region', esc(placeText(p)))}</div>
    <div class="mgroup">${mrow('sPayOpen', 'dollar', '#17785A', 'Pay', `${p.pay && p.pay.rate > 0 ? 'Gross pay on · ' : 'Rate, premiums, sick pay · '}${PAYF.find(x => x[0] === p.payFreq)[1]}`)}${mrow('sDisplayOpen', 'screen', '#475569', 'Calendar and display', `Week starts ${DOWL[p.weekStart]}`)}${mrow('exportOpen', 'download', '#1E6FD9', 'Export shifts (.ics)', 'Google or phone calendar')}</div>
    <div class="mgroup">${mrow('sDataOpen', 'shield', '#A8261B', 'Your data', 'Saved to your account and on this phone')}</div>
    <p class="small mute" style="text-align:center">Shift Calendar · version ${VERSION}</p></div>${nav('settings')}`;
};
const sub = (title, body) => `<div class="stack">${top(title)}${body}</div>${nav('settings')}`;
VIEWS.sProfile = () => sub('Profile', `<div class="card">${field('Your name', `<input type="text" data-set="name" maxlength="60" value="${esc(S.profile.name)}" autocomplete="name">`)}<div class="small mute">Signed in as ${esc(S.user.email || 'this account')}</div></div><button class="btn danger" data-act="signOut">Log out</button>`);
VIEWS.sDisplay = () => {
  const p = S.profile;
  return sub('Calendar and display', `<div class="card"><div class="field"><div class="lbl">WEEK STARTS ON</div>${rollSet('weekStart', WEEKSTART, p.weekStart, 'num', 'Week starts on')}</div>
    <div class="field"><div class="lbl">CALENDAR LAYOUT</div>${rollSet('layout', [['auto', 'Automatic'], ['compact', 'One screen'], ['roomy', 'Scrolling']], p.layout || 'auto', '', 'Calendar layout')}</div></div>
    <p class="hint">Automatic fits the calendar on one screen on tall phones and scrolls on small ones. On a tablet or unfolded phone the day details open beside the calendar.</p>`);
};
VIEWS.sData = () => sub('Your data', `<div class="card"><p class="mute">Your schedule is saved to your account, and also kept on this phone so the app works offline.</p></div>
  <button class="btn danger" data-act="wipe">Delete all my data</button><button class="btn danger" data-act="delAccount">Delete my account</button>`);

// ---------- country and region list pickers ----------
const flagCode = c => `<span class="cc">${c}</span>`;
VIEWS.country = () => {
  const q = (S.cq || '').trim().toLowerCase(), cur = S.profile.country;
  const list = COUNTRIES.filter(([c, n]) => !q || n.toLowerCase().includes(q) || c.toLowerCase() === q);
  const row = ([c, n]) => `<button class="prow ${c === cur ? 'on' : ''}" role="radio" aria-checked="${c === cur}" data-act="pickCountry" data-c="${c}">${flagCode(c)}<span class="pn">${esc(n)}</span><span class="pt">${REGIONS[c] && REGIONS[c].length > 1 ? 'Regions' : ''}</span>${c === cur ? ico('check', 20) : ''}</button>`;
  let body = '';
  if (!q) {
    const loc = ((navigator.language || '').split('-')[1] || '').toUpperCase();
    const sug = Array.from(new Set([loc, 'CA', 'US', 'GB', 'AU'].filter(Boolean))).map(c => COUNTRIES.find(x => x[0] === c)).filter(Boolean).slice(0, 4);
    body += `<div class="section">Selected</div><div class="plist">${cur ? row([cur, countryName(cur)]) : `<button class="prow ${!cur ? 'on' : ''}" data-act="pickCountry" data-c="">${flagCode('--')}<span class="pn">None (no holidays)</span>${ico('check', 20)}</button>`}</div>
      <div class="section" style="margin-top:6px">Suggested</div><div class="plist" role="radiogroup" aria-label="Suggested countries">${sug.map(row).join('')}</div>`;
  }
  let lastL = '';
  const rows = list.map(x => { const L = x[1][0].toUpperCase(); const h = L !== lastL && !q ? `<div class="phead" id="L-${L}">${L}</div>` : ''; lastL = L; return h + row(x); }).join('');
  body += `<div class="section" style="margin-top:6px">${q ? 'Results' : 'All countries'}</div>${list.length ? `<div class="plist" role="radiogroup" aria-label="All countries">${rows}</div>` : empty('search', 'No match', 'Try another spelling, or clear the search.')}
    <p class="hint" style="margin:8px 4px 0"><b>Holidays:</b> Canada and the United States are built in. Most other countries load from a free public holiday list the first time you pick them, then stay saved on your phone. If one is missing, add its holidays by hand.</p>`;
  const letters = Array.from(new Set(COUNTRIES.map(c => c[1][0].toUpperCase())));
  return `<div class="stack">${top('Country')}<div class="searchbox">${ico('search', 18)}<input id="cSearch" type="search" placeholder="Search ${COUNTRIES.length} countries" value="${esc(S.cq || '')}" aria-label="Search countries" autocomplete="off"></div>${body}</div>
    ${q ? '' : `<div class="lidx" aria-label="Jump to letter">${letters.map(l => `<button data-act="cLetter" data-l="${l}" aria-label="Jump to ${l}">${l}</button>`).join('')}</div>`}${nav('settings')}`;
};
VIEWS.region = () => {
  const p = S.profile, y = E.parts(E.todayIso()).y, list = regionsOf(p.country, y), ext = !BUILT_IN.includes(p.country);
  if (ext) ensureList(p.country, y);
  const opts = ext ? [{ id: '', name: 'All of ' + countryName(p.country) + ' (national holidays)' }, ...list] : list;
  const row = r => `<button class="prow ${r.id === (p.region || '') ? 'on' : ''}" role="radio" aria-checked="${r.id === (p.region || '')}" data-act="pickRegion" data-r="${esc(r.id)}"><span class="pn">${esc(r.name)}</span>${r.id === (p.region || '') ? ico('check', 20) : ''}</button>`;
  return `<div class="stack">${top(REGION_TITLE[p.country] || 'Region')}<div class="section">${esc(countryName(p.country))}</div>
    ${ext && !list.length ? `<div class="card">${cachedHint(p.country, y)}</div>` : `<div class="plist" role="radiogroup" aria-label="Region">${opts.map(row).join('')}</div>`}
    <p class="hint" style="margin:8px 4px 0">The region decides which regional holidays are marked. Pick the national or federal option if yours is not listed, then add any extra holidays by hand.</p></div>${nav('settings')}`;
};
const cachedHint = (cc, y) => (cachedList(cc, y) ? '<p class="mute">This country has one list for everyone. Nothing to choose here.</p>' : `<p class="mute">Loading the holiday list. This needs an internet connection the first time.</p><button class="btn sec slim" data-act="holRetry" style="margin-top:8px">Try again</button>`);

// ---------- holidays and lieu ----------
VIEWS.holidays = () => {
  const p = S.profile, L = p.holidayLieu || {}, y = S.hy || E.parts(E.todayIso()).y, today = E.todayIso();
  const ext = !BUILT_IN.includes(p.country);
  const customs = (p.customHolidays || []).filter(h => E.parts(h.date).y === y);
  const map = {};
  Object.entries(holidayList(y)).forEach(([d, n]) => { map[d] = { d, name: n }; });
  customs.forEach(h => { map[h.date] = { d: h.date, name: h.name, custom: true, lieu: h.lieu !== false }; });
  const rows = Object.values(map).sort((a, b) => (a.d < b.d ? -1 : 1));
  const onShift = rows.filter(h => { const i = E.dayInfo(h.d, S.C); return i.isWorking; }).length;
  const bank = bankOf(L.bank || 'lieu') || S.banks[0];
  const lieuTag = h => {
    const i = E.dayInfo(h.d, S.C), li = lieuInfo(h.d);
    if (h.custom && h.lieu === false) return ['No lieu', 'background:#FFF0C2;color:#5A4300'];
    if (li) return [`${li.text} lieu`, 'background:#E8DCF5;color:#4B2A82'];
    return i.isWorking ? ['Working', 'background:#E8DCF5;color:#4B2A82'] : ['Off', 'background:var(--track);color:var(--mute)'];
  };
  const subTxt = h => {
    const i = E.dayInfo(h.d, S.C), sh = S.C.shifts[i.work];
    if (h.custom) return h.lieu === false ? 'My own holiday · lieu turned off' : 'My own holiday · tap to remove';
    if (!S.C.patterns.length) return 'Set up your rotation to see if you work it';
    return sh ? `You ${h.d < today ? 'worked' : 'work'} ${esc(sh.code)} ${shortT(sh.start)} to ${shortT(sh.end)}` : `You ${h.d < today ? 'were' : 'are'} off`;
  };
  const row = h => { const [t, st] = lieuTag(h), d = E.parts(h.d); const inner = `<span class="hd"><span>${MON[d.m - 1].toUpperCase()}</span><b>${d.d}</b></span><span class="grow"><span style="display:block;font-size:14px;font-weight:700">${esc(h.name)}</span><span class="small mute">${subTxt(h)}</span></span><span class="htag" style="${st}">${esc(t)}</span>`; return h.custom ? `<button class="hrow" data-act="holDel" data-d="${h.d}" aria-label="Remove ${esc(h.name)}">${inner}</button>` : `<div class="hrow">${inner}</div>`; };
  const regs = regionsOf(p.country, y);
  const add = S.hadd ? `<div class="card stack"><h2>Add my own holiday</h2>${field('DATE', '<input id="chDate" type="date">')}${field('NAME', '<input id="chName" type="text" maxlength="40" placeholder="Holiday name">')}
      <div class="row"><div class="grow"><b style="font-size:14px">Earns a lieu day</b><div class="small mute">Counts for automatic lieu when you work it</div></div>${sw(S.hadd.lieu !== false, 'holAddLieu', '', 'Earns a lieu day')}</div>
      <div class="two"><button class="btn sec" data-act="holAddCancel">Cancel</button><button class="btn" data-act="holAddSave">Add</button></div></div>`
    : `<button class="btn dash" data-act="holAdd">${ico('plus', 18)} Add my own holiday</button>`;
  return `<div class="stack">${top('Holidays and lieu')}
    <div class="row" style="gap:8px"><button class="mrow" data-act="countryOpen" style="flex:1;border:1px solid var(--line);border-radius:12px;background:var(--card);min-height:44px;padding:0 12px"><span style="color:var(--acc)">${ico('globe', 16)}</span><span class="grow"><span class="mt" style="font-size:13px">${esc(placeText(p))}</span></span><span style="color:var(--acc);font-size:12px;font-weight:700">Change</span></button>
      <div class="seg" role="radiogroup" aria-label="Year" style="grid-template-columns:repeat(3,auto)">${[y - 1, y, y + 1].map(v => `<button role="radio" aria-checked="${v === y}" class="${v === y ? 'on' : ''}" data-act="holYear" data-y="${v}" style="min-height:38px;padding:0 10px">${v}</button>`).join('')}</div></div>
    ${regs.length > 1 ? `<button class="mrow" data-act="regionOpen" style="border:1px solid var(--line);border-radius:12px;background:var(--card);min-height:44px"><span class="grow"><span class="mt" style="font-size:13px">${esc(REGION_TITLE[p.country] || 'Region')}</span></span><span class="mv">${esc((regs.find(r => r.id === p.region) || {}).name || 'All')}</span>${ico('next', 16)}</button>` : ''}
    <div class="row between card" style="padding:8px 14px"><div><b style="font-size:14px">Show holidays on the calendar</b></div>${sw(p.showHolidays !== false, 'toggleHol', '', 'Show holidays on the calendar')}</div>
    <div class="card stack prevcard" style="--bc:#7A4FB5;gap:10px">
      <div class="row"><div class="grow"><b style="display:block;font-size:14px">Earn a lieu day when I work a holiday</b><span class="small mute">Added by itself each time a holiday lands on one of your shifts</span></div>${sw(!!L.on, 'holLieuTog', '', 'Earn a lieu day when I work a holiday')}</div>
      ${L.on ? `<div><div class="lbl" style="color:var(--ink)">Earn</div>${roll('holEarn', LIEU_EARN, L.earn || 'day', '', 'Lieu amount')}</div>
        ${S.banks.length > 1 ? `<div><div class="lbl" style="color:var(--ink)">Goes into</div>${roll('holBank', S.banks.map(b => [b.id, b.name]), bank.id, '', 'Lieu bank')}</div>` : ''}
        <div class="row small mute" style="gap:8px"><span style="width:9px;height:9px;border-radius:5px;background:${esc(bank.color)};display:inline-block"></span><span>Goes into the <b style="color:var(--ink)">${esc(bank.name)}</b> bank. Edit the bank in Leave.</span></div>` : ''}
    </div>
    ${ext && !cachedHolList(p.country, y) ? `<div class="note warn">${cachedHint(p.country, y)}</div>` : ''}
    <div class="section">${y} · ${rows.length} holiday${rows.length === 1 ? '' : 's'} · ${onShift} on your shifts</div>
    ${rows.length ? `<div class="card tight">${rows.map(row).join('')}</div>` : empty('flag', 'No holidays listed', p.showHolidays === false ? 'Holidays are hidden. Turn them on above.' : 'Add your own below.')}
    ${add}
    <p class="hint">Holiday lists are calculated or loaded for you. Check them against your employer's list and add anything missing.</p></div>${nav('settings')}`;
};
const cachedHolList = (cc, y) => cachedList(cc, y);

// ---------- first-time setup ----------
VIEWS.setup = () => {
  const st = S.setup.step, p = S.profile, labels = ['Where', 'Rotation', 'Pay and leave', 'Done'];
  const vac = bankOf('vac') || p.banks[0], sick = bankOf('sick') || p.banks[1];
  let body = '';
  if (st === 1) {
    const yy = E.parts(E.todayIso()).y, regions = regionsOf(p.country, yy);
    if (!BUILT_IN.includes(p.country)) ensureList(p.country, yy);
    body = `<h1>Where do you work?</h1><p class="mute">We use this to show your statutory holidays.</p>
      <div class="card">${field('Your name', `<input type="text" data-set="name" maxlength="60" value="${esc(p.name)}" autocomplete="name">`)}
      ${field('Country', `<select data-set="country" aria-label="Country">${COUNTRIES.map(([c, n]) => `<option value="${c}" ${c === p.country ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>`)}
      ${regions.length > 1 ? field(REGION_TITLE[p.country] || 'Region', `<select data-set="region" aria-label="Region">${BUILT_IN.includes(p.country) ? '' : `<option value="">All of ${esc(countryName(p.country))}</option>`}${regions.map(r => `<option value="${esc(r.id)}" ${r.id === p.region ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}</select>`, 'Not listed? Choose the federal or national option and add your own holidays later in Settings.') : ''}
      <div class="field"><div class="lbl">WEEK STARTS ON</div>${rollSet('weekStart', WEEKSTART, p.weekStart, 'num', 'Week starts on')}</div></div>`;
  } else if (st === 2) {
    if (!S.rot) initRot();
    body = `<h1>Your rotation</h1><p class="mute">Paint the shifts you work. It repeats on its own, so you only do this once.</p>${rotEditor()}`;
  } else if (st === 3) {
    const f = p.payFreq;
    body = `<h1>How do you get paid?</h1><p class="mute">We use this to mark pay days and track your leave.</p>
      <div class="card"><div class="field"><div class="lbl">PAY FREQUENCY</div>${rollSet('payFreq', PAYF, f, '', 'Pay frequency')}</div>
      ${f === 'semimonthly' ? '<p class="hint" style="margin-top:-6px">Pay days start as the 15th and the last day of each month. Change them later in Settings, Pay.</p>' : field(f === 'monthly' ? 'A pay date (its day repeats each month)' : 'A pay date you know', `<input type="date" data-set="payAnchor" value="${esc(p.payAnchor)}">`, 'Every pay day is counted from this date.')}</div>
      <div class="card"><h2 style="margin-bottom:10px">Leave balances</h2>
      <div class="two">${field(`Vacation left (${vac.unit === 'd' ? 'days' : 'hours'})`, num('vacHours', vac.balance))}${field(`Sick left (${sick.unit === 'd' ? 'days' : 'hours'})`, num('sickHours', sick.balance))}</div>
      <p class="hint" style="margin:-6px 0 14px">Find these on your latest pay stub. Other banks, such as banked overtime, are under Leave later.</p>
      <div class="row between"><div><b>Added a little each pay day</b><div class="small mute">Most workplaces</div></div>${sw(vac.earn.rule === 'pay', 'setupEarn', '', 'Vacation added each pay day')}</div>
      ${vac.earn.rule === 'pay' ? `<div style="margin-top:10px">${field('Vacation added each pay day', num('accrual', vac.earn.amount, '0.01'))}</div>` : ''}
      <div class="row between" style="margin-top:14px"><div><b>Whole year added at once</b><div class="small mute">Some workplaces add the full year on one date</div></div>${sw(vac.grant.on, 'setupGrant', '', 'Whole year added at once')}</div>
      ${vac.grant.on ? `<div class="two" style="margin-top:10px">${field('Vacation per year', `<input type="number" inputmode="decimal" min="0" step="0.5" data-g="amount" value="${+vac.grant.amount || ''}">`)}${field('Added on (every year)', `<input type="date" data-g="date" value="${E.parts(E.todayIso()).y}-${esc(vac.grant.date)}">`)}</div>` : ''}</div>
      ${S.setup.err ? `<div class="note err" role="alert">${esc(S.setup.err)}</div>` : ''}`;
  } else {
    const ns = nextShift();
    body = `<h1>You are all set</h1><p class="mute">Here is what we saved. You can change anything later in Settings.</p>
      <div class="card tight">${[['Rotation', S.C.patterns.length ? 'Starts ' + fmtDY(S.C.patterns[0].anchor) : 'Not set'], ['Holidays', placeText(p)], ['Next shift', ns ? `${fmtD(ns.date)} · ${esc(ns.sh.code)}` : 'None yet'], ['Vacation / sick', `${B.fmtAmt(vac, vac.balance)} / ${B.fmtAmt(sick, sick.balance)}`]].map(([a, b]) => `<div class="item" style="min-height:52px"><span class="grow t">${a}</span><span class="mute">${b}</span></div>`).join('')}</div>
      <div class="note">Tip: install this app from your browser menu so it opens like any other app. Export your shifts to Google Calendar from Settings for reminders.</div>`;
  }
  return `<div class="stack"><div class="top">${st > 1 ? `<button class="iconbtn" data-act="setupBack" aria-label="Back">${ico('back')}</button>` : ''}<b class="mute">Step ${st} of 4</b></div>
    <div class="steps">${[1, 2, 3, 4].map(n => `<i class="${n <= st ? 'on' : ''}"></i>`).join('')}</div>
    <div class="row between small mute" style="font-weight:600">${labels.map((l, k) => `<span ${k + 1 === st ? 'style="color:var(--acc);font-weight:800"' : ''}>${l}</span>`).join('')}</div>
    ${body}</div>
  <div class="actbar"><button class="btn" data-act="setupNext">${st === 4 ? 'Open my calendar' : 'Continue'}</button></div>`;
};

// ---------- export (.ics) ----------
const LAST_KEY = () => `shiftcal_export_${S.user ? S.user.uid : 'x'}`;
const lsGet = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } };
const REMS = [[15, '15 min'], [30, '30 min'], [60, '1 hour'], [120, '2 hours'], [720, '12 hours'], [1440, '1 day']];
const RANGES = [['3', 'Next 3 months'], ['6', 'Next 6 months'], ['12', 'Next 12 months'], ['custom', 'Choose dates']];
const initExp = () => { const m = Number(S.profile.reminderMin) || 0, k = memGet('exp') || {}; S.exp = { range: k.range && k.range !== 'custom' ? k.range : '6', from: E.todayIso(), to: E.addDays(E.todayIso(), 180), rems: Array.isArray(k.rems) ? k.rems : (m ? [m] : []), leave: k.leave !== false, hol: !!k.hol, pay: !!k.pay }; };
const expRange = () => {
  const x = S.exp, t = E.todayIso();
  if (x.range === 'custom') return { from: x.from || t, to: x.to && x.to >= (x.from || t) ? x.to : E.addDays(x.from || t, 30) };
  const end = E.addDays(t, Number(x.range) * 30 + (Number(x.range) >= 12 ? 5 : 0));
  return { from: t, to: end };
};
// All events in the range, keyed by a stable id so a second export updates the first instead of duplicating it.
function collectEvents() {
  const C = S.C, x = S.exp, { from, to } = expRange(), out = {}, pays = x.pay ? new Set(E.payDates(S.profile, from, to)) : new Set();
  const limit = Math.min(E.dayNum(to), E.dayNum(from) + 366);
  for (let n = E.dayNum(from); n <= limit; n++) {
    const d = E.fromDayNum(n), i = E.dayInfo(d, C), sh = i.isWorking && C.shifts[i.work];
    if (sh) out[`${d}-shift`] = { d, kind: 'shift', summary: `${sh.code} shift`, desc: `${sh.name}, ${fmtH(i.hours)} paid`, start: sh.start, end: sh.end, endDate: E.crossesMidnight(sh) ? E.addDays(d, 1) : d, sig: `${sh.code}|${sh.start}|${sh.end}` };
    else if (x.leave && ['VAC', 'SICK', 'LIEU', 'LEAVE'].includes(i.type)) { const lv = lvOf(i.override); out[`${d}-leave`] = { d, kind: 'leave', summary: lv.name, desc: '', sig: lv.name }; }
    if (x.hol) { const hn = holiday(d); if (hn) out[`${d}-hol`] = { d, kind: 'hol', summary: hn, desc: 'Statutory holiday', sig: hn }; }
    if (pays.has(d)) out[`${d}-pay`] = { d, kind: 'pay', summary: 'Pay day', desc: '', sig: 'pay' };
  }
  return out;
}
function diffExport(ev) {
  const last = lsGet(LAST_KEY()), r = expRange();
  if (!last) return null;
  const added = [], changed = [], removed = [];
  for (const [k, e] of Object.entries(ev)) { if (!last.ev[k]) added.push(e); else if (last.ev[k] !== e.sig) changed.push(e); }
  // only count a removed event when it falls inside today's range (older ones simply scrolled out)
  for (const [k, sig] of Object.entries(last.ev)) if (!ev[k]) { const d = k.slice(0, 10); if (d >= r.from && d <= r.to && d >= E.todayIso()) removed.push({ key: k, d, sig }); }
  return { added, changed, removed, at: last.at };
}
function buildIcs(ev, diff) {
  const esc2 = s => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const last = lsGet(LAST_KEY()), seq = ((last && last.seq) || 0) + 1, who = String(S.user.uid).slice(0, 8);
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Shift Calendar//EN', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:My shifts'];
  const ds = d => d.replace(/-/g, ''), tm = t => t.replace(':', '') + '00';
  const rems = S.exp.rems.slice().sort((a, b) => a - b);
  const changedKeys = new Set(diff ? [...diff.changed].map(e => `${e.d}-${e.kind}`) : []);
  for (const [k, e] of Object.entries(ev)) {
    L.push('BEGIN:VEVENT', `UID:${k}@shiftcal-${who}`, `DTSTAMP:${stamp}`, `SEQUENCE:${changedKeys.has(k) ? seq : (last && last.ev[k] === e.sig ? (last.seq || 0) : seq)}`);
    if (e.kind === 'shift') {
      L.push(`DTSTART:${ds(e.d)}T${tm(e.start)}`, `DTEND:${ds(e.endDate)}T${tm(e.end)}`, `SUMMARY:${esc2(e.summary)}`, `DESCRIPTION:${esc2(e.desc)}`);
      for (const m of rems) L.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc2(e.summary)}`, `TRIGGER:-PT${m}M`, 'END:VALARM');
    } else {
      L.push(`DTSTART;VALUE=DATE:${ds(e.d)}`, `DTEND;VALUE=DATE:${ds(E.addDays(e.d, 1))}`, `SUMMARY:${esc2(e.summary)}`, 'TRANSP:TRANSPARENT');
      if (e.desc) L.push(`DESCRIPTION:${esc2(e.desc)}`);
    }
    L.push('END:VEVENT');
  }
  // events you removed since last time: a cancelled copy with the same id lets most calendar apps delete them
  if (diff) for (const r of diff.removed) {
    L.push('BEGIN:VEVENT', `UID:${r.key}@shiftcal-${who}`, `DTSTAMP:${stamp}`, `SEQUENCE:${seq}`, 'STATUS:CANCELLED', `DTSTART;VALUE=DATE:${ds(r.d)}`, `DTEND;VALUE=DATE:${ds(E.addDays(r.d, 1))}`, 'SUMMARY:Removed', 'END:VEVENT');
  }
  L.push('END:VCALENDAR');
  return { text: L.join('\r\n'), seq };
}

VIEWS.export = () => {
  if (!S.exp) initExp();
  const x = S.exp, ev = collectEvents(), n = Object.keys(ev).length, diff = diffExport(ev), r = expRange();
  const t = (a, b, c) => `<div class="row between"><div><b>${a}</b><div class="small mute">${b}</div></div>${sw(x[c], 'expTog', `data-k="${c}"`, a)}</div>`;
  let ch = '';
  if (!diff) ch = '<div class="note">First export. Next time this screen shows what changed since then.</div>';
  else {
    const tot = diff.added.length + diff.changed.length + diff.removed.length;
    const when = new Date(diff.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const line = (e, w) => `<div class="item" style="min-height:44px"><span class="grow"><span class="t">${fmtD(e.d)}</span> <span class="s">${esc(e.summary || e.sig)}</span></span><span class="tag" style="background:var(--soft)">${w}</span></div>`;
    ch = `<div class="card"><div class="row between"><b>Changes since ${when}</b><span class="small mute">${tot ? tot + ' change' + (tot === 1 ? '' : 's') : 'No changes'}</span></div>
      ${tot ? `<div class="tight" style="max-height:220px;overflow:auto">${diff.added.slice(0, 20).map(e => line(e, 'New')).join('')}${diff.changed.slice(0, 20).map(e => line(e, 'Changed')).join('')}${diff.removed.slice(0, 20).map(e => line({ d: e.d, summary: 'removed' }, 'Gone')).join('')}</div>` : '<p class="small mute" style="margin-top:6px">Your calendar app is already up to date.</p>'}</div>`;
  }
  return `<div class="stack">${top('Export shifts')}
    <p class="mute">Creates a calendar file called <b>My shifts</b>. Import it into Google Calendar or your phone's calendar. Each shift keeps the same id, so importing again updates it instead of adding a copy.</p>
    <div class="field" style="margin:0"><div class="lbl">What to include</div>${roll('expRange', RANGES, x.range, '', 'Date range')}</div>
    ${x.range === 'custom' ? `<div class="card two">${field('From', `<input type="date" id="expFrom" value="${x.from}">`)}${field('To', `<input type="date" id="expTo" value="${x.to}">`)}</div>` : `<p class="small mute" style="margin-top:-6px">${fmtDY(r.from)} to ${fmtDY(r.to)}</p>`}
    <div class="card stack"><b>Reminders (you can pick several)</b><div class="chips">${REMS.map(([m, l]) => `<button class="chip ${x.rems.includes(m) ? 'on' : ''}" aria-pressed="${x.rems.includes(m)}" data-act="expRem" data-m="${m}">${l}</button>`).join('')}</div><p class="small mute">Each one sends a reminder before the shift starts. Leave all off for no reminders.</p></div>
    <div class="card stack">${t('Time off', 'Vacation, sick and other leave as all-day events', 'leave')}${t('Stat holidays', 'From your holiday list', 'hol')}${t('Pay days', 'All-day markers', 'pay')}</div>
    ${ch}
    <div class="note small">Reminders come from your calendar app, so they work with no signal. Google Calendar: on a computer open calendar.google.com, Settings, Import, and choose a new calendar named My shifts.</div></div>
  <div class="actbar"><button class="btn" data-act="expGo" ${n ? '' : 'disabled'}>${ico('download', 18)} Download ${n} event${n === 1 ? '' : 's'}</button></div>`;
};

// ---------- actions ----------
Object.assign(ACT, {
  tabLeave: () => tab('leave'),
  exportOpen: () => { initExp(); go('export'); },
  expRange: d => { S.exp.range = d.v; render(false); },
  expTog: d => { S.exp[d.k] = !S.exp[d.k]; render(false); },
  expRem: d => { const m = Number(d.m), a = S.exp.rems; S.exp.rems = a.includes(m) ? a.filter(v => v !== m) : [...a, m]; render(false); },
  expGo() {
    const ev = collectEvents(), n = Object.keys(ev).length;
    if (!n) return toast('Nothing to export in this range');
    const diff = diffExport(ev), { text, seq } = buildIcs(ev, diff);
    const url = URL.createObjectURL(new Blob([text], { type: 'text/calendar' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'my-shifts.ics'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    memSet('exp', { range: S.exp.range, rems: S.exp.rems, leave: S.exp.leave, hol: S.exp.hol, pay: S.exp.pay });
    lsSet(LAST_KEY(), { at: Date.now(), seq, ev: Object.fromEntries(Object.entries(ev).map(([k, e]) => [k, e.sig])) });
    toast(`Downloaded ${n} events`); render(false);
  },
  install: async () => { if (!deferredInstall) return; deferredInstall.prompt(); await deferredInstall.userChoice; deferredInstall = null; render(false); },
  toggleHol: () => { setProfile({ showHolidays: S.profile.showHolidays === false }); render(false); },
  sProfileOpen: () => go('sProfile'), sPayOpen: () => go('sPay'), sDisplayOpen: () => go('sDisplay'), sDataOpen: () => go('sData'),
  holidaysOpen: () => { S.hy = E.parts(E.todayIso()).y; S.hadd = null; go('holidays'); },
  countryOpen: () => { S.cq = ''; S.viaCountry = false; go('country'); },
  regionOpen: () => { S.viaCountry = false; go('region'); },
  cLetter: d => { const el = document.getElementById('L-' + d.l); if (el) el.scrollIntoView({ block: 'start' }); },
  pickCountry(d) {
    applySet('country', d.c);
    const list = REGIONS[d.c];
    if (list && list.length > 1) { S.viaCountry = true; go('region'); } else back();
  },
  pickRegion(d) { applySet('region', d.r); if (S.viaCountry && history.state && history.state.depth >= 2) { S.viaCountry = false; history.go(-2); } else back(); },
  holRetry: () => { ensureList(S.profile.country, E.parts(E.todayIso()).y); toast('Trying again'); },
  holYear: d => { S.hy = Number(d.y); render(false); },
  holLieuTog() { const L = S.profile.holidayLieu || {}; setProfile({ holidayLieu: { earn: 'day', bank: 'lieu', ...L, on: !L.on } }); render(false); },
  holEarn: d => { setProfile({ holidayLieu: { ...(S.profile.holidayLieu || {}), earn: d.v } }); render(false); },
  holBank: d => { setProfile({ holidayLieu: { ...(S.profile.holidayLieu || {}), bank: d.v } }); render(false); },
  holAdd: () => { S.hadd = { lieu: true }; render(false); },
  holAddCancel: () => { S.hadd = null; render(false); },
  holAddLieu: () => { const a = $('#chDate'), n = $('#chName'); S.hadd = { lieu: S.hadd.lieu === false, date: a && a.value, name: n && n.value }; render(false); if (S.hadd.date && $('#chDate')) $('#chDate').value = S.hadd.date; if (S.hadd.name && $('#chName')) $('#chName').value = S.hadd.name; },
  holAddSave() {
    const date = $('#chDate').value, name = $('#chName').value.trim();
    if (!date || !name) return toast('Enter a date and a name');
    const list = (S.profile.customHolidays || []).filter(h => h.date !== date);
    setProfile({ customHolidays: [...list, { date, name, lieu: S.hadd.lieu !== false }].sort((a, b) => (a.date < b.date ? -1 : 1)) });
    S.hy = E.parts(date).y; S.hadd = null; toast('Holiday added'); render(false);
  },
  holDel(d) {
    const before = S.profile.customHolidays || [], gone = before.find(h => h.date === d.d);
    setProfile({ customHolidays: before.filter(h => h.date !== d.d) }); render(false);
    toast(`Removed ${gone ? gone.name : 'holiday'}`, () => { setProfile({ customHolidays: before }); render(false); });
  },
  async wipe() {
    if (!confirm('Delete all your schedule data? This cannot be undone. Your login stays.')) return;
    try { await S.be.wipe(S.user.uid); toast('Data deleted'); } catch (e) { toast(saveErr(e)); }
  },
  async delAccount() {
    if (!confirm('Delete your account and all your data? This cannot be undone.')) return;
    try { await S.be.wipe(S.user.uid); await S.be.deleteAccount(); } catch (e) {
      if ((e.code || '').includes('requires-recent-login')) alert('Your data is deleted. For security, log out, log in again, then choose Delete my account once more to remove your login.');
      else toast(saveErr(e));
    }
  },

  // setup
  setupEarn() {
    const b = S.profile.banks.map(x => (x.id === 'vac' ? { ...x, earn: { ...x.earn, rule: x.earn.rule === 'pay' ? 'none' : 'pay' } } : x));
    setProfile({ banks: b }); render(false);
  },
  setupGrant() {
    const b = S.profile.banks.map(x => (x.id === 'vac' ? { ...x, grant: { ...x.grant, on: !x.grant.on } } : x));
    setProfile({ banks: b }); render(false);
  },
  setupBack: () => { S.setup.step--; S.setup.err = ''; if (S.setup.step === 2 && !S.rot) initRot(); render(true); },
  setupNext() {
    const st = S.setup.step;
    if (st === 2) { if (!commitRotation()) return; }
    if (st === 3) {
      const f = S.profile.payFreq;
      if ((f === 'weekly' || f === 'biweekly' || f === 'monthly') && !S.profile.payAnchor) { S.setup.err = 'Choose a pay date you know so we can mark your pay days.'; render(false); return; }
      const v = bankOf('vac');
      if (v && v.grant.on && !(v.grant.amount > 0)) { S.setup.err = 'Enter how much vacation is added each year, or switch that off.'; render(false); return; }
    }
    if (st === 4) {
      const today = E.todayIso();
      const patch = { ...S.profile, onboarded: true, banks: S.profile.banks.map(b => ({ ...b, asOf: b.asOf || today })) };
      S.profile = patch;
      S.be.saveProfile(S.user.uid, patch).catch(e => toast(saveErr(e)));
      S.month = todayParts(); if (!maybeShowJoin()) tab('cal'); return;
    }
    S.setup.step++; S.setup.err = '';
    if (S.setup.step === 2 && !S.rot) initRot();
    render(true);
  }
});

// typed settings and a few small inputs
document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset && t.dataset.set) {
    const key = t.dataset.set;
    if (key === 'vacYearly' || key === 'carryLimit' || key === 'deadline' || key === 'name' || key === 'payAnchor') {
      const raw = t.dataset.type === 'num' ? t.value : t.value;
      applySet(key, raw, t.dataset.type);
    } else applySet(key, t.value, t.dataset.type);
    return;
  }
  if (t.dataset && t.dataset.g && S.profile) {
    const b = S.profile.banks.map(x => {
      if (x.id !== 'vac') return x;
      const g = { ...x.grant };
      if (t.dataset.g === 'amount') g.amount = Math.max(0, Number(t.value) || 0);
      if (t.dataset.g === 'date' && t.value) g.date = t.value.slice(5);
      return { ...x, grant: g };
    });
    setProfile({ banks: b });
    return;
  }
  if (t.id === 'expFrom' && S.exp) { S.exp.from = t.value; render(false); }
  if (t.id === 'expTo' && S.exp) { S.exp.to = t.value; render(false); }
});

document.addEventListener('input', e => { if (e.target.id === 'cSearch') { S.cq = e.target.value; render(false); } });
