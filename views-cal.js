// Calendar, day details, own swaps and upcoming.
import {
  E, B, S, VIEWS, ACT, SWIPE, $, esc, MONTHS, DOWL, fmtMD, fmtD, fmtDY, fmtH, shortT, timeRange, range, dowFrom, ico, moon, starFill,
  bstyle, badge, LV, isLvType, lvStyle, lvOf, leaveText, holiday, bankOf, bankStat, nextShift, shiftTimes, leaveGroups, timeOffIdeas,
  toast, top, nav, demoNote, field, sw, render, go, back, commitDay, clean, TYPE_KEYS, todayParts, ws, MON, roll
} from './core.js';

const unread = () => Object.values(S.notes || {}).filter(n => !n.read).length;

// ---------- pieces ----------
function todayCard() {
  const C = S.C, today = E.todayIso();
  if (!C.patterns.length) {
    return `<button class="today" data-act="openRot"><span class="bdg" style="background:#fff;color:#17695A">${ico('cal', 26)}</span><span class="grow"><span class="t1">Today · ${fmtD(today)}</span><span class="t2">Set up your rotation</span><span class="t3">Pick your shifts so they show here</span></span></button>`;
  }
  const ti = E.dayInfo(today, C), tsh = C.shifts[ti.work], tbase = C.shifts[ti.base], pos = E.rotationPosition(today, C.patterns);
  const lv = isLvType(ti.type) ? lvOf(ti.override) : null;
  const head = tsh ? `<span class="bdg" style="${bstyle(tsh)}">${esc(tsh.code)}</span>` : `<span class="bdg" style="background:#fff;color:#17695A;font-size:14px">${lv ? esc(lv.l) : 'OFF'}</span>`;
  const title = tsh ? `${esc(tsh.name)} · ${tsh.start} to ${tsh.end}` : lv ? esc(lv.name) : 'Day off';
  const sub = tsh ? `${fmtH(ti.hours)} paid${pos ? ` · Week ${pos.week} of ${pos.weeks}` : ''}` : (tbase && lv ? `Instead of ${esc(tbase.code)}` : 'Enjoy it');
  const np = E.payDates(S.profile, today, E.addDays(today, 70))[0];
  return `<button class="today" data-act="pickDay" data-d="${today}" aria-label="Today, details">${head}<span class="grow"><span class="t1">Today · ${fmtD(today)}</span><span class="t2">${title}</span><span class="t3">${sub}</span></span>${np ? `<span class="tr"><span class="t1">Next pay day</span><span class="t2">${fmtMD(np)}</span></span>` : ''}</button>`;
}

function bankChips(vertical) {
  return `<div class="bchips ${vertical ? 'vert' : ''}" role="group" aria-label="Leave banks">${S.banks.map((b, i) => {
    const st = bankStat(b.id), main = B.fmtAmt(b, st.after), tod = B.fmtAmt(b, st.left);
    const sub = i === 0 ? `to book · ${tod} today` : st.booked ? `${tod} today` : 'left';
    return `<button class="bchip ${i === 0 ? 'big' : ''}" data-act="openBank" data-id="${esc(b.id)}" style="--bc:${esc(b.color)}" aria-label="${esc(b.name)}: ${main} available to book, ${tod} today"><span class="bn"><i></i>${esc(b.name.length > 10 && i ? b.short : b.name)}</span><b>${main}</b><small>${sub}</small></button>`;
  }).join('')}</div>`;
}

function nextList() {
  const today = E.todayIso(), out = [];
  for (let n = 0; n < 40 && out.length < 8; n++) {
    const d = E.addDays(today, n), i = E.dayInfo(d, S.C), sh = S.C.shifts[i.work];
    if (n === 0 && sh) { const ns = nextShift(); if (!ns || ns.date !== d) continue; }
    if (sh) out.push({ d, when: n === 0 ? 'Today' : fmtD(d), head: badge(sh, '', 'width:44px;height:44px;border-radius:12px;font-size:14px'), t: `${esc(sh.name)}`, s: `${sh.start} to ${sh.end} · ${fmtH(i.hours)} paid` });
    else if (isLvType(i.type) && i.type !== 'OFF') { const lv = lvOf(i.override); out.push({ d, when: fmtD(d), head: `<span class="bdg" style="${lvStyle(lv)};width:44px;height:44px;border-radius:12px;font-size:12px">${esc(lv.l)}</span>`, t: esc(lv.name) + ' (booked)', s: S.C.shifts[i.base] ? `Normally ${esc(S.C.shifts[i.base].code)}` : 'Time off' }); }
  }
  return `<div class="nextlist" aria-label="Next shifts">${out.map(e => `<button class="nx" data-act="openDay" data-d="${e.d}">${e.head}<span class="grow"><span class="t">${e.t}</span><span class="s">${e.s}</span></span><span class="w">${e.when}</span></button>`).join('')}</div>`;
}

