// Leave: banks overview, ledger, add or edit a bank, and booking time off.
import {
  E, B, S, VIEWS, ACT, $, esc, MON, MONTHS, fmtMD, fmtD, fmtDY, fmtH, range, ico, badge, lvStyle, lvOf, leaveGroups,
  bankOf, bankStat, toast, top, nav, demoNote, field, sw, num, roll, render, go, back, setProfile, setProfileBanks, empty, commitDays, memGet, memSet
} from './core.js';

const COLORS = B.BANK_COLORS;
const bankIcon = b => `<span class="bk-ic" style="background:${B.softColor(b.color)}"><i style="background:${esc(b.color)}"></i></span>`;
const rowSub = b => {
  const bits = [b.unit === 'd' ? 'Days' : 'Hours'];
  if (b.earn.rule !== 'none' && b.earn.amount > 0) bits.push(`+${B.fmtAmt(b, b.earn.amount)} ${b.earn.rule === 'pay' ? 'each pay day' : 'each month'}`);
  if (b.grant.on && b.grant.amount > 0) bits.push(`+${B.fmtAmt(b, b.grant.amount)} on ${MON[+b.grant.date.slice(0, 2) - 1]} ${+b.grant.date.slice(3)}`);
  return bits.join(' · ');
};
const usedThisYear = (b) => {
  const y = String(E.parts(E.todayIso()).y); let h = 0;
  for (const [d, o] of Object.entries(S.days)) { if (!d.startsWith(y) || d > E.todayIso()) continue; for (const sp of B.daySplits(o)) if (sp.bank === b.id) h += sp.legacyDay ? (b.unit === 'd' ? 1 : b.dayHours) : B.toUnit(b, sp.h); }
  return h;
};

// ---------- overview ----------
VIEWS.leave = () => {
  const p = S.profile, today = E.todayIso(), banks = S.banks, hero = banks[0], hs = bankStat(hero.id);
  const yearly = Number(p.vacYearly) || 0;
  let warn = '';
  if (p.deadline && p.carryLimit !== '' && p.carryLimit !== null && hero.id === 'vac') {
    const md = p.deadline.slice(5);
    let dl = `${E.parts(today).y}-${md}`;
    if (dl < today) dl = `${E.parts(today).y + 1}-${md}`;
    let booked = 0;
    for (const [d, o] of Object.entries(S.days)) if (d > today && d <= dl) for (const sp of B.daySplits(o)) if (sp.bank === 'vac') booked += B.toUnit(hero, sp.h);
    let earn = 0;
    if (hero.earn.rule === 'pay' && hero.earn.amount > 0) earn = hero.earn.amount * E.payDates(p, E.addDays(today, 1), dl).length;
    const excess = hs.left + earn - booked - Number(p.carryLimit || 0);
    if (excess > 0.01) warn = `<div class="note warn row" style="align-items:flex-start"><span style="flex:none;margin-top:1px">${ico('warn', 18)}</span><span><b>Use ${B.fmtAmt(hero, excess)} by ${fmtDY(dl)}</b> or it does not carry over (limit ${B.fmtAmt(hero, Number(p.carryLimit))}).</span></div>`;
  }
  const np = hero.earn.rule === 'pay' && hero.earn.amount > 0 ? E.payDates(p, today, E.addDays(today, 45))[0] : null;
  const pct = hs.left > 0 ? Math.max(0, Math.min(100, hs.after / hs.left * 100)) : 0;
  const rows = leaveGroups().sort((a, b) => (a.start < b.start ? 1 : -1)).slice(0, 14);
  return `${demoNote()}<div class="stack"><div class="top"><h1 class="grow">Leave and banks</h1><button class="btn sec slim" data-act="bookOpen">Book time off</button></div>
    <section class="card herobank" style="--bc:${esc(hero.color)}"><div class="row between"><b class="bn"><i></i>${esc(hero.name)}</b><span class="pill">${hero.unit === 'd' ? 'days' : 'hours'}</span></div>
      <div class="small mute" style="font-weight:700;margin-top:8px">Available to book</div>
      <div class="big">${B.fmtAmt(hero, hs.after)}</div>
      <div class="small mute">Balance today ${B.fmtAmt(hero, hs.left)}${hs.booked ? `, minus ${B.fmtAmt(hero, hs.booked)} already booked` : ''}</div>
      <div class="bar2 two" style="margin:10px 0" role="img" aria-label="${B.fmtAmt(hero, hs.after)} available, ${B.fmtAmt(hero, hs.booked)} booked"><i style="width:${pct}%"></i><i class="bk" style="width:${100 - pct}%"></i></div>
      ${yearly ? `<div class="small mute">of ${B.fmtAmt(hero, yearly)} this year</div>` : ''}
      <div class="two" style="margin-top:6px"><div class="mini"><span>${np ? `Next pay day, ${fmtMD(np)}` : 'Earning'}</span><b>${np ? '+' + B.fmtAmt(hero, hero.earn.amount) : esc(rowSub(hero).split(' · ').slice(1).join(' · ') || 'Manual')}</b></div><div class="mini"><span>Used so far this year</span><b>${B.fmtAmt(hero, usedThisYear(hero))}</b></div></div>
      <button class="btn" style="margin-top:12px;background:var(--bc)" data-act="openBank" data-id="${esc(hero.id)}">See ledger</button></section>
    ${warn}
    <div class="stack" style="gap:8px">${banks.slice(1).map(b => { const st = bankStat(b.id); return `<button class="card row bkrow" data-act="openBank" data-id="${esc(b.id)}" aria-label="${esc(b.name)}, ${B.fmtAmt(b, st.after)} available">${bankIcon(b)}<span class="grow"><b style="display:block;font-size:14px">${esc(b.name)}</b><span class="small mute">${esc(rowSub(b))}</span></span><span class="r"><b style="font-size:20px">${B.fmtAmt(b, st.after)}</b><span class="small mute">${st.booked ? B.fmtAmt(b, st.left) + ' today' : 'none booked'}</span></span></button>`; }).join('')}</div>
    <button class="btn dash" data-act="bankNew">${ico('plus', 18)} Add your own bank</button>
    <h2>Time off</h2>
    <div class="card tight">${rows.length ? rows.map(g => `<button class="item" data-act="openDay" data-d="${g.start}"><span class="tag" style="${lvStyle(g.lv)};min-width:44px;height:30px">${esc(g.lv.l)}</span><span class="grow"><span class="t" style="display:block">${g.start === g.end ? fmtDY(g.start) : range(g.start, g.end)}</span><span class="s">${esc(g.lv.name)} · ${g.end > today ? 'booked' : 'taken'} · ${g.n} shift${g.n === 1 ? '' : 's'}</span></span><b>-${fmtH(g.hours)}</b></button>`).join('') : empty('leave', 'No time off yet', 'Tap a day on the calendar, or book a stretch of days.', 'Book time off', 'bookOpen')}</div></div>${nav('leave')}`;
};

