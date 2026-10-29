// Shift Calendar: sharing and shift swaps. Pure logic. No screen code and no Firebase in this file.
import * as E from './engine.js';

export const SHARE_PAST = 14;     // days before today that colleagues can see
export const SHARE_FUTURE = 240;  // days after today
export const MIN_REST_HOURS = 8;

const hash = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };

// The copy of your calendar that colleagues are allowed to read.
// It holds ONLY the shifts you work and the shift types. Vacation, sick, lieu, notes, hours,
// balances and pay never go in it: a day you are off for any reason is simply not listed.
export function buildSharedView(profile, days, today) {
  const shifts = {};
  (profile.shifts || []).forEach(s => { shifts[s.id] = s; });
  const ctx = { shifts, patterns: profile.patterns || [], days: days || {} };
  const from = E.addDays(today, -SHARE_PAST), to = E.addDays(today, SHARE_FUTURE);
  const out = {};
  for (let n = E.dayNum(from); n <= E.dayNum(to); n++) {
    const d = E.fromDayNum(n), i = E.dayInfo(d, ctx);
    if (i.isWorking && shifts[i.work]) out[d] = i.work;
  }
  const defs = (profile.shifts || []).map(s => ({ id: s.id, code: s.code, name: s.name, start: s.start, end: s.end, brk: Number(s.brk) || 0, color: s.color }));
  const body = { name: String(profile.name || '').slice(0, 60), weekStart: Number(profile.weekStart) || 0, shifts: defs, from, to, days: out };
  return { ...body, hash: hash(JSON.stringify({ ...body, from: '', to: '' })) };
}

export const shiftDef = s => ({ code: s.code, name: s.name, start: s.start, end: s.end, brk: Number(s.brk) || 0, color: s.color });
export const sameTimes = (a, b) => a.start === b.start && a.end === b.end && (Number(a.brk) || 0) === (Number(b.brk) || 0);
export function matchShift(shifts, def) { return shifts.find(s => sameTimes(s, def)) || null; }

// Gaps (in hours) between a shift and the shifts on the days around it.
// ctx = { shifts: {id: shift}, patterns, days }. The shift `sh` is tried on `date`.
export function restGaps(ctx, date, sh) {
  const tmpId = '__try';
  const c2 = { shifts: { ...ctx.shifts, [tmpId]: { ...sh, id: tmpId } }, patterns: ctx.patterns, days: { ...ctx.days, [date]: { type: 'EXTRA', shiftId: tmpId } } };
  const startAbs = E.dayNum(date) * 1440 + E.timeMin(sh.start);
  const endAbs = E.dayNum(date) * 1440 + E.timeMin(sh.start) + E.shiftMinutes(sh);
  const out = [];
  const pd = E.addDays(date, -1), pi = E.dayInfo(pd, c2), psh = pi.isWorking && c2.shifts[pi.work];
  if (psh) {
    const pEnd = E.dayNum(pd) * 1440 + E.timeMin(psh.start) + E.shiftMinutes(psh);
    out.push({ date: pd, hours: (startAbs - pEnd) / 60, code: psh.code });
  }
  const nd = E.addDays(date, 1), ni = E.dayInfo(nd, c2), nsh = ni.isWorking && c2.shifts[ni.work];
  if (nsh) {
    const nStart = E.dayNum(nd) * 1440 + E.timeMin(nsh.start);
    out.push({ date: nd, hours: (nStart - endAbs) / 60, code: nsh.code });
  }
  return out;
}
export function restWarnings(ctx, date, sh) {
  return restGaps(ctx, date, sh).filter(g => g.hours < MIN_REST_HOURS).map(g =>
    g.hours < 0 ? `Overlaps your ${g.code} shift on ${g.date}.` : `Only ${+g.hours.toFixed(1)} h of rest next to your ${g.code} shift on ${g.date}.`);
}

// Could this colleague take my shift `sh` on `date`? sv = their shared copy. Returns
//   { state: 'free' | 'tight' | 'working' | 'unknown' | 'none', warns, shift }
export function availability(sv, date, sh) {
  if (!sv || sv.denied) return { state: 'none', warns: [] };
  if (!sv.from || date < sv.from || date > sv.to) return { state: 'unknown', warns: [] };
  const shifts = Object.fromEntries((sv.shifts || []).map(s => [s.id, s]));
  const days = Object.fromEntries(Object.entries(sv.days || {}).map(([d, id]) => [d, { type: 'EXTRA', shiftId: id }]));
  const worked = sv.days && sv.days[date];
  if (worked) return { state: 'working', warns: [], shift: shifts[worked] || null };
  const warns = restWarnings({ shifts, patterns: [], days }, date, sh).map(w => w.replace('your ', 'their '));
  return { state: warns.length ? 'tight' : 'free', warns };
}
// The shifts a colleague works in a date window, to offer in exchange for mine.
export function theirShifts(sv, from, to, limit = 4) {
  const shifts = Object.fromEntries(((sv && sv.shifts) || []).map(s => [s.id, s])), out = [];
  for (let n = E.dayNum(from); n <= E.dayNum(to) && out.length < limit; n++) {
    const d = E.fromDayNum(n), id = sv && sv.days && sv.days[d];
    if (id && shifts[id] && d >= (sv.from || '') && d <= (sv.to || '9999')) out.push({ d, def: shifts[id] });
  }
  return out;
}

