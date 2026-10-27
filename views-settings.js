// Settings, first-time setup and calendar export (.ics).
import {
  E, B, S, VIEWS, ACT, $, esc, fmtD, fmtMD, fmtDY, fmtH, ico, REGIONS, bankOf, nextShift, LV, lvOf, holiday,
  toast, top, nav, demoNote, field, sw, num, roll, rollSet, render, go, tab, back, setProfile, saveErr, applySet, todayParts, normalize
} from './core.js';
import { initRot, rotEditor, commitRotation } from './views-rot.js';
import { maybeShowJoin } from './views-social.js';

export const VERSION = '1.4';
const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
let deferredInstall = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; if (S.view === 'settings') render(false); });

const COUNTRIES = [['', 'None'], ['CA', 'Canada'], ['US', 'United States']];
const PAYF = [['weekly', 'Weekly'], ['biweekly', 'Every 2 weeks'], ['semimonthly', 'Twice a month'], ['monthly', 'Monthly']];
const WEEKSTART = [[0, 'Sunday'], [1, 'Monday'], [6, 'Saturday']];

// ---------- settings ----------
VIEWS.settings = () => {
  const p = S.profile, f = p.payFreq, regions = REGIONS[p.country] || [];
  const group = (title, body) => `<div><h2 class="mute" style="margin:6px 2px 6px">${title}</h2><div class="card">${body}</div></div>`;
  const links = (a, b, c) => `<button class="item" data-act="${a}"><span class="grow"><span class="t" style="display:block">${b}</span><span class="s">${c}</span></span>${ico('next', 18)}</button>`;
  const cur = E.patternFor(E.todayIso(), p.patterns) || (p.patterns || [])[p.patterns.length - 1];
  const nv = Object.values(S.viewers || {}), nf = Object.keys(S.following || {}).length;
  return `${demoNote()}<div class="stack"><div class="top"><h1>Settings</h1></div>
    <div class="card row"><span class="bdg" style="width:52px;height:52px;border-radius:26px;background:var(--acc);color:var(--acc-ink);font-size:20px">${esc(((p.name || S.user.email || '?').trim()[0] || '?').toUpperCase())}</span><div class="grow"><b style="font-size:16px">${esc(p.name || 'Your name')}</b><div class="small mute" style="overflow-wrap:anywhere">${esc(S.user.email)}</div></div><button class="btn sec" style="width:auto;min-height:44px" data-act="signOut">Log out</button></div>
    ${standalone() ? '' : `<div class="note">${deferredInstall ? '<button class="btn" data-act="install">Install on this phone</button>' : 'To install: in Chrome tap the menu (three dots), then <b>Install app</b> or <b>Add to Home screen</b>.'}</div>`}
    ${group('Sharing', `<div class="card tight" style="border:0;padding:0">${links('sharingOpen', 'Share my calendar', nv.length ? `${nv.filter(v => v.active).length} of ${nv.length} colleague${nv.length === 1 ? '' : 's'} can see it` : 'Nobody yet. Colleagues only see the shifts you work.')}${links('followOpen', 'Calendars shared with me', nf ? `${nf} colleague${nf === 1 ? '' : 's'}` : 'None yet')}</div>`)}
    ${group('My schedule', `<div class="card tight" style="border:0;padding:0">${links('openRot', 'Rotation', cur ? (cur.mode === 'week' ? cur.days.length / 7 + '-week rotation' : cur.days.length + '-day cycle') + ' · starts ' + fmtMD(cur.anchor) : 'Not set up yet')}${links('shiftsOpen', 'Shift library', p.shifts.map(s => esc(s.code)).join(', '))}${links('tabLeave', 'Leave banks', S.banks.map(b => esc(b.name)).join(', '))}</div>
      <div style="height:12px"></div>${field('Your name', `<input type="text" data-set="name" maxlength="60" value="${esc(p.name)}">`)}
      <div class="field"><div class="lbl">Week starts on</div>${rollSet('weekStart', WEEKSTART, p.weekStart, 'num', 'Week starts on')}</div>
      <div class="field"><div class="lbl">Country</div>${rollSet('country', COUNTRIES, p.country, '', 'Country')}</div>
      ${regions.length > 1 ? `<div class="field"><div class="lbl">Province or state</div>${rollSet('region', regions.map(r => [r.id, r.name]), p.region, '', 'Province')}</div>` : ''}
      <div class="row between" style="margin-bottom:14px"><div><b>Show stat holidays</b><div class="small mute">Marks the day and whether you work it</div></div>${sw(p.showHolidays !== false, 'toggleHol', '', 'Show stat holidays')}</div>
      <div class="lbl">Your own holidays</div>
      ${(p.customHolidays || []).map((h, k) => `<div class="row between" style="min-height:44px"><span>${fmtDY(h.date)} · ${esc(h.name)}</span><button class="link" data-act="delHol" data-k="${k}" style="color:var(--err)">Remove</button></div>`).join('')}
      <div class="two" style="margin-top:6px"><input id="chDate" type="date" aria-label="Holiday date"><input id="chName" type="text" maxlength="40" placeholder="Holiday name" aria-label="Holiday name"></div>
      <button class="btn sec" data-act="addHol" style="margin-top:8px;min-height:44px">Add holiday</button>
      <p class="hint">Holiday lists are calculated for you. Check them against your employer's list and add anything missing.</p>`)}
    ${group('Pay', `<div class="field"><div class="lbl">Pay frequency</div>${rollSet('payFreq', PAYF, f, '', 'Pay frequency')}</div>
      ${f === 'semimonthly' ? '' : field(f === 'monthly' ? 'A pay date (its day repeats each month)' : 'A pay date you know', `<input type="date" data-set="payAnchor" value="${esc(p.payAnchor)}">`)}
      ${f === 'semimonthly' || f === 'monthly' ? `<div class="field"><div class="lbl">If pay day is on a weekend</div>${rollSet('payWeekend', [['before', 'Friday before'], ['none', 'Keep the date']], p.payWeekend, '', 'Weekend pay day')}</div>` : ''}
      <p class="hint">Vacation, sick and other banks, including the switch for adding the whole year at once, are under Leave banks above.</p>`)}
    ${group('Screen layout', `<div class="field"><div class="lbl">Calendar layout</div>${rollSet('layout', [['auto', 'Automatic'], ['compact', 'One screen'], ['roomy', 'Scrolling']], p.layout || 'auto', '', 'Calendar layout')}</div>
      <p class="hint">Automatic fits the calendar on one screen on tall phones and scrolls on small ones. On a tablet or unfolded phone the day details open beside the calendar.</p>`)}
    ${group('Calendar export and reminders', `<p class="mute" style="margin-bottom:12px">Add your shifts to Google Calendar or your phone calendar. Your calendar app sends the reminders.</p>
      <button class="btn" data-act="exportOpen">Export shifts (.ics)</button>`)}
    ${group('Your data', `<p class="mute" style="margin-bottom:12px">Your schedule is saved to your account, and also kept on this phone so the app works offline.</p>
      <div class="stack"><button class="btn danger" data-act="wipe">Delete all my data</button><button class="btn danger" data-act="delAccount">Delete my account</button></div>`)}
    <p class="small mute" style="text-align:center">Shift Calendar · version ${VERSION}</p></div>${nav('settings')}`;
};

// ---------- first-time setup ----------
VIEWS.setup = () => {
  const st = S.setup.step, p = S.profile, labels = ['Where', 'Rotation', 'Pay and leave', 'Done'];
  const vac = bankOf('vac') || p.banks[0], sick = bankOf('sick') || p.banks[1];
  let body = '';
  if (st === 1) {
    const regions = REGIONS[p.country] || [];
    body = `<h1>Where do you work?</h1><p class="mute">We use this to show your statutory holidays.</p>
      <div class="card">${field('Your name', `<input type="text" data-set="name" maxlength="60" value="${esc(p.name)}" autocomplete="name">`)}
      <div class="field"><div class="lbl">Country</div>${rollSet('country', COUNTRIES, p.country, '', 'Country')}</div>
      ${regions.length > 1 ? `<div class="field"><div class="lbl">Province or state</div>${rollSet('region', regions.map(r => [r.id, r.name]), p.region, '', 'Province')}<div class="hint">Not listed? Choose the federal list and add your own holidays later in Settings.</div></div>` : ''}
      <div class="field"><div class="lbl">Week starts on</div>${rollSet('weekStart', WEEKSTART, p.weekStart, 'num', 'Week starts on')}</div></div>`;
  } else if (st === 2) {
    if (!S.rot) initRot();
    body = `<h1>Your rotation</h1><p class="mute">Paint the shifts you work. It repeats on its own, so you only do this once.</p>${rotEditor()}`;
  } else if (st === 3) {
    const f = p.payFreq;
    body = `<h1>How do you get paid?</h1><p class="mute">We use this to mark pay days and track your leave.</p>
      <div class="card"><div class="field"><div class="lbl">Pay frequency</div>${rollSet('payFreq', PAYF, f, '', 'Pay frequency')}</div>
      ${f === 'semimonthly' ? '<p class="hint" style="margin-top:-6px">Pay days are the 15th and the last day of each month.</p>' : field(f === 'monthly' ? 'A pay date (its day repeats each month)' : 'A pay date you know', `<input type="date" data-set="payAnchor" value="${esc(p.payAnchor)}">`, 'Every pay day is counted from this date.')}</div>
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
      <div class="card tight">${[['Rotation', S.C.patterns.length ? 'Starts ' + fmtDY(S.C.patterns[0].anchor) : 'Not set'], ['Holidays', p.country ? ((REGIONS[p.country].find(r => r.id === p.region) || {}).name || p.country) : 'None'], ['Next shift', ns ? `${fmtD(ns.date)} · ${esc(ns.sh.code)}` : 'None yet'], ['Vacation / sick', `${B.fmtAmt(vac, vac.balance)} / ${B.fmtAmt(sick, sick.balance)}`]].map(([a, b]) => `<div class="item" style="min-height:52px"><span class="grow t">${a}</span><span class="mute">${b}</span></div>`).join('')}</div>
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
const initExp = () => { const m = Number(S.profile.reminderMin) || 0; S.exp = { range: '6', from: E.todayIso(), to: E.addDays(E.todayIso(), 180), rems: m ? [m] : [], leave: true, hol: false, pay: false }; };
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
    lsSet(LAST_KEY(), { at: Date.now(), seq, ev: Object.fromEntries(Object.entries(ev).map(([k, e]) => [k, e.sig])) });
    toast(`Downloaded ${n} events`); render(false);
  },
  install: async () => { if (!deferredInstall) return; deferredInstall.prompt(); await deferredInstall.userChoice; deferredInstall = null; render(false); },
  toggleHol: () => { setProfile({ showHolidays: S.profile.showHolidays === false }); render(false); },
  addHol() {
    const date = $('#chDate').value, name = $('#chName').value.trim();
    if (!date || !name) return toast('Enter a date and a name');
    setProfile({ customHolidays: [...(S.profile.customHolidays || []), { date, name }].sort((a, b) => (a.date < b.date ? -1 : 1)) }); render(false);
  },
  delHol: d => { const l = [...S.profile.customHolidays]; l.splice(Number(d.k), 1); setProfile({ customHolidays: l }); render(false); },
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