function daySummary(date) {
  const C = S.C, i = E.dayInfo(date, C), o = i.override || {}, hn = holiday(date);
  const wsh = C.shifts[i.work], bsh = C.shifts[i.base], shown = wsh || (i.type === 'SWAP_OUT' ? bsh : null);
  const lv = isLvType(i.type) ? lvOf(o) : null;
  const pos = E.rotationPosition(date, C.patterns);
  let head;
  if (shown) head = `<span class="bdg big" style="${bstyle(shown)}">${esc(shown.code)}</span><span class="grow"><span class="t1">${fmtDY(date)}${pos && i.base ? ` · Week ${pos.week}` : ''}</span><span class="t2">${esc(shown.name)}${i.type === 'SWAP_OUT' ? ' (given away)' : ''}</span><span class="t3">${shiftTimes(shown, date)} · ${fmtH(i.type === 'SWAP_OUT' ? i.baseHours : i.hours)} paid</span></span>`;
  else if (lv) head = `<span class="bdg big" style="${lvStyle(lv)};font-size:14px">${esc(lv.l)}</span><span class="grow"><span class="t1">${fmtDY(date)}</span><span class="t2">${esc(lv.name)}${date > E.todayIso() ? ' (booked)' : ''}</span><span class="t3">${bsh ? 'Normally ' + esc(bsh.code) + ' ' + bsh.start + ' to ' + bsh.end : 'Day off'}</span></span>`;
  else head = `<span class="bdg big" style="background:var(--track);color:var(--mute);font-size:14px">OFF</span><span class="grow"><span class="t1">${fmtDY(date)}</span><span class="t2">Day off</span><span class="t3">${C.patterns.length ? 'No shift is scheduled' : 'Set up your rotation first'}</span></span>`;
  let leaveBox = '';
  if (lv && o.type !== 'OFF') {
    const sp = B.daySplits(o)[0], bk = sp && bankOf(sp.bank);
    if (bk) {
      const withIt = bankStat(bk.id).after, without = bankStat(bk.id, date).after;
      leaveBox = `<div class="lvbox" style="--bc:${esc(bk.color)}"><div class="row between"><span class="lbn"><i></i>${esc(leaveText(o))}</span></div><div class="row between small"><span>Available to book before</span><b>${B.fmtAmt(bk, without)}</b></div><div class="row between small"><span>Available to book after</span><b>${B.fmtAmt(bk, withIt)}</b></div></div>`;
    }
  }
  const acts = [['VAC', 'Vacation', 'sun'], ['SICK', 'Sick', 'plus'], ['LEAVE', 'Other bank', 'leave'], ['SWAP', 'Swap shift', 'swap'], ['EXTRA', 'Extra shift', 'clock'], ['OT', 'Overtime', 'trend']];
  return `<div class="sumhead">${head}</div>
    ${hn ? `<div class="note hol small"><b>${esc(hn)}</b> · stat holiday</div>` : ''}
    ${leaveBox}
    <div class="actions">${acts.map(([k, l, ic]) => `<button class="act" data-act="selGo" data-k="${k}" data-d="${date}">${ico(ic)}${l}</button>`).join('')}</div>
    <div class="two">${isLvType(i.type) ? `<button class="btn sec dng" data-act="selClear" data-d="${date}">Remove ${esc(lv.l.toLowerCase())}</button>` : `<button class="btn sec" data-act="selGo" data-k="LIEU" data-d="${date}">Lieu day</button>`}<button class="btn sec" data-act="openDay" data-d="${date}">Full details</button></div>`;
}