// ---------- ledger ----------
VIEWS.bankDetail = () => {
  const id = S.p.id, bank = bankOf(id);
  if (!bank) return `<div class="stack">${top('Bank')}<div class="note">This bank was removed.</div></div>`;
  const st = bankStat(id), flt = S.p.flt || 'all', today = E.todayIso();
  const keep = r => flt === 'all' || (flt === 'earn' && (r.kind === 'earn' || r.kind === 'credit')) || (flt === 'used' && r.kind === 'use' && !r.future) || (flt === 'booked' && r.kind === 'use' && r.future);
  const list = st.rows.filter(keep).slice().reverse();
  let todayDone = false;
  const rowHtml = r => `<div class="lrow ${r.future ? 'fut' : ''}"><div class="ld"><b>${fmtMD(r.date)}</b><span>${E.weekday(r.date) >= 0 ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][E.weekday(r.date)] : ''}</span></div><div class="grow"><div class="lt">${esc(r.title)}${r.future && r.kind === 'earn' ? ' (projected)' : ''}</div><div class="s">${esc(r.sub)}</div></div><div class="la"><b class="${r.amt > 0 ? 'pos' : r.amt < 0 ? 'neg' : ''}">${r.amt > 0 ? '+' : ''}${B.fmtAmt(bank, r.amt)}</b><span>bal ${B.fmtAmt(bank, r.run)}</span></div></div>`;
  const out = [];
  for (const r of list) {
    if (!todayDone && !r.future && flt === 'all') { out.push(`<div class="lrow now"><div class="ld"><b>${fmtMD(today)}</b><span>Today</span></div><div class="grow"><div class="lt">Today's balance</div></div><div class="la"><b>${B.fmtAmt(bank, st.left)}</b></div></div>`); todayDone = true; }
    out.push(rowHtml(r));
  }
  if (!todayDone && flt === 'all') out.unshift(`<div class="lrow now"><div class="ld"><b>${fmtMD(today)}</b><span>Today</span></div><div class="grow"><div class="lt">Today's balance</div></div><div class="la"><b>${B.fmtAmt(bank, st.left)}</b></div></div>`);
  out.push(`<div class="lrow"><div class="ld"><b>${fmtMD(st.asOf)}</b><span>Start</span></div><div class="grow"><div class="lt">Opening balance</div><div class="s">You entered this</div></div><div class="la"><b>${B.fmtAmt(bank, st.opening)}</b></div></div>`);
  const flts = [['all', 'All'], ['earn', 'Earned'], ['used', 'Used'], ['booked', 'Booked']];
  const adj = S.p.adj ? `<div class="card stack"><h2>Correct the balance</h2><p class="small mute">Type what the bank holds today, for example from your pay stub. Time you booked for later days still comes off.</p>${field('<span id="ab">Balance today (' + (bank.unit === 'd' ? 'days' : 'hours') + ')</span>', `<input id="adjBal" type="number" inputmode="decimal" step="0.25" value="${+(+st.left).toFixed(2)}" aria-labelledby="ab">`)}<div class="two"><button class="btn sec" data-act="bankAdjustCancel">Cancel</button><button class="btn" data-act="bankAdjustSave">Save</button></div></div>` : '';
  return `<div class="stack">${top(bank.name + ' ledger', true, `<button class="btn sec slim" data-act="bankEditOpen" data-id="${esc(id)}">Edit bank</button>`)}
    <div class="two"><div class="card" style="border:2px solid ${esc(bank.color)}"><div class="small mute" style="font-weight:700">Available to book</div><div class="bigsm">${B.fmtAmt(bank, st.after)}</div></div><div class="card"><div class="small mute" style="font-weight:700">Balance today</div><div class="bigsm">${B.fmtAmt(bank, st.left)}</div></div></div>
    <div class="hroll" role="group" aria-label="Filter">${flts.map(([k, l]) => `<button class="hr ${flt === k ? 'on' : ''}" data-act="bankFlt" data-k="${k}">${l}</button>`).join('')}</div>
    <div class="card tight ledger">${out.join('')}</div>${adj}</div>
  <div class="actbar"><button class="btn" data-act="bankAdjust">Adjust balance (correct a number)</button></div>`;
};

