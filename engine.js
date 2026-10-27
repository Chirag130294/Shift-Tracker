// Shift Calendar: pure schedule logic. No screen code and no Firebase in this file.
// Dates are plain "YYYY-MM-DD" strings and all date math is done on whole days (UTC),
// so daylight saving changes can never move a shift to another day.

export const pad = n => String(n).padStart(2, '0');
export const mod = (a, n) => ((a % n) + n) % n;
export const ymd = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;

export function parts(s) {
  const [y, m, d] = s.split('-').map(Number);
  return { y, m, d };
}
export function dayNum(s) {
  const { y, m, d } = parts(s);
  return Math.floor(Date.UTC(y, m - 1, d) / 864e5);
}
export function fromDayNum(n) {
  const t = new Date(n * 864e5);
  return ymd(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}
export const addDays = (s, n) => fromDayNum(dayNum(s) + n);
export const diffDays = (a, b) => dayNum(b) - dayNum(a);
export const weekday = s => mod(dayNum(s) + 4, 7); // 0 = Sunday (1970-01-01 was a Thursday)
export const alignToSunday = s => addDays(s, -weekday(s));
// ws = the day your week starts on: 0 Sunday, 1 Monday, 6 Saturday
export const weekOffset = (s, ws = 0) => mod(weekday(s) - ws, 7);
export const alignToWeekStart = (s, ws = 0) => addDays(s, -weekOffset(s, ws));
export const daysInMonth = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
export function todayIso() {
  const d = new Date();
  return ymd(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

// ---------- shift types ----------
export const timeMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
export function shiftMinutes(sh) {
  let d = timeMin(sh.end) - timeMin(sh.start);
  if (d <= 0) d += 1440;
  return d;
}
export const crossesMidnight = sh => timeMin(sh.end) <= timeMin(sh.start);
export function paidHours(sh) {
  const h = (shiftMinutes(sh) - (Number(sh.brk) || 0)) / 60;
  return Math.max(0, Math.round(h * 100) / 100);
}

export const DEFAULT_SHIFTS = () => [
  { id: 'am', code: 'AM', name: '12-hr Day', start: '07:00', end: '19:00', brk: 30, color: '#F2B705' },
  { id: 'pm', code: 'PM', name: '12-hr Night', start: '19:00', end: '07:00', brk: 30, color: '#25327A' },
  { id: 'd', code: 'D', name: '8-hr Day', start: '07:00', end: '15:00', brk: 30, color: '#17785A' },
  { id: 'e', code: 'E', name: '8-hr Evening', start: '15:00', end: '23:00', brk: 30, color: '#E0782B' },
  { id: 'n', code: 'N', name: '8-hr Night', start: '23:00', end: '07:00', brk: 30, color: '#6B44A8' }
];

// ---------- rotation ----------
// A pattern: { id, mode: 'week'|'cycle', anchor, effectiveFrom, days: [shiftId or '' ...] }
// days[0] is the pattern's first day (Sunday of Week 1 in week mode) and falls on `anchor`.
export function patternFor(date, patterns) {
  let best = null;
  for (const p of patterns || []) {
    if (p.effectiveFrom <= date && (!best || p.effectiveFrom >= best.effectiveFrom)) best = p;
  }
  return best;
}
export function rotationPosition(date, patterns) {
  const p = patternFor(date, patterns);
  if (!p || !p.days || !p.days.length) return null;
  const idx = mod(diffDays(p.anchor, date), p.days.length);
  return { pattern: p, index: idx, week: Math.floor(idx / 7) + 1, weeks: Math.ceil(p.days.length / 7) };
}
export function baseShiftId(date, patterns) {
  const pos = rotationPosition(date, patterns);
  return pos ? pos.pattern.days[pos.index] || '' : '';
}

// ctx = { shifts: {id: shift}, patterns: [], days: {date: override} }
// A shift belongs to the date it STARTS on, so a night shift is never counted on the next day.
export function dayInfo(date, ctx) {
  const base = baseShiftId(date, ctx.patterns);
  const o = ctx.days[date] || null;
  const type = o && o.type ? o.type : '';
  let work = base;
  if (type === 'VAC' || type === 'SICK' || type === 'LIEU' || type === 'LEAVE' || type === 'OFF' || type === 'SWAP_OUT') work = '';
  if (type === 'SWAP_IN' || type === 'EXTRA') work = o.shiftId || '';
  const hoursOf = id => (id && ctx.shifts[id] ? paidHours(ctx.shifts[id]) : 0);
  let hours = hoursOf(work);
  if (type === 'OT') hours += Number(o.hours) || 0;
  return { date, base, type, work, hours, baseHours: hoursOf(base), override: o, isWorking: !!work };
}

// ---------- pay days ----------
export function payDates(p, from, to) {
  const out = [];
  if (!p || !p.payFreq || from > to) return out;
  const f = p.payFreq;
  if (f === 'weekly' || f === 'biweekly') {
    if (!p.payAnchor) return out;
    const step = f === 'weekly' ? 7 : 14;
    const a = dayNum(p.payAnchor), s = dayNum(from), e = dayNum(to);
    let n = a + Math.ceil((s - a) / step) * step;
    for (; n <= e; n += step) out.push(fromDayNum(n));
    return out;
  }
  if (f === 'monthly' && !p.payAnchor) return out;
  const a = parts(from), b = parts(to);
  const anchorDay = p.payAnchor ? parts(p.payAnchor).d : 1;
  for (let k = a.y * 12 + (a.m - 1) - 1; k <= b.y * 12 + (b.m - 1) + 1; k++) {
    const y = Math.floor(k / 12), m = (k % 12) + 1, dim = daysInMonth(y, m);
    const nominal = f === 'semimonthly' ? [15, dim] : [Math.min(anchorDay, dim)];
    for (const d of nominal) {
      let date = ymd(y, m, d);
      if (p.payWeekend !== 'none') {
        const w = weekday(date);
        if (w === 6) date = addDays(date, -1);
        else if (w === 0) date = addDays(date, -2);
      }
      if (date >= from && date <= to) out.push(date);
    }
  }
  return [...new Set(out)].sort();
}

// ---------- time off finder ----------
// Runs of consecutive days when you are not working.
export function offRuns(from, to, ctx) {
  const runs = [];
  let cur = null;
  for (let n = dayNum(from); n <= dayNum(to); n++) {
    const d = fromDayNum(n);
    if (!dayInfo(d, ctx).isWorking) {
      if (!cur) cur = { start: d, end: d, len: 1 };
      else { cur.end = d; cur.len++; }
    } else if (cur) { runs.push(cur); cur = null; }
  }
  if (cur) runs.push(cur);
  return runs;
}