// ---------- calendar ----------
VIEWS.cal = () => {
  const C = S.C, p = S.profile, today = E.todayIso(), { y, m } = S.month, w = ws();
  const first = E.ymd(y, m, 1), dim = E.daysInMonth(y, m), lead = E.weekOffset(first, w), rows = Math.ceil((lead + dim) / 7);
  const pays = new Set(E.payDates(p, first, E.ymd(y, m, dim)));
  let cells = '';
  for (let i = 0; i < lead; i++) cells += '<span class="cell blank"></span>';
  for (let d = 1; d <= dim; d++) {
    const date = E.ymd(y, m, d), i = E.dayInfo(date, C), o = i.type;
    const prev = E.dayInfo(E.addDays(date, -1), C), psh = prev.isWorking && C.shifts[prev.work];
    const cont = psh && E.crossesMidnight(psh);
    let label = '', cls = '', st = '', aria = '', tm = '';
    const wsh = C.shifts[i.work];
    if (isLvType(o)) { const lv = lvOf(i.override); label = esc(lv.l); st = lvStyle(lv); cls = 'sm'; aria = lv.name; if (o !== 'OFF') tm = date > today ? 'booked' : `-${+(Number(i.override.hours) || 0)}h`; }
    else if (o === 'SWAP_OUT') { const b = C.shifts[i.base]; label = b ? esc(b.code) : '-'; st = b ? bstyle(b) : ''; cls = 'out dash'; aria = 'shift given away'; }
    else if (wsh) { label = esc(wsh.code); st = bstyle(wsh); tm = timeRange(wsh); if (o === 'SWAP_IN' || o === 'EXTRA') cls = 'dash'; aria = `${wsh.name} shift${o === 'SWAP_IN' ? ', picked up' : o === 'EXTRA' ? ', extra shift' : ''}`; }
    else aria = 'day off';
    if (!tm && cont) tm = `ends ${shortT(psh.end)}`;
    const hn = holiday(date);
    const ic = [hn ? starFill() : '', pays.has(date) ? '<span>$</span>' : '', o === 'SWAP_OUT' || o === 'SWAP_IN' || o === 'EXTRA' ? ico('swap', 11) : '', o === 'OT' ? '<span>OT</span>' : ''].join('');
    cells += `<button class="cell ${date === today ? 'now' : ''} ${date === S.sel ? 'sel' : ''} ${hn ? 'hol' : ''}" data-act="pickDay" data-d="${date}" aria-label="${DOWL[E.weekday(date)]} ${MONTHS[m - 1]} ${d}, ${esc(aria)}${hn ? ', ' + esc(hn) : ''}${pays.has(date) ? ', pay day' : ''}${cont ? ', previous night shift ends this morning' : ''}">
      ${cont ? `<i class="cont" style="background:${esc(psh.color)}"></i>` : ''}
      <span class="top2"><span class="dn">${d}</span><span class="ic">${wsh && E.crossesMidnight(wsh) ? moon() : ''}${ic}</span></span><span class="bdg ${cls}" style="${st}">${label || '&nbsp;'}</span><span class="tm">${tm}</span></button>`;
  }
  const legend = (p.shifts || []).map(s => `<span>${badge(s)}${shortT(s.start)} to ${shortT(s.end)}</span>`).join('');
  const n = unread();
  const sel = S.sel;
  const wide = window.matchMedia('(min-width:700px)').matches;
  return `${demoNote()}
  <div class="calpage" style="--rows:${rows}">
    <div class="calmain">
      <div class="mh"><button class="link" data-act="thisMonth" style="text-decoration:none;color:var(--ink)" aria-label="Go to this month"><span style="font-size:28px;font-weight:800;letter-spacing:-.02em">${MONTHS[m - 1]}</span><span class="yr">${y}</span></button>
        <span class="row" style="gap:6px"><button class="iconbtn bellbtn" data-act="bell" aria-label="Notifications${n ? ', ' + n + ' new' : ''}">${ico('bell')}${n ? `<span class="bdgct">${n}</span>` : ''}</button><button class="iconbtn" data-act="month" data-n="-1" aria-label="Previous month">${ico('back')}</button><button class="iconbtn" data-act="month" data-n="1" aria-label="Next month">${ico('next')}</button></span></div>
      <div class="narrowonly stack tight">${todayCard()}${bankChips(false)}</div>
      <div class="gridwrap swipe" data-swipe="cal">
        <div class="cal dowrow">${[0, 1, 2, 3, 4, 5, 6].map(k => `<div class="dow">${dowFrom(w, k).slice(0, 2)}</div>`).join('')}</div>
        <div class="cal calgrid ${S.slide ? 'slide-' + S.slide : ''}">${cells}</div>
      </div>
      <div class="narrowonly nextwrap">${nextList()}</div>
      <div class="legend">${legend}</div>
      <div class="legend"><span>${starFill()} Stat holiday</span><span><b style="color:var(--acc)">$</b> Pay day</span><span>${moon()} Night shift</span><span>${ico('swap', 11)} Swap or extra</span><span>Bar = last night's shift ends</span></div>
    </div>
    <aside class="calside" aria-label="Day details"><div class="sidecard">${daySummary(sel || today)}</div><h2 class="mute" style="margin:4px 2px 0">Banks</h2>${bankChips(true)}${todayCard()}<p class="small mute">Swipe the calendar left or right to change month.</p></aside>
  </div>
  ${sel && !wide ? `<div class="sheetbk" data-act="selClose"></div><section class="daysheet" aria-label="${fmtD(sel)}"><div class="grab"></div>${daySummary(sel)}<button class="btn sec" data-act="selClose" style="margin-top:8px">Close</button></section>` : ''}
  ${nav('cal')}`;
};
SWIPE.cal = n => ACT.month({ n });

