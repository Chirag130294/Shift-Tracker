// Rotation builder (1 to 52 weeks, or a day cycle) and the shift library.
import {
  E, S, VIEWS, ACT, $, esc, DOWS, DOWL, fmtMD, fmtDY, fmtH, dowFrom, ico, moon, bstyle, badge,
  toast, top, wheel, render, go, back, setProfile, ws
} from './core.js';

const SWATCH = ['#F2B705', '#25327A', '#17785A', '#E0782B', '#6B44A8', '#C0392B', '#0E7490', '#BE185D', '#4D7C0F', '#475569'];

// ---------- draft ----------
// r.ws = the weekday the first column stands for (0 Sunday ... 6 Saturday).
// A new schedule starts on the week start chosen in Settings. An older schedule keeps the weekday it was saved with.
const blankDraft = () => ({ mode: 'week', weeks: 2, days: Array(14).fill(''), anchorInput: '', brush: S.profile.shifts[0].id, id: '', isNew: false, err: '', page: 0, ws: ws() });
const draftFrom = p => ({ mode: p.mode, weeks: Math.ceil(p.days.length / 7), days: [...p.days], anchorInput: p.anchor, brush: S.profile.shifts[0].id, id: p.id, isNew: false, err: '', page: 0, ws: p.mode === 'week' ? E.weekday(p.anchor) : ws() });
export function initRot() {
  const list = S.profile.patterns || [];
  const cur = E.patternFor(E.todayIso(), list) || list[list.length - 1];
  S.rot = cur ? draftFrom(cur) : blankDraft();
}
const alignedAnchor = r => (!r.anchorInput ? '' : r.mode === 'week' ? E.alignToWeekStart(r.anchorInput, r.ws) : r.anchorInput);
function resizeDays(r, n) { while (r.days.length < n) r.days.push(''); r.days.length = n; r.page = Math.min(r.page || 0, Math.max(0, Math.ceil(n / 7) - 1)); }