// ---------- add or edit a bank ----------
const blankBank = () => ({ id: '', name: '', short: '', kind: 'custom', unit: 'd', dayHours: 7.5, color: COLORS[4], balance: 0, asOf: E.todayIso(), earn: { rule: 'none', amount: 0 }, grant: { on: false, amount: 0, date: '01-01' }, reset: false, err: '', more: false });
function readBE() {
  const b = S.bedit, g = id => { const el = $(id); return el ? el.value : null; };
  const set = (id, fn) => { const v = g(id); if (v !== null) fn(v); };
  set('#beName', v => { b.name = v; });
  set('#beDH', v => { b.dayHours = Number(v) || 7.5; });
  set('#beBal', v => { b.balance = Number(v) || 0; });
  set('#beAsOf', v => { b.asOf = v; });
  set('#beEarnAmt', v => { b.earn = { ...b.earn, amount: Math.max(0, Number(v) || 0) }; });
  set('#beGAmt', v => { b.grant = { ...b.grant, amount: Math.max(0, Number(v) || 0) }; });
  set('#beGM', v => { b.grant = { ...b.grant, date: E.pad(Number(v)) + b.grant.date.slice(2) }; });
  set('#beGD', v => { b.grant = { ...b.grant, date: b.grant.date.slice(0, 3) + E.pad(Number(v)) }; });
}
// What these settings will do, worked out live as you type
function bankPreview() {
  const b = B.normBank({ ...S.bedit, id: S.bedit.id || 'tmp', name: S.bedit.name || 'Bank' });
  const st = bankStat(b.id, null, b), chips = [];
  for (const r of st.rows) {
    if (!r.future || !(r.kind === 'earn' || r.kind === 'credit')) continue;
    const grant = r.title === 'Yearly amount added';
    chips.push(`<span class="evchip" style="${grant ? 'background:#DCE8F8;color:#1B4F9C' : ''}">${fmtMD(r.date)} · +${B.fmtAmt(b, r.amt)}${grant && b.reset ? ', unused lost' : ''}</span>`);
    if (chips.length >= 2) break;
  }
  return `<div class="row" style="align-items:flex-end"><div class="grow"><div class="lbl" style="margin:0">AVAILABLE TO BOOK</div><div class="bigsm" style="font-size:30px">${B.fmtAmt(b, st.after)}</div></div><div class="small mute" style="text-align:right;line-height:1.35">Balance today ${B.fmtAmt(b, st.left)}<br>${B.fmtAmt(b, st.booked)} already booked</div></div>${chips.length ? `<div class="chips" style="gap:6px;margin-top:6px">${chips.join('')}</div>` : ''}`;
}
const switchRow = (title, sub, on, act, label) => `<div class="row"><div class="grow"><b style="display:block;font-size:14px">${title}</b><span class="small mute">${sub}</span></div>${sw(on, act, '', label)}</div>`;
VIEWS.bankEdit = () => {
  const b = S.bedit, u = b.unit === 'd' ? 'days' : 'hours', isVac = b.id === 'vac';
  const gm = +b.grant.date.slice(0, 2), gd = +b.grant.date.slice(3), earnOn = b.earn.rule !== 'none';
  return `<div class="stack">${top(b.isNew ? 'Add a bank' : 'Edit bank')}
    <div class="card prevcard" id="bePrev" style="--bc:${esc(b.color)}">${bankPreview()}</div>
    <div class="card stack">
      <div class="row" style="align-items:flex-end;gap:10px">
        <div class="grow">${field('<span id="b1">NAME</span>', `<input id="beName" type="text" maxlength="30" value="${esc(b.name)}" aria-labelledby="b1">`)}</div>
        <div class="seg" role="radiogroup" aria-label="Count in" style="grid-template-columns:1fr 1fr;width:132px;margin-bottom:12px"><button role="radio" aria-checked="${b.unit === 'h'}" class="${b.unit === 'h' ? 'on' : ''}" data-act="beUnit" data-v="h">Hours</button><button role="radio" aria-checked="${b.unit === 'd'}" class="${b.unit === 'd' ? 'on' : ''}" data-act="beUnit" data-v="d">Days</button></div>
      </div>
      <div><div class="lbl">COLOUR</div><div class="swrow" role="radiogroup" aria-label="Colour">${COLORS.map(c => `<button role="radio" aria-checked="${c.toLowerCase() === String(b.color).toLowerCase()}" class="${c.toLowerCase() === String(b.color).toLowerCase() ? 'on' : ''}" data-act="beColor" data-c="${c}" aria-label="Colour ${c}" style="background:${c}"></button>`).join('')}</div></div>
      ${b.unit === 'd' ? field('<span id="b2">ONE DAY COUNTS AS (HOURS)</span>', `<input id="beDH" type="number" inputmode="decimal" step="0.25" min="1" value="${+b.dayHours}" aria-labelledby="b2">`) : ''}
      <div class="two">${field(`<span id="b3">BALANCE NOW (${u.toUpperCase()})</span>`, `<input id="beBal" type="number" inputmode="decimal" step="0.25" value="${+b.balance}" aria-labelledby="b3">`)}${field('<span id="b4">AS OF</span>', `<input id="beAsOf" type="date" value="${esc(b.asOf)}" aria-labelledby="b4">`)}</div>
    </div>
    <div class="section">How it fills up · use either or both</div>
    <div class="card stack" style="gap:8px">${switchRow('A little each pay day', earnOn && b.earn.rule === 'month' ? 'Added on the 1st of each month' : 'Added on every pay day', earnOn, 'beEarnTog', 'A little each pay day')}
      ${earnOn ? `<div class="row"><label class="grow" for="beEarnAmt" style="margin:0">Added each time (${u})</label><input id="beEarnAmt" type="number" inputmode="decimal" step="0.01" min="0" value="${+b.earn.amount}" class="minput" style="width:90px;text-align:right;font-weight:700"></div>
        <div class="seg" style="grid-template-columns:1fr 1fr"><button class="${b.earn.rule === 'pay' ? 'on' : ''}" data-act="beEarn" data-v="pay">Each pay day</button><button class="${b.earn.rule === 'month' ? 'on' : ''}" data-act="beEarn" data-v="month">Each month</button></div>` : ''}</div>
    <div class="card stack" style="gap:8px">${switchRow('Whole year at once', 'The full year lands on one date', b.grant.on, 'beGrantOn', 'Whole year at once')}
      ${b.grant.on ? `<div class="two"><label>${`<span class="lbl">${u.toUpperCase()} PER YEAR</span>`}<input id="beGAmt" type="number" inputmode="decimal" step="0.25" min="0" value="${+b.grant.amount}" class="minput"></label>
        <div><span class="lbl">ADDED EVERY YEAR ON</span><div class="selrow"><select id="beGM" aria-label="Month" class="minput">${MON.map((m, k) => `<option value="${k + 1}" ${k + 1 === gm ? 'selected' : ''}>${m}</option>`).join('')}</select><select id="beGD" aria-label="Day" class="minput">${Array.from({ length: 31 }, (_, k) => `<option ${k + 1 === gd ? 'selected' : ''}>${k + 1}</option>`).join('')}</select></div></div></div>
        <div style="border-top:1px solid var(--line);padding-top:8px">${switchRow('Lose unused time on that date', 'Leftover is cleared, then the new amount is added', b.reset, 'beReset', 'Lose unused time')}</div>` : ''}</div>
    ${isVac ? `<button class="mrow" data-act="beMore" style="border:1px solid var(--line);border-radius:var(--r);background:var(--card)" aria-expanded="${!!b.more}"><span class="grow"><span class="ms" style="font-size:13px;font-weight:700;color:var(--ink)">Carry-over limit and year-end deadline <span class="mute">(optional)</span></span></span>${ico(b.more ? 'x' : 'next', 16)}</button>
      ${b.more ? `<div class="card stack">${field('Vacation per year', num('vacYearly', S.profile.vacYearly), 'Shows how much of the year is left on the Leave tab.')}
        <div class="two">${field('Most you can carry over', num('carryLimit', S.profile.carryLimit, '0.5'))}${field('Year-end deadline', `<input type="date" data-set="deadline" value="${esc(S.profile.deadline)}">`)}</div>
        <p class="hint" style="margin:-6px 0 0">Fill both to get a use-it-or-lose-it warning.</p></div>` : ''}` : ''}
    ${b.err ? `<div class="note err" role="alert">${esc(b.err)}</div>` : ''}
    ${!b.isNew && !['vac', 'sick', 'bank', 'lieu'].includes(b.id) ? '<button class="btn danger" data-act="beDel">Delete this bank</button>' : ''}</div>
  <div class="actbar"><button class="btn" data-act="beSave">Save bank</button></div>`;
};