Object.assign(ACT, {
  pickDay: d => { S.sel = d.d; render(false); },
  selClose: () => { S.sel = null; render(false); },
  openDay: d => go('day', { date: d.d }),
  openRot: () => ACT.openRotImpl(),
  bell: () => go('notices'),
  openBank: d => go('bankDetail', { id: d.id }),
  month: d => { let { y, m } = S.month; m += Number(d.n); if (m < 1) { m = 12; y--; } if (m > 12) { m = 1; y++; } S.month = { y, m }; S.slide = Number(d.n) > 0 ? 'l' : 'r'; render(false); },
  thisMonth: () => { S.month = todayParts(); render(false); },
  selClear: d => { commitDay(d.d, o => TYPE_KEYS(o)); toast('Removed'); },
  selGo(d) {
    const date = d.d, i = E.dayInfo(date, S.C), k = d.k;
    if (k === 'LIEU') { commitDay(date, o => ({ ...TYPE_KEYS(o), type: 'LIEU', hours: i.baseHours })); toast('Marked as a lieu day'); return; }
    if (k === 'SWAP') { S.sw = { person: '', note: '', shiftId: '' }; go('swap', { date, mode: i.base ? 'gave' : 'took' }); return; }
    if (k === 'EXTRA') { S.sw = { person: '', note: '', shiftId: '' }; go('swap', { date, mode: 'extra' }); return; }
    go('day', { date, panel: k, pbank: k === 'VAC' ? 'vac' : k === 'SICK' ? 'sick' : '' });
  }
});