// ---------- editor (also used by first-time setup) ----------
// Every week is on screen at once (it scrolls inside its own box after 6 weeks). Tap a shift, then tap days to paint.
export function rotEditor() {
  const r = S.rot, shifts = S.profile.shifts, byId = Object.fromEntries(shifts.map(s => [s.id, s]));
  const nW = Math.ceil(r.days.length / 7);
  r.page = Math.max(0, Math.min(r.page || 0, nW - 1));   // the selected row, used by "copy week above" and "clear week"
  const dayName = k => dowFrom(r.ws, k);
  const anchor = alignedAnchor(r);
  const tmp = anchor ? [{ anchor, effectiveFrom: '1900-01-01', mode: r.mode, days: r.days }] : null;
  const pos = tmp ? E.rotationPosition(E.todayIso(), tmp) : null;
  const cellBtn = (code, i) => {
    const sh = byId[code];
    return `<button class="pc" data-act="rotCell" data-i="${i}" aria-label="${r.mode === 'week' ? `Week ${Math.floor(i / 7) + 1} ${DOWL[(r.ws + (i % 7)) % 7]}` : `Day ${i + 1}`}, ${sh ? esc(sh.name) : 'off'}" style="${sh ? bstyle(sh) + ';border:0' : ''}">${sh ? esc(sh.code) : 'Off'}</button>`;
  };
  let rows = '';
  for (let s = 0; s < nW; s++) {
    const part = r.days.slice(s * 7, s * 7 + 7);
    const cur = r.mode === 'week' && pos && pos.week === s + 1;
    rows += `<div class="rgrow ${s === r.page ? 'sel' : ''}"><button class="rl ${cur ? 'cur' : ''}" data-act="rotPageTo" data-w="${s}" aria-label="Select ${r.mode === 'week' ? 'week' : 'row'} ${s + 1}">${r.mode === 'week' ? 'Wk ' + (s + 1) : 'Day ' + (s * 7 + 1)}</button>${part.map((c, k) => cellBtn(c, s * 7 + k)).join('')}${'<span></span>'.repeat(7 - part.length)}</div>`;
  }
  const heads = `<div class="rgrow" style="margin-bottom:2px"><span></span>${[0, 1, 2, 3, 4, 5, 6].map(k => `<span class="small mute" style="text-align:center;font-weight:700;font-size:11px">${r.mode === 'week' ? dayName(k).slice(0, 2) : k + 1}</span>`).join('')}</div>`;

  let prev = '';
  if (tmp) {
    const start = E.alignToWeekStart(E.todayIso(), r.ws);
    prev = `<div><h2 style="margin-bottom:6px">Preview, next 4 weeks</h2><div class="stack" style="gap:4px"><div class="wk"><span></span>${DOWS.map((_, k) => `<span style="text-align:center">${dayName(k).slice(0, 2)}</span>`).join('')}</div>${[0, 1, 2, 3].map(w => {
      const d0 = E.addDays(start, w * 7);
      return `<div class="wk" style="margin:0"><span>${fmtMD(d0)}</span>${[0, 1, 2, 3, 4, 5, 6].map(k => { const sh = byId[E.baseShiftId(E.addDays(d0, k), tmp)]; return `<span class="pv" style="${sh ? bstyle(sh) : ''}">${sh ? esc(sh.code) : ''}</span>`; }).join('')}</div>`;
    }).join('')}</div></div>`;
  } else prev = '<p class="hint">Choose the start date to see a preview.</p>';

  const tools = [];
  if (r.mode === 'week' && nW > 1) tools.push('<button class="chip sm" data-act="rotTpl" data-k="copy">Copy Week 1 to all</button>', '<button class="chip sm" data-act="rotTpl" data-k="above">Copy week above</button>', '<button class="chip sm" data-act="rotTpl" data-k="clearWeek">Clear week</button>');
  tools.push('<button class="chip sm" data-act="rotTpl" data-k="pitman">2-2-3</button>', '<button class="chip sm" data-act="rotTpl" data-k="4on4off">4 on 4 off</button>', '<button class="chip sm" data-act="rotTpl" data-k="clear">Clear all</button>');

  const first = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const startRow = r.mode === 'week'
    ? `<div class="card row" style="gap:12px;align-items:stretch">
        <div style="flex:none;width:92px"><div class="lbl">REPEATS</div>${wheel('rotWeeksW', Array.from({ length: 52 }, (_, k) => [k + 1, `${k + 1} wk`]), nW, 'Weeks in the rotation', 'mini')}</div>
        <div class="grow"><div class="lbl">WEEK STARTS ON</div><div class="daypick" role="radiogroup" aria-label="Week starts on">${first.map((l, v) => `<button type="button" role="radio" aria-checked="${r.ws === v}" aria-label="${DOWL[v]}" class="${r.ws === v ? 'on' : ''}" data-act="rotWs" data-v="${v}">${l}</button>`).join('')}</div>
          <div class="hint">Any day. Your rotation week runs ${DOWL[r.ws]} to ${DOWL[(r.ws + 6) % 7]}.</div>
          ${pos ? `<div style="margin-top:6px;font-size:12px;font-weight:800;color:var(--acc)">Today is in Week ${pos.week} of ${pos.weeks}</div>` : ''}</div></div>`
    : `<div class="card row"><span class="lbl" style="margin:0;flex:1">Days in the cycle</span><button class="iconbtn" data-act="rotCycle" data-n="-1" aria-label="One day shorter">${ico('off')}</button><b style="min-width:28px;text-align:center">${r.days.length}</b><button class="iconbtn" data-act="rotCycle" data-n="1" aria-label="One day longer">${ico('plus')}</button></div>`;

  return `<div class="stack">
    <div class="seg" style="grid-template-columns:repeat(2,1fr)"><button data-act="rotMode" data-k="week" class="${r.mode === 'week' ? 'on' : ''}">Weekly rotation</button><button data-act="rotMode" data-k="cycle" class="${r.mode === 'cycle' ? 'on' : ''}">Day cycle</button></div>
    ${startRow}
    <div class="row" style="gap:6px" role="group" aria-label="Shift brush"><button class="brush ${!r.brush ? 'on' : ''}" data-act="rotBrush" data-id="">Off</button>${shifts.map(s => `<button class="brush ${r.brush === s.id ? 'on' : ''}" data-act="rotBrush" data-id="${esc(s.id)}" style="${bstyle(s)};border:0">${esc(s.code)}</button>`).join('')}</div>
    <div class="card rotbox">${heads}<div class="rotgrid" role="group" aria-label="All weeks">${rows}</div>${nW > 6 ? '<div class="hint">All weeks are in this box. Scroll inside it to reach the rest.</div>' : ''}</div>
    <div class="chips" style="gap:6px">${tools.join('')}</div>
    <div class="card row">
      <span class="grow"><label for="rotAnchor" class="lbl" style="margin:0" id="l6">${r.mode === 'week' ? 'Week 1 starts' : 'Day 1 of the cycle is'}</label><span class="small mute" style="display:block">${r.mode === 'week' ? (anchor ? `${fmtDY(anchor)} (a ${DOWL[r.ws]})` : 'Pick any date inside your Week 1') : 'The date your first cycle day falls on'}</span></span>
      <input id="rotAnchor" type="date" value="${esc(r.anchorInput)}" aria-labelledby="l6" style="width:auto;min-height:44px">
    </div>
    ${pos && r.mode !== 'week' ? `<p class="hint" style="margin:0"><b>Today is in Day ${pos.index + 1} of ${r.days.length}.</b></p>` : ''}
    ${r.isNew && anchor ? `<p class="hint">The new schedule starts on ${fmtDY(anchor)}. Earlier dates keep your old schedule.</p>` : ''}
    ${r.err ? `<div class="note err" role="alert">${esc(r.err)}</div>` : ''}
    ${prev}</div>`;
}
function validateRot(r) {
  if (!r.anchorInput) return 'Choose the date your rotation starts.';
  if (!r.days.some(Boolean)) return 'Paint at least one working day.';
  return '';
}
export function commitRotation() {
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

// ---------- shift library ----------
VIEWS.shifts = () => `<div class="stack">${top('Shift library')}
  <p class="mute">These are the shifts you can paint into your rotation. Codes can be up to 3 characters and must be different from each other.</p>
  <div class="stack" style="gap:8px">${S.profile.shifts.map(s => `<button class="card row" data-act="seOpen" data-id="${esc(s.id)}" style="text-align:left;width:100%">${badge(s, '', 'flex:none;width:52px;height:44px;border-radius:11px;font-size:16px')}<span class="grow"><b style="display:block;font-size:15px">${esc(s.name)}</b><span class="small mute" style="display:block">${s.start} to ${s.end}${E.crossesMidnight(s) ? ' (next day)' : ''}</span><span class="small mute">${fmtH(E.paidHours(s))} paid · ${+s.brk || 0} min unpaid break</span></span>${E.crossesMidnight(s) ? moon(16) : ''}${ico('next', 18)}</button>`).join('')}</div>
  <button class="btn dash" data-act="seNew">${ico('plus', 18)} Add a shift</button>
  <div class="note">A night shift belongs to the day it starts. A PM on Monday shows on Monday and ends Tuesday at 07:00. Changing a code updates every day that uses it.</div></div>`;

VIEWS.shiftEdit = () => {
  const s = S.se, paid = E.paidHours({ start: s.start || '00:00', end: s.end || '00:00', brk: s.brk });
  return `<div class="stack">${top(s.id ? 'Edit shift' : 'New shift')}
    <div class="card">
      <div class="two">${field2('s1', 'Name', `<input id="seName" type="text" maxlength="40" value="${esc(s.name)}" aria-labelledby="s1">`)}${field2('s2', 'Code (up to 3)', `<input id="seCode" type="text" maxlength="3" value="${esc(s.code)}" autocapitalize="characters" aria-labelledby="s2">`)}</div>
      <div class="two">${field2('s3', 'Starts', `<input id="seStart" type="time" value="${esc(s.start)}" aria-labelledby="s3">`)}${field2('s4', 'Ends', `<input id="seEnd" type="time" value="${esc(s.end)}" aria-labelledby="s4">`)}</div>
      ${field2('s5', 'Unpaid break (minutes)', `<input id="seBrk" type="number" inputmode="numeric" min="0" max="240" value="${+s.brk || 0}" aria-labelledby="s5">`)}
      <div class="field"><div class="lbl">Color</div><div class="chips">${SWATCH.map(c => `<button class="brush ${c.toLowerCase() === String(s.color).toLowerCase() ? 'on' : ''}" data-act="seColor" data-c="${c}" aria-label="Color ${c}" style="background:${c};border:0;flex:none;min-width:44px"></button>`).join('')}<input id="seColor" type="color" value="${esc(s.color)}" aria-label="Custom color"></div></div>
      <div id="sePaid" class="note">${fmtH(paid)} paid${E.crossesMidnight({ start: s.start || '00:00', end: s.end || '00:00' }) ? ' · ends the next day' : ''}</div>
    </div>
    ${s.err ? `<div class="note err" role="alert">${esc(s.err)}</div>` : ''}
    ${s.id ? '<button class="btn danger" data-act="seDel">Delete this shift</button>' : ''}</div>
  <div class="actbar"><button class="btn" data-act="seSave">Save shift</button></div>`;
};
const field2 = (id, label, input) => `<div class="field"><label><span class="lbl" id="${id}">${label}</span>${input}</label></div>`;

function readShift() {
  const g = (id, k) => { const el = $(id); if (el) S.se[k] = el.value; };
  g('#seName', 'name'); g('#seCode', 'code'); g('#seStart', 'start'); g('#seEnd', 'end'); g('#seBrk', 'brk'); g('#seColor', 'color');
}

// ---------- actions ----------
Object.assign(ACT, {
  openRotImpl: () => { initRot(); go('rot'); },
  rotMode(d) {
    const r = S.rot;
    if (d.k === r.mode) return;
    r.mode = d.k;
    if (d.k === 'cycle') resizeDays(r, Math.min(28, r.days.length)); else resizeDays(r, Math.max(7, Math.ceil(r.days.length / 7) * 7));
    r.page = 0; render(false);
  },
  rotWeeksW(d) { const r = S.rot; r.mode = 'week'; resizeDays(r, Number(d.v) * 7); render(false); },
  rotPage(d) { const r = S.rot; r.page = Math.max(0, Math.min(Math.ceil(r.days.length / 7) - 1, (r.page || 0) + Number(d.n))); render(false); },
  rotPageTo(d) { S.rot.page = Number(d.w); render(false); },
  rotWs(d) { S.rot.ws = Number(d.v); render(false); },
  rotCycle: d => { const r = S.rot, n = Math.max(2, Math.min(28, r.days.length + Number(d.n))); resizeDays(r, n); render(false); },
  rotBrush: d => { S.rot.brush = d.id; render(false); },
  rotCell: d => { S.rot.days[Number(d.i)] = S.rot.brush; S.rot.err = ''; S.rot.page = Math.floor(Number(d.i) / 7); render(false); },
  rotTpl(d) {
    const r = S.rot, on = r.brush || S.profile.shifts[0].id, w = r.page || 0;
    if (d.k === 'pitman') { r.mode = 'cycle'; r.days = [1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0].map(x => (x ? on : '')); r.page = 0; }
    else if (d.k === '4on4off') { r.mode = 'cycle'; r.days = [1, 1, 1, 1, 0, 0, 0, 0].map(x => (x ? on : '')); r.page = 0; }
    else if (d.k === 'copy') { const src = r.days.slice(0, 7); r.days = r.days.map((_, i) => src[i % 7]); }
    else if (d.k === 'above') { if (w > 0) for (let k = 0; k < 7; k++) r.days[w * 7 + k] = r.days[(w - 1) * 7 + k]; else toast('Tap a week below Week 1 first'); }
    else if (d.k === 'clearWeek') { for (let k = 0; k < 7; k++) r.days[w * 7 + k] = ''; }
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

  shiftsOpen: () => go('shifts'),
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
  }
});

document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'rotAnchor' && S.rot) { S.rot.anchorInput = t.value; S.rot.err = ''; render(false); }
  else if (S.se && ['seColor'].includes(t.id)) { readShift(); render(false); }
  else if (S.se && ['seStart', 'seEnd', 'seBrk'].includes(t.id)) {
    readShift();
    const el = $('#sePaid');
    if (el) el.innerHTML = `${fmtH(E.paidHours({ start: S.se.start || '00:00', end: S.se.end || '00:00', brk: S.se.brk }))} paid`;
  }
});