// ---------- book time off ----------
const initBook = () => { const t = E.todayIso(); const last = memGet('lastBank'); S.bk = { bank: (last && bankOf(last)) ? last : 'vac', from: t, to: t, split: false, bank2: '', hA: '' }; };
function readBook() {
  const g = id => { const el = $(id); return el ? el.value : null; };
  const f = g('#bkFrom'), t = g('#bkTo'), h = g('#bkHA');
  if (f) S.bk.from = f;
  if (t) S.bk.to = t;
  if (h !== null) S.bk.hA = h;
}
function bookDates() {
  const b = S.bk, dates = [];
  if (b.from && b.to && b.to >= b.from) for (let n = E.dayNum(b.from); n <= E.dayNum(b.to) && dates.length < 60; n++) { const d = E.fromDayNum(n), i = E.dayInfo(d, S.C); if (i.base) dates.push({ d, h: i.baseHours, code: S.C.shifts[i.base] ? S.C.shifts[i.base].code : '' }); }
  return dates;
}
VIEWS.book = () => {
  if (!S.bk) initBook();
  const b = S.bk, dates = bookDates(), total = dates.reduce((a, x) => a + x.h, 0);
  const bank = bankOf(b.bank) || S.banks[0], st = bankStat(bank.id);
  const bank2 = b.split ? bankOf(b.bank2) : null;
  const hA = b.split ? Math.max(0, Math.min(total, Number(b.hA) || 0)) : total, hB = total - hA;
  let msg;
  if (b.to < b.from) msg = 'The last day must be on or after the first day.';
  else if (!dates.length) msg = 'You are off on every day in this range, so there is nothing to book.';
  else {
    const needA = B.toUnit(bank, hA), after = st.after - needA;
    msg = `<b>${dates.length} working shift${dates.length === 1 ? '' : 's'}</b> in this range, <b>${fmtH(total)}</b> needed. Days you are already off are skipped.<br>${esc(bank.name)} available to book goes from <b>${B.fmtAmt(bank, st.after)}</b> to <b class="${after < 0 ? 'neg' : ''}">${B.fmtAmt(bank, after)}</b>${after < 0 ? ' (not enough)' : ''}.`;
    if (b.split && bank2) { const s2 = bankStat(bank2.id), a2 = s2.after - B.toUnit(bank2, hB); msg += `<br>${esc(bank2.name)} goes from <b>${B.fmtAmt(bank2, s2.after)}</b> to <b class="${a2 < 0 ? 'neg' : ''}">${B.fmtAmt(bank2, a2)}</b>.`; }
  }
  const tiles = dates.slice(0, 7).map(x => `<div class="tile"><span>${fmtD(x.d).slice(0, 8)}</span><b>${esc(x.code)}</b><small>${+x.h} h</small></div>`).join('');
  return `<div class="stack">${top('Book time off')}
    <div class="card two">${field('<span id="b1">First day</span>', `<input id="bkFrom" type="date" value="${b.from}" aria-labelledby="b1">`)}${field('<span id="b2">Last day</span>', `<input id="bkTo" type="date" value="${b.to}" aria-labelledby="b2">`)}</div>
    ${dates.length ? `<div class="card"><div class="row between"><b>Your shifts in this range</b><span class="small mute">${dates.length} shift${dates.length === 1 ? '' : 's'}</span></div><div class="tiles">${tiles}</div>${dates.length > 7 ? `<div class="small mute">and ${dates.length - 7} more</div>` : ''}<div class="row between" style="margin-top:8px"><b>Total needed</b><b>${fmtH(total)}</b></div></div>` : ''}
    <div class="field" style="margin:0"><div class="lbl">Take it from</div>${roll('bkBank', S.banks.map(x => [x.id, x.name]), b.bank, '', 'Bank')}</div>
    <div class="card row between"><div><b>Split across two banks</b><div class="small mute">For example vacation plus overtime</div></div>${sw(b.split, 'bkSplit', '', 'Split across two banks')}</div>
    ${b.split ? `<div class="card stack">${field(`<span id="b3">Hours from ${esc(bank.name)}</span>`, `<input id="bkHA" type="number" inputmode="decimal" step="0.25" min="0" value="${esc(b.hA)}" aria-labelledby="b3">`)}<div class="field" style="margin:0"><div class="lbl">The rest (${fmtH(hB)}) from</div>${roll('bkBank2', S.banks.filter(x => x.id !== bank.id).map(x => [x.id, x.name]), b.bank2, '', 'Second bank')}</div></div>` : ''}
    <div class="note ${msg && /^The|^You are/.test(msg) ? 'warn' : ''}">${msg}</div></div>
  <div class="actbar"><button class="btn" data-act="bkSave" ${dates.length ? '' : 'disabled'}>Book ${dates.length || ''} day${dates.length === 1 ? '' : 's'}</button></div>`;
};