// ---------- day details ----------
const defaultBank = pn => (pn === 'VAC' ? 'vac' : pn === 'SICK' ? 'sick' : (S.banks.find(b => b.id !== 'vac' && b.id !== 'sick') || S.banks[0]).id);
VIEWS.day = () => {
  const date = S.p.date, C = S.C, i = E.dayInfo(date, C), o = i.override || {}, hn = holiday(date);
  const wsh = C.shifts[i.work], bsh = C.shifts[i.base];
  const prev = E.dayInfo(E.addDays(date, -1), C), psh = prev.isWorking && C.shifts[prev.work];
  const pos = E.rotationPosition(date, C.patterns);
  const shown = wsh || (i.type === 'SWAP_OUT' ? bsh : null);
  let card;
  const chipCss = 'background:var(--soft);color:var(--soft-ink);padding:0 10px';
  if (shown) {
    const extra = i.type === 'SWAP_OUT' ? `Given away${o.person ? ' to ' + esc(o.person) : ''}` : i.type === 'SWAP_IN' ? `Picked up${o.person ? ' from ' + esc(o.person) : ''}` : i.type === 'EXTRA' ? 'Extra shift' : i.type === 'OT' ? `Overtime +${fmtH(o.hours)}${o.toBank && bankOf(o.toBank) ? ' into ' + esc(bankOf(o.toBank).name) : ''}` : '';
    card = `<div class="card"><div class="row" style="gap:14px"><span class="bdg" style="${bstyle(shown)};width:60px;height:60px;border-radius:14px;font-size:22px">${esc(shown.code)}</span>
      <div class="grow"><div style="font-size:18px;font-weight:800">${esc(shown.name)}</div><div class="mute">${shiftTimes(shown, date)}</div></div>${E.crossesMidnight(shown) ? moon(20) : ''}</div>
      <div class="chips" style="margin-top:12px;gap:8px">${extra ? `<span class="tag" style="${chipCss}">${extra}</span>` : ''}<span class="tag" style="${chipCss}">${fmtH(i.type === 'SWAP_OUT' ? i.baseHours : i.hours)} paid</span>${pos && i.base ? `<span class="tag" style="${chipCss}">${pos.pattern.mode === 'week' ? `Week ${pos.week} · ${DOWL[E.weekday(date)]}` : `Day ${pos.index + 1} of ${pos.pattern.days.length}`}</span>` : ''}</div>
      ${E.crossesMidnight(shown) ? `<p class="hint">This shift belongs to ${fmtMD(date)}, the date it starts. It ends ${fmtMD(E.addDays(date, 1))} at ${shown.end}.</p>` : ''}</div>`;
  } else if (isLvType(i.type)) {
    const lv = lvOf(o);
    card = `<div class="card"><div class="row" style="gap:14px"><span class="bdg" style="${lvStyle(lv)};width:60px;height:60px;border-radius:14px;font-size:14px">${esc(lv.l)}</span><div class="grow"><div style="font-size:18px;font-weight:800">${esc(lv.name)}</div><div class="mute">${i.type === 'OFF' ? 'You asked for this day off' : esc(leaveText(o))}${bsh ? ` · was ${esc(bsh.code)}` : ''}</div></div></div></div>`;
  } else {
    card = `<div class="card"><div style="font-size:18px;font-weight:800">${C.patterns.length ? 'Day off' : 'No rotation yet'}</div><div class="mute">${C.patterns.length ? 'No shift is scheduled.' : 'Set up your rotation to see shifts here.'}</div></div>`;
  }
  const A = [['VAC', 'Vacation', 'sun'], ['SICK', 'Sick', 'plus'], ['LIEU', 'Lieu day', 'star'], ['LEAVE', 'Other bank', 'leave'], ['OFF', 'Request off', 'off'], ['SWAP', 'Swap shift', 'swap'], ['EXTRA', 'Extra shift', 'clock'], ['OT', 'Overtime', 'trend'], ['CLEAR', 'Clear', 'x']];
  let panel = '';
  const pn = S.p.panel;
  if (pn) {
    const isOT = pn === 'OT';
    const bid = S.p.pbank || (isOT ? '' : defaultBank(pn)), bank = bankOf(bid);
    const existing = o.type && isLvType(o.type) && o.hours !== undefined && !isOT ? o.hours : (isOT ? (o.type === 'OT' ? o.hours : 1) : i.baseHours);
    const st = bank ? bankStat(bank.id, date) : null;
    const title = isOT ? 'Overtime' : pn === 'VAC' ? 'Book vacation' : pn === 'SICK' ? 'Mark sick' : 'Use another bank';
    const pick = !isOT && pn === 'LEAVE' ? `<div class="field"><div class="lbl">Take it from</div>${roll('panelBank', S.banks.map(b => [b.id, b.name]), bid, '', 'Bank')}</div>` : '';
    const otPick = isOT ? `<div class="field"><div class="lbl">Add these hours to a bank (optional)</div>${roll('panelBank', [['', 'No bank'], ...S.banks.map(b => [b.id, b.name])], bid, '', 'Bank')}</div>` : '';
    const unit = bank ? bank.unit : 'h', dh = bank ? bank.dayHours : 7.5;
    panel = `<div class="card stack"><h2>${title}</h2>${pick}${otPick}
      ${field(`<span id="lh">${isOT ? 'Extra hours worked' : 'Hours to take off the balance'}</span>`, `<input id="panelHours" type="number" inputmode="decimal" min="0" step="0.25" value="${+existing}" aria-labelledby="lh">`)}
      ${bank && !isOT ? `<div id="panelInfo" class="note" data-left="${st.after}" data-unit="${unit}" data-dh="${dh}" data-name="${esc(bank.name)}">${panelInfo(bank, st.after, +existing)}</div>` : ''}
      ${bank && isOT ? `<div class="note small">${esc(bank.name)} goes up by ${B.fmtAmt(bank, B.toUnit(bank, +existing))}.</div>` : ''}
      <div class="two"><button class="btn sec" data-act="panelCancel">Cancel</button><button class="btn" data-act="panelSave">Save</button></div></div>`;
  }
  return `<div class="stack">${top(fmtDY(date))}
    ${hn ? `<div class="note hol"><b>${esc(hn)}</b> · stat holiday<br>${wsh ? 'You are scheduled to work. Premium pay or a lieu day may apply.' : 'You are not working this day.'}</div>` : ''}
    ${psh && E.crossesMidnight(psh) ? `<div class="note small">${moon(12)} Your ${esc(psh.code)} shift from ${fmtD(E.addDays(date, -1))} ends this morning at ${psh.end}.</div>` : ''}
    ${card}
    <div class="actions">${A.map(([k, l, ic]) => `<button class="act" data-act="dayAct" data-k="${k}">${ico(ic)}${l}</button>`).join('')}</div>
    ${panel}
    ${hn || o.lieu ? `<div class="card row between"><div><div style="font-weight:700">Track a lieu day</div><div class="small mute">Adds 1 lieu day to your Lieu bank</div></div>${sw(!!o.lieu, 'lieu', '', 'Track a lieu day')}</div>` : ''}
    <div><label for="dayNote">Note for this day</label><textarea id="dayNote" maxlength="500" placeholder="Add a note">${esc(o.note || '')}</textarea></div>
  </div>`;
};
function panelInfo(bank, left, hours) {
  const amt = B.toUnit(bank, hours);
  return `${B.fmtAmt(bank, amt)} comes off ${esc(bank.name)}, leaving <b>${B.fmtAmt(bank, left - amt)}</b> to book.`;
}
document.addEventListener('input', e => {
  if (e.target.id !== 'panelHours') return;
  const info = $('#panelInfo');
  if (!info) return;
  const h = Math.max(0, Number(e.target.value) || 0), bank = { unit: info.dataset.unit, dayHours: Number(info.dataset.dh), name: info.dataset.name };
  info.innerHTML = panelInfo(bank, Number(info.dataset.left), h);
});
Object.assign(ACT, {
  dayAct(d) {
    const date = S.p.date, i = E.dayInfo(date, S.C), k = d.k;
    if (k === 'VAC' || k === 'SICK' || k === 'LEAVE' || k === 'OT') { S.p.panel = k; S.p.pbank = k === 'VAC' ? 'vac' : k === 'SICK' ? 'sick' : k === 'OT' ? '' : defaultBank('LEAVE'); render(false); return; }
    if (k === 'LIEU') { commitDay(date, o => ({ ...TYPE_KEYS(o), type: 'LIEU', hours: i.baseHours })); toast('Marked as a lieu day'); return; }
    if (k === 'OFF') { commitDay(date, o => ({ ...TYPE_KEYS(o), type: 'OFF' })); toast('Marked as a day off'); return; }
    if (k === 'SWAP') { S.sw = { person: '', note: '', shiftId: '' }; go('swap', { date, mode: i.base ? 'gave' : 'took' }); return; }
    if (k === 'EXTRA') { S.sw = { person: '', note: '', shiftId: '' }; go('swap', { date, mode: 'extra' }); return; }
    if (k === 'CLEAR') { commitDay(date, o => TYPE_KEYS(o)); S.p.panel = null; toast('Cleared'); }
  },
  panelBank: d => { const h = $('#panelHours'); S.p.pbank = d.v; S.p.keepHours = h ? h.value : ''; render(false); if (S.p.keepHours !== '' && $('#panelHours')) { $('#panelHours').value = S.p.keepHours; $('#panelHours').dispatchEvent(new Event('input', { bubbles: true })); } },
  panelCancel: () => { S.p.panel = null; render(false); },
  panelSave() {
    const date = S.p.date, k = S.p.panel, h = Math.max(0, Number($('#panelHours').value) || 0);
    if (k === 'OT') { const to = S.p.pbank || ''; commitDay(date, o => ({ ...TYPE_KEYS(o), type: 'OT', hours: h, toBank: to || undefined })); }
    else {
      const bank = bankOf(S.p.pbank || defaultBank(k)), type = B.typeForBank(bank);
      commitDay(date, o => ({ ...TYPE_KEYS(o), type, bank: type === 'LEAVE' ? bank.id : undefined, hours: h }));
    }
    S.p.panel = null; toast('Saved');
  },
  lieu: () => { const date = S.p.date; commitDay(date, o => ({ ...o, lieu: !o.lieu })); }
});

