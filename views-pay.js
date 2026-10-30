// Shift Calendar v1.6: the Pay tab (gross pay for a pay period) and the pay settings screens.
// The maths is in pay.js. This file only draws screens and saves settings.
import { E, PAY, S, VIEWS, ACT, AFTER, esc, ico, top, nav, demoNote, field, roll, rollSet, render, go, tab, setProfile, toast, holiday, mrow, sw, empty, flashSaved, MON } from './core.js';

const px = () => PAY.payOf(S.profile);
const $m = n => PAY.money(S.profile, n);
const hh = n => String(+Number(n).toFixed(2));
const md = d => { const q = E.parts(d); return `${MON[q.m - 1]} ${q.d}`; };
const DOW3 = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const dow = d => DOW3[E.weekday(d)];
const t12 = t => { let [h, m] = t.split(':').map(Number); const s = h >= 12 ? 'p' : 'a'; h = h % 12 || 12; return h + (m ? ':' + String(m).padStart(2, '0') : '') + s; };
const isHol = d => !!holiday(d);
const sub = (title, body) => `<div class="stack">${top(title)}${body}</div>${nav('settings')}`;
const PCOL = ['#C98A0A', '#D9622B', '#4B4FB5', '#8A3FA8', '#17785A'];
const FREQ = { weekly: 'Every week', biweekly: 'Every 2 weeks', semimonthly: 'Twice a month', monthly: 'Once a month' };
const RULE = Object.fromEntries(PAY.DAY_RULES.map(r => [r[0], r]));
const dayOpts = (max, last) => Array.from({ length: max }, (_, k) => k + 1).map(d => [d, d === 31 && last ? 'Last day' : String(d)]);
const selectOf = (key, opts, val, label) => `<select data-pay="${key}" aria-label="${esc(label)}">${opts.map(([v, l]) => `<option value="${v}" ${String(v) === String(val) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
const numIn = (key, val, step = '0.01', id = '') => `<input type="number" inputmode="decimal" min="0" step="${step}" ${id ? `id="${id}"` : ''} data-pay="${key}" value="${val === '' || val === null ? '' : +val}">`;

// ---------- saving ----------
function setPay(fn, quiet) {
  const x = JSON.parse(JSON.stringify(px()));
  fn(x);
  setProfile({ pay: PAY.normPay(x) });
  if (S.profile.onboarded && !quiet) flashSaved();
  render(false);
}
document.addEventListener('change', e => {
  const t = e.target, k = t && t.dataset && t.dataset.pay;
  if (!k || !S.profile) return;
  const v = t.value, n = Number(v);
  setPay(x => {
    const [a, b, c] = k.split(':');
    if (a === 'cur') x.cur = v;
    else if (a === 'sym') x.sym = v.trim().slice(0, 4);
    else if (a === 'lag') x.lag = v === '' ? null : n;
    else if (['rate', 'wk', 'holMult', 'otMult', 'mDay', 'mStart'].includes(a)) x[a] = n;
    else if (a === 'semi') { x.semi[Number(b)] = n; }
    else if (a === 'per') { const q = x.periods[Number(b)]; if (q && !(c !== 'name' && c !== 'prem' && !v)) q[c] = c === 'prem' ? n : v; }
    else if (a === 'unp') { const u = x.unpaid[Number(b)]; if (u) u[c] = n; }
    else if (a === 'leave') x.leavePay[b] = n;
  });
});

// ---------- the Pay tab ----------
const keyOf = (per, it, i) => `${per.start}|${i}|${it.kind}|${it.date}`;
function curPeriod() {
  const p = S.profile;
  return (S.payStart && PAY.periodFor(p, S.payStart)) || PAY.periodFor(p, E.todayIso());
}
const compute = per => PAY.computePeriod(S.profile, per, S.C, isHol);
const CAT = [['base', 'Base pay', 'var(--acc)'], ['prem', 'Shift premiums', '#C98A0A'], ['wk', 'Weekend premium', '#4B4FB5'], ['hol', 'Stat holiday', '#D9622B'], ['ot', 'Overtime', '#8A3FA8'], ['leave', 'Paid leave', '#0E7490']];
const lineRows = it => it.lines.map(l => `<div class="pzl"><span class="grow"><b>${esc(l.label)}</b><span class="small mute pznum" style="display:block">${hh(l.h)} h × ${$m(l.r)}</span></span><b class="pznum">${$m(l.amt)}</b></div>`).join('');

VIEWS.pay = () => {
  const p = S.profile, x = px(), today = E.todayIso(), per = curPeriod();
  const head = right => `<div class="top"><h1 class="grow">Pay</h1>${right || ''}</div>`;
  if (!per) return `${demoNote()}<div class="stack">${head()}${empty('dollar', 'Set your pay dates', 'Choose how often you are paid and a pay date you know. Gross pay for each pay period shows up here.', 'Set pay dates', 'payGo', 'data-v="sPayDates"')}</div>${nav('pay')}`;
  const prev = PAY.periodFor(p, E.addDays(per.start, -1)), next = PAY.periodFor(p, E.addDays(per.end, 1));
  const nav2 = `<span class="row" style="gap:6px"><button class="iconbtn" data-act="payPrev" aria-label="Previous pay period" ${prev ? '' : 'disabled'}>${ico('back')}</button><button class="iconbtn" data-act="payNext" aria-label="Next pay period" ${next ? '' : 'disabled'}>${ico('next')}</button></span>`;
  if (!(x.rate > 0)) return `${demoNote()}<div class="stack">${head(nav2)}
    <div class="card stack"><h2>Add your hourly rate</h2><p class="mute">Gross pay is worked out from your hourly rate, shift premiums, unpaid breaks and leave pay. Set these once and every pay period is calculated for you.</p><button class="btn" data-act="payGo" data-v="sPayRate">Set my pay rate</button></div>
    <div class="note small">Pay period ${md(per.start)} to ${md(per.end)} · pay day ${dow(per.pay)}, ${md(per.pay)}</div></div>${nav('pay')}`;
  const r = compute(per), t = r.totals, inPer = today >= per.start && today <= per.end, past = per.end < today;
  const days = E.diffDays(today, per.pay), payTxt = days === 0 ? 'Pay day is today' : days > 0 ? `Pay day in ${days} day${days === 1 ? '' : 's'}` : `Paid ${-days} day${days === -1 ? '' : 's'} ago`;
  const span = E.diffDays(per.start, per.end) + 1, done = inPer ? E.diffDays(per.start, today) + 1 : past ? span : 0, pct = Math.round(done / span * 100);
  const parts = CAT.map(([k, l, c]) => [l, t[k], c, k]).filter(a => a[1] > 0);
  const tot = parts.reduce((a, b) => a + b[1], 0) || 1;
  const premNames = x.periods.filter(q => q.prem > 0).map(q => q.name);
  const sec = it => {
    const key = keyOf(per, it, 0), open = !!(S.payOpen || {})[key + it.title];
    const sub = it.kind === 'shift' ? `${t12(it.start)} to ${t12(it.end)} · ${hh(it.paid)} h paid${it.part ? ' · part of a night shift' : ''}` : it.kind === 'ot' ? (it.banked ? `${hh(it.hoursShown)} h added to a bank, not paid` : `${hh(it.paid)} h at ${hh(x.otMult)} ×`) : `${hh(it.paid)} h at ${it.pct}% of base`;
    return `<div class="pzitem ${it.date > today ? 'fut' : ''}"><button class="pzrow" data-act="payToggle" data-k="${esc(key + it.title)}" aria-expanded="${open}">
      <span class="pzdate"><b>${E.parts(it.date).d}</b><span>${dow(it.date)}</span></span><span class="pzcode" style="background:${esc(it.color)}">${esc(it.code)}</span>
      <span class="grow"><b style="display:block">${esc(it.title)}</b><span class="small mute">${sub}</span></span><b class="pznum">${it.banked ? 'Banked' : $m(it.total)}</b></button>
      ${open ? `<div class="pzdet">${it.kind === 'shift' ? `<div class="small mute" style="margin-bottom:4px">${hh(it.len)} h at work, ${hh(it.unpaid)} h unpaid, ${hh(it.paid)} h paid</div>` : ''}${lineRows(it)}</div>` : ''}</div>`;
  };
  return `${demoNote()}<div class="stack">${head(nav2)}
    <section class="pzhero" aria-label="Gross pay">
      <div class="row between"><span class="pzsub">${md(per.start)} to ${md(per.end)}</span><span class="pill pzpill">${payTxt}</span></div>
      <div class="pzbig pznum" data-v="${t.total}">${$m(t.total)}</div>
      <div class="pzsub">Expected gross pay · ${hh(t.hours)} paid hours · ${dow(per.pay)}, ${md(per.pay)}</div>
      <div class="pzprog" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><b style="width:${pct}%"></b></div>
      <div class="row between pzsub"><span>${inPer || past ? `Earned so far <b class="pznum">${$m(t.earned)}</b>` : 'Period has not started'}</span><span>${inPer ? `Day ${done} of ${span}` : ''}</span></div></section>
    <div class="card stack"><div class="row between"><h2>Where it comes from</h2><span class="small mute">Before tax</span></div>
      <div class="pzbar" aria-hidden="true">${parts.map(a => `<b style="flex:${a[1] / tot};background:${a[2]}"></b>`).join('')}</div>
      <div>${parts.map(a => `<div class="pzl"><i class="pzdot" style="background:${a[2]}"></i><span class="grow">${a[0]}${a[3] === 'prem' && premNames.length ? `<span class="small mute"> · ${esc(premNames.join(', '))}</span>` : ''}</span><b class="pznum">${$m(a[1])}</b></div>`).join('') || '<div class="small mute">No shifts or leave in this period.</div>'}</div></div>
    ${r.items.length ? `<h2 class="mute" style="margin:4px 2px 0">Shifts and leave · tap one for the math</h2><div class="stack" style="gap:6px">${r.items.map(sec).join('')}</div>` : ''}
    <p class="small mute">An estimate from your pay settings, before tax and deductions. Your pay stub is the final word.</p>
    <button class="btn sec" data-act="payGo" data-v="sPay">${ico('gear')} Pay settings</button></div>${nav('pay')}`;
};

// A card for the calendar: shows on a pay day
export function payCard(date) {
  const p = S.profile;
  if (!p || !E.payDates(p, date, date).includes(date)) return '';
  const per = PAY.periodForPayDay(p, date), x = px();
  if (!per) return '';
  if (!(x.rate > 0)) return `<button class="paycard" data-act="payGo" data-v="sPayRate"><span class="pzcur">${esc(PAY.currencySymbol(p))}</span><span class="grow"><b>Pay day</b><span class="small" style="display:block">Add your hourly rate to see your gross pay</span></span>${ico('next', 16)}</button>`;
  const t = PAY.computePeriod(p, per, S.C, isHol).totals;
  return `<button class="paycard" data-act="payOpenFor" data-s="${per.start}"><span class="pzcur">${esc(PAY.currencySymbol(p))}</span><span class="grow"><b>Pay day · ${$m(t.total)} gross</b><span class="small" style="display:block">For ${md(per.start)} to ${md(per.end)} · ${hh(t.hours)} paid hours</span></span>${ico('next', 16)}</button>`;
}
export const payForPayDay = date => { const per = PAY.periodForPayDay(S.profile, date); return per && px().rate > 0 ? PAY.computePeriod(S.profile, per, S.C, isHol).totals.total : null; };

// ---------- settings: hub ----------
VIEWS.sPay = () => {
  const p = S.profile, x = px(), cur = x.cur === 'custom' ? x.sym : x.cur;
  const per = PAY.periodFor(p, E.todayIso()), sickPct = x.leavePay.sick;
  const unp = x.unpaid.length ? x.unpaid.map(u => `${hh(u.len)} h: ${hh(u.u)}`).join(', ') : 'Uses each shift\'s own break';
  return sub('Pay', `${x.rate > 0 && per ? `<button class="paycard" data-act="tab" data-v="pay"><span class="pzcur">${esc(PAY.currencySymbol(p))}</span><span class="grow"><b>This pay period: ${$m(PAY.computePeriod(p, per, S.C, isHol).totals.total)} gross</b><span class="small" style="display:block">${md(per.start)} to ${md(per.end)} · see the full breakdown</span></span>${ico('next', 16)}</button>` : '<div class="note">Add your hourly rate first. Then the Pay tab shows your gross pay for every pay period.</div>'}
    <div class="mgroup">${mrow('payGo', 'dollar', '#17785A', 'Rate and currency', `${x.rate > 0 ? $m(x.rate) + ' an hour' : 'Not set'} · ${esc(cur)} · overtime ${hh(x.otMult)} ×`, 'data-v="sPayRate"')}
      ${mrow('payGo', 'clock', '#C98A0A', 'Shift premiums', `${x.periods.map(q => esc(q.name)).join(', ')}${x.wk > 0 ? ', weekends' : ''}`, 'data-v="sPayPrem"')}
      ${mrow('payGo', 'cal', '#4B4FB5', 'Unpaid breaks', esc(unp), 'data-v="sPayBreaks"')}
      ${mrow('payGo', 'plus', '#D9534F', 'Sick and leave pay', `Sick pays ${hh(sickPct)}% of base`, 'data-v="sPayLeave"')}</div>
    <div class="mgroup">${mrow('payGo', 'repeat', '#7A4FB5', 'Pay period and pay days', `${FREQ[p.payFreq] || 'Not set'}${per ? ' · next pay day ' + md(per.pay) : ''}`, 'data-v="sPayDates"')}
      ${mrow('payGo', 'info', '#475569', 'How a shift counts by day', RULE[x.dayRule][1], 'data-v="sPayDay"')}</div>
    <p class="hint">Vacation, sick and other banks are in Leave banks. This page is about what you earn.</p>`);
};

// ---------- settings: rate and currency ----------
VIEWS.sPayRate = () => {
  const x = px();
  return sub('Rate and currency', `<div class="card stack">
      ${field('Currency', selectOf('cur', PAY.CURRENCIES.map(c => [c[0], c[0] === 'custom' ? 'Another symbol' : `${c[1]}  ${c[0]} · ${c[2]}`]), x.cur, 'Currency'))}
      ${x.cur === 'custom' ? field('Your symbol (up to 4 characters)', `<input type="text" maxlength="4" id="paySym" data-pay="sym" value="${esc(x.sym)}" placeholder="Rs">`) : ''}
      ${field('Hourly rate (base pay)', numIn('rate', x.rate || '', '0.01', 'payRate'), x.rate > 0 ? `${$m(x.rate * 40)} for 40 hours.` : 'The rate on your pay stub, before any premiums.')}</div>
    <div class="card stack"><h2>Overtime</h2><div class="field" style="margin:0"><div class="lbl">OVERTIME PAYS</div>${roll('payRoll', [[1.25, '1.25 ×'], [1.5, '1.5 ×'], [2, '2 ×']], x.otMult, 'data-key="otMult"', 'Overtime multiplier')}</div>
      ${field('Or type your own multiplier', numIn('otMult', x.otMult, '0.05', 'payOt'), `Overtime you log pays ${$m(x.rate * x.otMult)} an hour. Hours you bank are not paid until you take them as time off.`)}</div>
    <div class="card stack"><div class="row between"><div><b>Extra pay on stat holidays</b><div class="small mute">For hours worked on a holiday from your holiday list</div></div>${sw(x.holMult > 1, 'payHolTog', '', 'Extra pay on stat holidays')}</div>
      ${x.holMult > 1 ? field('Holiday hours pay this many times base', numIn('holMult', x.holMult, '0.05', 'payHol'), `Adds ${$m(x.rate * (x.holMult - 1))} an hour on top of base pay.`) : ''}</div>`);
};

// ---------- settings: leave pay ----------
VIEWS.sPayLeave = () => {
  const x = px(), banks = S.profile.banks || [], sh = (S.profile.shifts || [])[0], h = sh ? E.paidHours(sh) : 8;
  return sub('Sick and leave pay', `<p class="mute">When you take a paid day off, how much of your base pay do you get? For example, some workplaces pay 70% for a sick day.</p>
    ${banks.map(b => { const v = x.leavePay[b.id] !== undefined ? x.leavePay[b.id] : 100; return `<div class="card stack" style="gap:8px"><div class="row between"><b class="row" style="gap:8px"><i class="pzdot" style="background:${esc(b.color)}"></i>${esc(b.name)}</b><b class="pznum">${hh(v)}%</b></div>
      ${roll('payRoll', [[100, '100%'], [80, '80%'], [70, '70%'], [60, '60%'], [50, '50%'], [0, 'Unpaid']], v, `data-key="leave:${esc(b.id)}"`, b.name + ' pay')}
      <div class="row"><label class="grow small mute" for="pl-${esc(b.id)}">Other percent</label><input id="pl-${esc(b.id)}" class="minput" style="width:90px;text-align:right" type="number" inputmode="decimal" min="0" max="300" step="1" data-pay="leave:${esc(b.id)}" value="${+v}"></div>
      ${x.rate > 0 ? `<div class="small mute">A ${hh(h)} hour day pays ${$m(h * x.rate * v / 100)}.</div>` : ''}</div>`; }).join('')}
    <p class="hint">These amounts appear in the Pay tab for any day you book as leave. Hours you take from banked overtime pay at the percent set for that bank.</p>`);
};

// ---------- settings: premiums ----------
function tlHtml(sh) {
  const x = px(), cells = [];
  for (let i = 0; i < 48; i++) { const q = x.periods.find(z => { const s = E.timeMin(z.start), e = E.timeMin(z.end), m = i * 30; return s === e ? true : s < e ? m >= s && m < e : m >= s || m < e; }); const k = q ? x.periods.indexOf(q) : -1; cells.push(`<i style="background:${k < 0 ? 'var(--track)' : PCOL[k % 5]}"></i>`); }
  let row = '';
  if (sh) {
    const s = E.timeMin(sh.start), len = E.shiftMinutes(sh), u = PAY.breakMinutes(sh, x), mid = len / 2, c = [];
    for (let i = 0; i < 48; i++) { let on = 0; for (let m = 0; m < 30; m++) { const rel = (i * 30 + m - s + 1440) % 1440; if (rel < len && !(u && rel >= mid - u / 2 && rel < mid + u / 2)) on++; } c.push(`<i style="background:${on ? 'var(--ink)' : 'transparent'};opacity:${on > 15 ? 0.85 : on ? 0.4 : 1}"></i>`); }
    row = `<div class="pztl s" aria-hidden="true">${c.join('')}</div>`;
  }
  return `<div class="pztl" role="img" aria-label="Your day split into pay periods">${cells.join('')}</div>${row}<div class="pzax"><span>12a</span><span>6a</span><span>12p</span><span>6p</span><span>12a</span></div>`;
}
function checkCard() {
  const x = px(), shifts = S.profile.shifts || [];
  if (!shifts.length) return '';
  const sel = shifts.find(s => s.id === S.paySel) || shifts[0];
  const d0 = E.addDays(E.todayIso(), (9 - E.weekday(E.todayIso())) % 7 || 7), r = PAY.calcShift(sel, d0, S.profile, isHol);   // the next Tuesday
  return `<div class="sect">Check a shift (a weekday)</div>
    <div class="hroll" role="radiogroup" aria-label="Pick a shift">${shifts.map(s => `<button class="hr ${s.id === sel.id ? 'on' : ''}" role="radio" aria-checked="${s.id === sel.id}" data-act="paySel" data-id="${esc(s.id)}">${esc(s.code)} ${t12(s.start)}-${t12(s.end)}</button>`).join('')}</div>
    <div class="card"><div class="row between"><div class="grow"><b>${esc(sel.name)}</b><div class="small mute pznum">${hh(r.len)} h at work − ${hh(r.unpaid)} h unpaid = ${hh(r.paid)} h paid</div></div><b class="pznum" style="font-size:20px">${x.rate > 0 ? $m(r.total) : '—'}</b></div>
      <div style="margin:10px 0">${tlHtml(sel)}</div>${x.rate > 0 ? lineRows({ lines: r.lines }) : '<p class="small mute">Add your hourly rate to see the pay for this shift.</p>'}<p class="small mute" style="margin-top:6px">The dark bar is paid time. The gap in it is the unpaid break.</p></div>`;
}
VIEWS.sPayPrem = () => {
  const x = px(), u = x.mode === '$' ? '$ per hour' : '% of base';
  const perCard = (q, i) => `<div class="stack" style="gap:8px;padding:12px 0;border-top:1px solid var(--line)"><div class="row"><i class="pzdot" style="background:${PCOL[i % 5]}"></i><input class="grow" style="min-height:44px" type="text" id="pn${i}" data-pay="per:${i}:name" value="${esc(q.name)}" maxlength="20" aria-label="Period name">
      ${x.periods.length > 1 ? `<button class="iconbtn" data-act="payDelPer" data-i="${i}" aria-label="Remove ${esc(q.name)}">${ico('x', 16)}</button>` : ''}</div>
    <div class="three"><label><span class="lbl">Starts</span><input type="time" id="ps${i}" data-pay="per:${i}:start" value="${esc(q.start)}"></label><label><span class="lbl">Ends</span><input type="time" id="pe${i}" data-pay="per:${i}:end" value="${esc(q.end)}"></label>
      <label><span class="lbl">Extra (${x.mode === '$' ? 'per hour' : '%'})</span>${numIn(`per:${i}:prem`, q.prem, '0.25', 'pp' + i)}</label></div></div>`;
  return sub('Shift premiums', `<div class="sect">Start from a template</div>
    <div class="card stack" style="gap:8px">${roll('payTpl', Object.entries(PAY.PAY_TEMPLATES).map(([k, v]) => [k, v.name]), S.payTpl || '', '', 'Templates')}<p class="small mute">${S.payTpl ? esc(PAY.PAY_TEMPLATES[S.payTpl].note) + ' ' : ''}Pick one, then change anything to match your contract. Your hourly rate is kept.</p></div>
    <div class="sect">When each part of the day counts</div>
    <div class="card"><div class="row between" style="margin-bottom:10px"><span class="small mute grow">Each hour is paid at the part of the day it falls in. A 7 am to 7 pm shift gets the morning rate for 7 to 3 and the evening rate for 3 to 7.</span></div>
      <div class="field" style="margin:0 0 8px"><div class="lbl">PREMIUMS ARE</div>${roll('payRoll', [['$', '$ per hour'], ['%', '% of base']], x.mode, 'data-key="mode"', 'Premium type')}</div>
      ${tlHtml()}${x.periods.map(perCard).join('')}
      ${x.periods.length < 5 ? `<button class="btn sec" style="margin-top:6px;width:100%" data-act="payAddPer">${ico('plus', 16)} Add a period</button>` : ''}</div>
    <div class="card stack">${field(`Weekend extra (${u})`, numIn('wk', x.wk, '0.25', 'payWk'), 'Added for every paid hour that counts on a Saturday or Sunday. 0 means none.')}</div>
    ${checkCard()}`);
};

// ---------- settings: unpaid breaks ----------
VIEWS.sPayBreaks = () => {
  const x = px(), shifts = S.profile.shifts || [];
  const rule = (u, i) => `<div class="row" style="align-items:flex-end"><label class="grow"><span class="lbl">Shift length (hours)</span>${numIn(`unp:${i}:len`, u.len, '0.25', 'ul' + i)}</label><label class="grow"><span class="lbl">Unpaid break (hours)</span>${numIn(`unp:${i}:u`, u.u, '0.25', 'uu' + i)}</label><button class="iconbtn" data-act="payDelUnp" data-i="${i}" aria-label="Remove this rule">${ico('x', 16)}</button></div>`;
  return sub('Unpaid breaks', `<p class="mute">Set an unpaid break for each shift length. For example 0.5 hours in an 8 hour shift, 0.75 in a 12 hour shift, or 0.5 in an 8.5 hour shift. The break comes off the middle of the shift.</p>
    <div class="card stack">${x.unpaid.length ? x.unpaid.map(rule).join('') : '<p class="small mute">No rules yet. Each shift then uses the break saved in your shift library.</p>'}
      <button class="btn sec" data-act="payAddUnp">${ico('plus', 16)} Add a shift length</button></div>
    <div class="sect">What this gives your shifts</div>
    <div class="card tight">${shifts.map(s => { const len = E.shiftMinutes(s) / 60, br = PAY.breakMinutes(s, x) / 60, ruled = x.unpaid.some(q => Math.abs(q.len - len) < 0.01); return `<div class="pzl"><span class="pzcode" style="background:${esc(s.color || '#17785A')}">${esc(s.code)}</span><span class="grow"><b>${t12(s.start)} to ${t12(s.end)}</b><span class="small mute pznum" style="display:block">${hh(len)} h at work · ${hh(br)} h unpaid${ruled ? '' : ' (shift library)'}</span></span><b class="pznum">${hh(len - br)} h paid</b></div>`; }).join('')}</div>`);
};

// ---------- settings: pay period and pay days ----------
VIEWS.sPayDates = () => {
  const p = S.profile, x = px(), f = p.payFreq, today = E.todayIso(), L = PAY.lagOf(p);
  const weekendRoll = rollSet('payWeekend', [['before', 'Friday before'], ['after', 'Monday after'], ['none', 'Keep the date']], p.payWeekend || 'before', '', 'If pay day is on a weekend');
  let body = '';
  if (f === 'weekly' || f === 'biweekly') {
    body = `${field('A pay date you know', `<input type="date" id="payAnchor" data-set="payAnchor" value="${esc(p.payAnchor)}">`, 'Every pay day is counted from this date. Look at an old pay stub.')}
      ${field('Period ends this many days before pay day', numIn('lag', x.lag === null ? L : x.lag, '1', 'payLag'), 'Example: paid on a Friday for work up to the Saturday before is 6 days. Paid on the last day of the period is 0.')}`;
  } else if (f === 'semimonthly') {
    body = `<div class="two">${field('First pay day', selectOf('semi:0', dayOpts(31, true), x.semi[0], 'First pay day'))}${field('Second pay day', selectOf('semi:1', dayOpts(31, true), x.semi[1], 'Second pay day'))}</div>
      ${field('Period ends this many days before pay day', numIn('lag', x.lag === null ? L : x.lag, '1', 'payLag'), '0 means each period ends on the pay day itself.')}
      <div class="field"><div class="lbl">IF PAY DAY IS ON A WEEKEND</div>${weekendRoll}</div>`;
  } else {
    body = `<div class="two">${field('Pay day of the month', selectOf('mDay', dayOpts(31, true), E.monthlyPayDay(p), 'Pay day of the month'))}${field('Pay period starts on day', selectOf('mStart', dayOpts(28, false), x.mStart, 'Period start day'))}</div>
      <p class="hint" style="margin:-4px 0 12px">Start day 1 means the calendar month. Start day 16 means the 16th to the 15th of next month. A period is paid on the first pay day on or after it ends.</p>
      <div class="field"><div class="lbl">IF PAY DAY IS ON A WEEKEND</div>${weekendRoll}</div>`;
  }
  const next = E.payDates(p, today, E.addDays(today, 130)).slice(0, 3).map(d => ({ d, per: PAY.periodForPayDay(p, d) }));
  return sub('Pay period and pay days', `<div class="card"><div class="field"><div class="lbl">HOW OFTEN YOU ARE PAID</div>${rollSet('payFreq', Object.entries(FREQ), f, '', 'Pay frequency')}</div>${body}</div>
    <div class="sect">Your next pay days</div>
    <div class="card tight">${next.length ? next.map(n => `<div class="pzl"><span class="pzdate"><b>${E.parts(n.d).d}</b><span>${MON[E.parts(n.d).m - 1]}</span></span><span class="grow"><b>${dow(n.d)}, ${md(n.d)}</b><span class="small mute" style="display:block">${n.per ? `Pays for ${md(n.per.start)} to ${md(n.per.end)}` : ''}</span></span></div>`).join('') : '<div class="small mute" style="padding:8px 4px">Add a pay date you know to see your pay days.</div>'}</div>
    <p class="hint">Pay days show as $ on the calendar. Tap one to see your gross pay for that period.</p>`);
};

// ---------- settings: how a shift counts by day ----------
VIEWS.sPayDay = () => {
  const x = px(), ex = 'A night shift from Friday 11 pm to Saturday 7 am';
  return sub('How a shift counts by day', `<p class="mute">This decides which day, and so which pay period and weekend rate, a shift that runs past midnight belongs to.</p>
    <div class="stack" style="gap:8px">${PAY.DAY_RULES.map(([k, l, d]) => `<button class="card pzopt ${x.dayRule === k ? 'on' : ''}" role="radio" aria-checked="${x.dayRule === k}" data-act="payRoll" data-key="dayRule" data-v="${k}"><span class="pzradio"></span><span class="grow"><b style="display:block">${l}</b><span class="small mute">${d}</span></span></button>`).join('')}</div>
    <div class="note small"><b>${ex}:</b> ${x.dayRule === 'start' ? 'counts as Friday.' : x.dayRule === 'end' ? 'counts as Saturday.' : x.dayRule === 'split' ? 'the hours before midnight count on Friday and the hours after count on Saturday.' : 'counts on the day that holds most of its paid hours.'}</div>
    <p class="hint">It matters most on the last day of a pay period and on weekends. If your pay stub counts the day a shift starts, leave this on the first choice.</p>`);
};

// The gross figure counts up once when the tab opens. Skipped when the person asks for less motion.
AFTER.push(() => {
  const el = document.querySelector('.pzbig');
  if (!el || !S._reset || matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  const to = Number(el.dataset.v) || 0, t0 = performance.now(), D = 650;
  const step = now => { const k = Math.min(1, (now - t0) / D), e = 1 - Math.pow(1 - k, 3); el.textContent = $m(to * e); if (k < 1 && el.isConnected) requestAnimationFrame(step); else el.textContent = $m(to); };
  requestAnimationFrame(step);
});

// ---------- actions ----------
const oldTab = ACT.tab;
Object.assign(ACT, {
  tab: d => { if (d.v === 'pay' && S.view !== 'pay') S.payStart = null; oldTab(d); },
  payGo: d => go(d.v),
  payRoll: d => { const key = d.key, raw = d.v; setPay(x => { if (key.startsWith('leave:')) x.leavePay[key.slice(6)] = Number(raw); else if (key === 'mode' || key === 'dayRule') x[key] = raw; else x[key] = Number(raw); }); },
  payTpl: d => {
    const T = PAY.PAY_TEMPLATES[d.v]; if (!T) return;
    S.payTpl = d.v;
    setPay(x => { x.mode = T.mode; x.wk = T.wk; x.periods = T.periods.map((q, i) => ({ id: 'p' + Date.now().toString(36) + i, name: q[0], start: q[1], end: q[2], prem: q[3] })); x.unpaid = T.unpaid.map(u => ({ len: u[0], u: u[1] })); }, true);
    toast('Template applied. Change anything to fit your contract.');
  },
  payAddPer: () => setPay(x => { x.periods.push(PAY.newPeriod()); }),
  payDelPer: d => setPay(x => { x.periods.splice(Number(d.i), 1); }),
  payAddUnp: () => setPay(x => { x.unpaid.push({ len: 10, u: 0.5 }); }),
  payDelUnp: d => setPay(x => { x.unpaid.splice(Number(d.i), 1); }),
  payHolTog: () => setPay(x => { x.holMult = x.holMult > 1 ? 1 : 1.5; }),
  paySel: d => { S.paySel = d.id; render(false); },
  payPrev: () => { const q = PAY.periodFor(S.profile, E.addDays(curPeriod().start, -1)); if (q) { S.payStart = q.start; render(false); } },
  payNext: () => { const q = PAY.periodFor(S.profile, E.addDays(curPeriod().end, 1)); if (q) { S.payStart = q.start; render(false); } },
  payToggle: d => { S.payOpen = { ...(S.payOpen || {}), [d.k]: !(S.payOpen || {})[d.k] }; render(false); },
  payOpenFor: d => { S.payStart = d.s; tab('pay'); }
});