// ---------- actions ----------
Object.assign(ACT, {
  bookOpen: () => { initBook(); go('book'); },
  bkBank: d => { readBook(); S.bk.bank = d.v; memSet('lastBank', d.v); if (S.bk.bank2 === d.v) S.bk.bank2 = ''; render(false); },
  bkBank2: d => { readBook(); S.bk.bank2 = d.v; render(false); },
  bkSplit: () => { readBook(); S.bk.split = !S.bk.split; if (S.bk.split) { const o = S.banks.find(x => x.id !== S.bk.bank); S.bk.bank2 = S.bk.bank2 || (o ? o.id : ''); S.bk.hA = S.bk.hA || ''; } render(false); },
  bkSave() {
    readBook();
    const b = S.bk, dates = bookDates();
    if (!dates.length) return;
    const bank = bankOf(b.bank), total = dates.reduce((a, x) => a + x.h, 0), entries = {};
    let sA = total, bank2 = null;
    if (b.split) {
      bank2 = bankOf(b.bank2);
      sA = Math.max(0, Math.min(total, Number(b.hA) || 0));
      if (!bank2) return toast('Choose the second bank');
      if (sA <= 0 || sA >= total) { if (sA >= total) bank2 = null; else return toast('Enter how many hours come from the first bank'); }
    }
    for (const x of dates) {
      const base = { ...(S.days[x.d] || {}) };
      for (const k of ['type', 'shiftId', 'hours', 'person', 'bank', 'splits', 'toBank']) delete base[k];
      const type = B.typeForBank(bank);
      const o = { ...base, type, hours: x.h };
      if (type === 'LEAVE') o.bank = bank.id;
      if (bank2) {
        const a = Math.round(x.h * (sA / total) * 100) / 100;
        o.splits = [{ bank: bank.id, h: a }, { bank: bank2.id, h: Math.round((x.h - a) * 100) / 100 }];
      }
      entries[x.d] = Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== '' && v !== false));
    }
    commitDays(entries, `${dates.length} day${dates.length === 1 ? '' : 's'} booked`); back();
  },

  bankFlt: d => { S.p.flt = d.k; render(false); },
  bankAdjust: () => { S.p.adj = true; render(false); },
  bankAdjustCancel: () => { S.p.adj = false; render(false); },
  bankAdjustSave() {
    const v = Number($('#adjBal').value);
    if (!Number.isFinite(v)) return toast('Type a number');
    const today = E.todayIso();
    // booked time for later days still comes off, so the new "today" number is what the bank holds right now
    setProfileBanks(S.banks.map(b => (b.id === S.p.id ? { ...b, balance: v, asOf: today } : b)));
    S.p.adj = false; toast('Balance updated'); render(false);
  },
  bankNew: () => { S.bedit = { ...blankBank(), isNew: true }; go('bankEdit'); },
  bankEditOpen: d => { const b = bankOf(d.id); S.bedit = { ...b, earn: { ...b.earn }, grant: { ...b.grant }, isNew: false, err: '' }; go('bankEdit'); },
  beColor: d => { readBE(); S.bedit.color = d.c; render(false); },
  beUnit: d => { readBE(); S.bedit.unit = d.v; render(false); },
  beEarn: d => { readBE(); S.bedit.earn = { ...S.bedit.earn, rule: d.v }; render(false); },
  beEarnTog() { readBE(); const e = S.bedit.earn; S.bedit.earn = { ...e, rule: e.rule === 'none' ? 'pay' : 'none' }; render(false); },
  beMore: () => { readBE(); S.bedit.more = !S.bedit.more; render(false); },
  beGrantOn: () => { readBE(); const g = S.bedit.grant; S.bedit.grant = { ...g, on: !g.on }; render(false); },
  beReset: () => { readBE(); S.bedit.reset = !S.bedit.reset; render(false); },
  beSave() {
    readBE();
    const b = S.bedit; b.err = '';
    if (!b.name.trim()) b.err = 'Give the bank a name.';
    else if (S.banks.some(x => x.id !== b.id && x.name.trim().toLowerCase() === b.name.trim().toLowerCase())) b.err = 'Another bank already has this name.';
    else if (!b.asOf) b.err = 'Choose the date your balance is for.';
    if (b.err) { render(false); return; }
    const rec = B.normBank({ ...b, id: b.id || 'b' + Date.now().toString(36), name: b.name.trim(), short: b.isNew || !b.short ? b.name.trim().slice(0, 4).toUpperCase() : b.short });
    const list = b.isNew ? [...S.banks, rec] : S.banks.map(x => (x.id === b.id ? rec : x));
    setProfileBanks(list); toast('Bank saved'); back();
  },
  beDel() {
    const id = S.bedit.id;
    if (Object.values(S.days).some(o => B.daySplits(o).some(sp => sp.bank === id))) { S.bedit.err = 'Time off is booked from this bank. Remove those days first.'; render(false); return; }
    if (!confirm('Delete this bank?')) return;
    setProfileBanks(S.banks.filter(x => x.id !== id)); back(); back();
  }
});

document.addEventListener('change', e => {
  const id = e.target.id;
  if (S.view === 'book' && S.bk && (id === 'bkFrom' || id === 'bkTo' || id === 'bkHA')) { readBook(); render(false); }
  else if (S.view === 'bankEdit' && S.bedit && /^be(Name|DH|Bal|AsOf|EarnAmt|GAmt|GM|GD)$/.test(id)) { readBE(); refreshPrev(); }
});

function refreshPrev() { const el = $('#bePrev'); if (el && S.bedit) el.innerHTML = bankPreview(); }
document.addEventListener('input', e => {
  if (S.view === 'bankEdit' && S.bedit && /^be(DH|Bal|EarnAmt|GAmt)$/.test(e.target.id)) { readBE(); refreshPrev(); }
});