// ---------- swap / extra shift (your own record) ----------
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
    sum = bsh ? `Hours: <b>-${fmtH(i.baseHours)}</b>. ${fmtMD(date)} will show a swap marker.` : '';
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
    <button class="btn sec" data-act="askColleague">${ico('users', 18)} Ask a colleague to swap with me in the app</button>
    <h2>Swap history</h2>
    <div class="card tight">${hist.length ? hist.map(([d, o]) => { const sh = C.shifts[o.shiftId]; return `<button class="item" data-act="openDay" data-d="${d}">${sh ? badge(sh, '', 'min-width:38px;height:30px;font-size:12px') : '<span class="tag" style="background:var(--track)">?</span>'}<span class="grow"><span class="t" style="display:block">${o.type === 'SWAP_OUT' ? 'Given' + (o.person ? ' to ' + esc(o.person) : '') : o.type === 'SWAP_IN' ? 'Picked up' + (o.person ? ' from ' + esc(o.person) : '') : 'Extra shift'}</span><span class="s">${fmtDY(d)}</span></span><b>${o.type === 'SWAP_OUT' ? '-' : '+'}${fmtH(o.hours)}</b></button>`; }).join('') : '<p class="mute" style="padding:16px 0">No swaps yet. Swaps and extra shifts you save appear here.</p>'}</div>
  </div>
  <div class="actbar"><button class="btn" data-act="swSave">Save</button></div>`;
};
function readSwap() {
  const g = id => { const el = $(id); return el ? el.value : null; };
  const person = g('#swPerson'), note = g('#swNote'), date = g('#swDate');
  if (person !== null) S.sw.person = person;
  if (note !== null) S.sw.note = note;
  if (date) S.p.date = date;
}
Object.assign(ACT, {
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
  }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'swDate') { readSwap(); render(false); }
  if (t.id === 'dayNote') { commitDay(S.p.date, o => ({ ...o, note: t.value.trim().slice(0, 500) })); toast('Note saved'); }
});

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
  for (const g of leaveGroups()) if (g.end >= today && g.start <= E.addDays(today, 60)) ev.push({ d: g.start < today ? today : g.start, t: `${g.lv.name}, ${g.n} shift${g.n === 1 ? '' : 's'}`, s: `${range(g.start, g.end)} · ${fmtH(g.hours)}`, tag: g.lv.l, bg: g.lv.bg });
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
    <div class="card tight">${ev.length ? ev.slice(0, 10).map(e => `<button class="item" data-act="openDay" data-d="${e.d}"><span style="flex:none;width:44px;text-align:center"><span class="small mute" style="font-weight:700;display:block">${MON[E.parts(e.d).m - 1].toUpperCase()}</span><b style="font-size:20px;line-height:1.1">${E.parts(e.d).d}</b></span><span class="grow"><span class="t" style="display:block">${esc(e.t)}</span><span class="s">${e.s}</span></span><span class="tag" style="background:${e.bg}">${esc(e.tag)}</span></button>`).join('') : '<p class="mute" style="padding:16px 0">Nothing coming up in the next 60 days.</p>'}</div></div>${nav('up')}`;
};