// ---------------- swap requests ----------------
// A swap document (swaps/{id}):
//   aUid, aName, aDate, aShift{...}   the person who asked: gives aShift on aDate
//   bUid, bName, bDate, bShift{...}   the person asked: gives bShift on bDate
//   status: pending | countered | approved | declined | cancelled
//   turn: uid who has to answer next
//   note, created, updated, applied: { uid: true }, log: [{at, by, act, date?}]
export const SWAP_STATUS = { pending: 'Waiting', countered: 'New date suggested', approved: 'Approved', declined: 'Declined', cancelled: 'Cancelled' };

export function newSwap({ a, b, aDate, aShift, bDate, bShift, note, now }) {
  return {
    aUid: a.uid, aName: a.name, aDate, aShift: shiftDef(aShift),
    bUid: b.uid, bName: b.name, bDate, bShift: shiftDef(bShift),
    status: 'pending', turn: b.uid, note: String(note || '').slice(0, 200), created: now, updated: now,
    applied: {}, members: [a.uid, b.uid], log: [{ at: now, by: a.uid, act: 'asked' }]
  };
}
export const isOpen = s => s.status === 'pending' || s.status === 'countered';
export const otherUid = (s, me) => (s.aUid === me ? s.bUid : s.aUid);
export const otherName = (s, me) => (s.aUid === me ? s.bName : s.aName);
export const myPart = (s, me) => (s.aUid === me ? { date: s.aDate, shift: s.aShift } : { date: s.bDate, shift: s.bShift });
export const theirPart = (s, me) => (s.aUid === me ? { date: s.bDate, shift: s.bShift } : { date: s.aDate, shift: s.aShift });

// Counter-propose: the person answering suggests a different date for THEIR shift.
export function counterPatch(s, me, newDate, newShift, now) {
  const mine = s.aUid === me ? { aDate: newDate, aShift: shiftDef(newShift) } : { bDate: newDate, bShift: shiftDef(newShift) };
  return { ...mine, status: 'countered', turn: otherUid(s, me), updated: now, log: [...(s.log || []), { at: now, by: me, act: 'countered', date: newDate }].slice(-12) };
}
export const answerPatch = (s, me, status, now) => ({ status, turn: otherUid(s, me), updated: now, log: [...(s.log || []), { at: now, by: me, act: status }].slice(-12) });

// What an approved swap changes in MY calendar. Returns { writes: {date: override}, newShift: def|null, error }.
//   ctx = my { shifts, patterns, days }
export function planApproved(s, me, ctx) {
  const give = myPart(s, me), take = theirPart(s, me);
  const gi = E.dayInfo(give.date, ctx);
  const writes = {};
  if (!gi.base && !gi.isWorking) return { writes, newShift: null, error: `You are not scheduled on ${give.date} any more.` };
  const person = otherName(s, me);
  writes[give.date] = { type: 'SWAP_OUT', shiftId: gi.base || gi.work, hours: gi.baseHours || gi.hours, person };
  const have = matchShift(Object.values(ctx.shifts), take.shift);
  const shiftId = have ? have.id : 'x' + Math.abs(parseInt(hash(take.shift.start + take.shift.end + take.shift.code), 36)).toString(36).slice(0, 8);
  writes[take.date] = { type: 'SWAP_IN', shiftId, hours: E.paidHours(take.shift), person };
  return { writes, newShift: have ? null : { ...take.shift, id: shiftId }, error: '' };
}

export function newNotice({ type, from, fromName, text, ref, now }) {
  return { type, from, fromName: String(fromName || '').slice(0, 60), text: String(text).slice(0, 200), ref: ref || '', at: now, read: false };
}

export const newCode = () => {
  const a = new Uint8Array(15);
  (globalThis.crypto || { getRandomValues: x => x.map(() => Math.floor(Math.random() * 256)) }).getRandomValues(a);
  return Array.from(a, b => 'abcdefghjkmnpqrstuvwxyz23456789'[b % 31]).join('');
};

export const initials = n => String(n || '?').trim().split(/\s+/).slice(0, 2).map(x => x[0] || '').join('').toUpperCase() || '?';
