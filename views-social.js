// Sharing a view-only calendar, following colleagues, swap requests and the bell.
// No server code: your app writes a safe copy of your working shifts, and Firestore rules decide who may read it.
import {
  E, SH, S, VIEWS, ACT, SWIPE, ON_CHANGE, $, esc, MONTHS, DOWL, fmtMD, fmtD, fmtDY, fmtAgo, dowFrom, ico, bstyle, inkFor, badge,
  toast, top, nav, demoNote, field, sw, wheel, render, go, tab, back, saveErr, ws, todayParts, setProfile, empty, track, shiftTimes
} from './core.js';

S.shared = S.shared || {};   // owner uid -> their safe calendar copy (or { denied: true })
S.fperm = S.fperm || {};     // owner uid -> my access record under them { active, swap } or null
const FW = {};               // watchers per followed colleague
let pubTimer = null, lastPub = '', pubState = '';
const applying = new Set();

const myName = () => ((S.profile && S.profile.name) || (S.user && S.user.name) || ((S.user && S.user.email) || 'Someone').split('@')[0]).slice(0, 60);
const nowMs = () => Date.now();
const rid = p => p + nowMs().toString(36) + Math.random().toString(36).slice(2, 6);
const unreadCount = () => Object.values(S.notes || {}).filter(n => !n.read).length;
const permOf = o => S.fperm[o];
const shCode = def => (def && def.code) || '?';

export function resetSocial() {
  Object.values(FW).forEach(fs => fs.forEach(f => { try { f(); } catch (e) { /* ignore */ } }));
  Object.keys(FW).forEach(k => delete FW[k]);
  S.shared = {}; S.fperm = {}; lastPub = ''; pubState = ''; clearTimeout(pubTimer);
}

// ---------- notifications ----------
export async function notify(toUid, { type, text, ref }) {
  try {
    const n = SH.newNotice({ type, from: S.user.uid, fromName: myName(), text, ref, now: nowMs() });
    await S.be.setDoc(`users/${toUid}/notifications/${rid('n')}`, n, false);
  } catch (e) { console.warn('notice not sent', e); }
}

// ---------- publishing my safe copy ----------
export function publishSoon() {
  clearTimeout(pubTimer);
  pubTimer = setTimeout(publishNow, 1500);
}
async function publishNow() {
  if (!S.profile || !S.profile.onboarded || !S.user || !S.be) return;
  const has = Object.keys(S.viewers || {}).length > 0;
  try {
    if (!has) {
      if (pubState !== 'none') { await S.be.delDoc(`shared/${S.user.uid}`); pubState = 'none'; lastPub = ''; }
      return;
    }
    const today = E.todayIso();
    const view = SH.buildSharedView(S.profile, S.days, today);
    const key = view.hash + '|' + today;
    if (key === lastPub) return;
    await S.be.setDoc(`shared/${S.user.uid}`, view, false);
    lastPub = key; pubState = 'on';
  } catch (e) { console.warn('could not publish', e); if (S.view === 'sharing') toast(saveErr(e)); }
}
ON_CHANGE.push(publishSoon);

// ---------- watching colleagues I follow ----------
export function syncFollow() {
  const want = new Set(Object.keys(S.following || {}));
  for (const o of want) {
    if (FW[o]) continue;
    const bump = () => { if (['follow', 'colleague', 'swapNew', 'swapView', 'swapCounter', 'whoCan'].includes(S.view)) render(false); };
    FW[o] = [
      S.be.watchDoc(`shared/${o}`, d => { S.shared[o] = d; bump(); }, () => { S.shared[o] = { denied: true }; bump(); }),
      S.be.watchDoc(`users/${o}/viewers/${S.user.uid}`, d => { S.fperm[o] = d; bump(); }, () => { S.fperm[o] = null; bump(); })
    ];
  }
  for (const o of Object.keys(FW)) if (!want.has(o)) { FW[o].forEach(f => f()); delete FW[o]; delete S.shared[o]; delete S.fperm[o]; }
}

// ---------- applying an approved swap to my own calendar ----------
export async function applySwaps() {
  if (!S.profile || !S.profile.onboarded || !S.user) return;
  const me = S.user.uid;
  for (const [id, s] of Object.entries(S.swaps || {})) {
    if (s.status !== 'approved' || (s.applied && s.applied[me]) || applying.has(id)) continue;
    applying.add(id);
    try {
      const plan = SH.planApproved(s, me, S.C);
      if (plan.error) toast(plan.error);
      else {
        if (plan.newShift) setProfile({ shifts: [...S.profile.shifts, { ...plan.newShift }] });
        await S.be.setDays(me, plan.writes);
        toast(`Swap with ${SH.otherName(s, me)} added to your calendar`);
      }
      await S.be.setDoc(`swaps/${id}`, { applied: { [me]: true } }, true);
    } catch (e) { console.warn('could not apply swap', e); applying.delete(id); }
  }
}

// ---------- invite link from the address bar ----------
export function joinFromUrl() {
  const u = new URL(location.href), c = u.searchParams.get('join');
  if (c) { S.joinCode = c.replace(/[^a-z0-9]/gi, '').slice(0, 40); u.searchParams.delete('join'); history.replaceState(history.state, '', u.pathname + (u.search || '') + u.hash); }
}
export function maybeShowJoin() {
  if (S.joinCode && S.profile && S.profile.onboarded) { S.p = { code: S.joinCode }; S.joinCode = ''; go('join', { code: S.p.code }); return true; }
  return false;
}

// ---------- helpers for screens ----------
const myUpcoming = (n = 60) => {
  const out = [], t = E.todayIso();
  for (let k = 0; k < n; k++) { const d = E.addDays(t, k), i = E.dayInfo(d, S.C), sh = i.isWorking && S.C.shifts[i.work]; if (sh) out.push({ d, sh }); }
  return out;
};
const colleagueCtx = o => {
  const sv = S.shared[o]; if (!sv || sv.denied) return null;
  const shifts = Object.fromEntries((sv.shifts || []).map(s => [s.id, s]));
  const days = Object.fromEntries(Object.entries(sv.days || {}).map(([d, id]) => [d, { type: 'EXTRA', shiftId: id }]));
  return { shifts, patterns: [], days };
};
const chip = (def, big) => `<span class="bdg" style="${bstyle(def)}${big ? ';width:56px;height:48px;border-radius:12px;font-size:18px' : ''}">${esc(def.code)}</span>`;
const swapLine = (s, me) => {
  const my = SH.myPart(s, me), their = SH.theirPart(s, me);
  return `You work <b>${esc(shCode(my.shift))}</b> ${fmtD(my.date)}. ${esc(SH.otherName(s, me))} works <b>${esc(shCode(their.shift))}</b> ${fmtD(their.date)}.`;
};
const person = (name, sub, extra = '') => `<span class="bdg av" style="background:var(--soft);color:var(--soft-ink)">${esc(SH.initials(name))}</span><span class="grow"><b style="display:block;font-size:15px">${esc(name)}</b><span class="small mute">${sub}</span></span>${extra}`;

// =====================================================================
// SHARING (I am the owner)
// =====================================================================
const inviteLink = code => `${location.origin}${location.pathname}?join=${code}`;
VIEWS.sharing = () => {
  const viewers = Object.entries(S.viewers || {}).sort((a, b) => (a[1].since || 0) - (b[1].since || 0));
  const now = nowMs(), invs = Object.entries(S.invites || {}).filter(([, v]) => v.expires > now);
  const link = S.p.code ? inviteLink(S.p.code) : '';
  return `${demoNote()}<div class="stack">${top('Share my calendar')}
    <div class="note"><b>Colleagues see only the shifts you work.</b> Vacation, sick days, lieu days, notes, balances and pay are never shared. Any day you are off, for any reason, just shows as <b>Off</b>.</div>
    <div class="card stack"><h2>Invite a colleague</h2>
      <p class="small mute">Send them a link. They sign in, tap Accept, and can view your shifts. A link works for 7 days and you can cancel it any time.</p>
      ${link ? `<div class="linkbox"><input id="invLink" type="text" readonly value="${esc(link)}" aria-label="Invite link"></div>
        <div class="two"><button class="btn" data-act="invShare">${ico('link', 18)} Send link</button><button class="btn sec" data-act="invCopy">Copy link</button></div>
        <a class="link" style="text-align:center" href="mailto:?subject=${encodeURIComponent(myName() + ' shared a shift calendar with you')}&body=${encodeURIComponent('Open this link to view my shifts:\n' + link)}">Send by email instead</a>`
        : '<button class="btn" data-act="invNew">Create an invite link</button>'}
    </div>
    ${invs.length ? `<div><h2 style="margin-bottom:6px">Active invite links</h2><div class="card tight">${invs.map(([c, v]) => `<div class="item" style="min-height:52px"><span class="grow"><span class="t" style="display:block">Link ending ${esc(c.slice(-4))}</span><span class="s">Expires ${new Date(v.expires).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span></span><button class="link" data-act="invRevoke" data-c="${esc(c)}" style="color:var(--err)">Cancel</button></div>`).join('')}</div></div>` : ''}
    <div><h2 style="margin-bottom:6px">Shared with</h2>
      ${viewers.length ? `<div class="stack" style="gap:10px">${viewers.map(([id, v]) => `<div class="card stack" style="gap:10px"><div class="row">${person(v.name || 'Colleague', v.active ? 'Can see your shifts' : 'Paused. Cannot see your shifts')}</div>
        <div class="row between"><span><b>Can view</b></span>${sw(!!v.active, 'vwActive', `data-id="${esc(id)}"`, 'Can view ' + (v.name || ''))}</div>
        <div class="row between"><span><b>Can send swap requests</b></span>${sw(!!v.swap, 'vwSwap', `data-id="${esc(id)}"`, 'Can send swap requests ' + (v.name || ''))}</div>
        <button class="link" data-act="vwRemove" data-id="${esc(id)}" style="color:var(--err);align-self:flex-start">Remove ${esc((v.name || 'this person').split(' ')[0])}</button></div>`).join('')}</div>`
        : '<div class="card"><p class="mute">Nobody yet. Create an invite link above.</p></div>'}
    </div></div>${nav('settings')}`;
};

Object.assign(ACT, {
  sharingOpen: () => go('sharing', {}),
  async invNew() {
    const code = SH.newCode(), now = nowMs();
    try {
      await S.be.setDoc(`shareInvites/${code}`, { owner: S.user.uid, ownerName: myName(), created: now, expires: now + 7 * 864e5 }, false);
      S.p.code = code; history.replaceState({ view: 'sharing', p: S.p, depth: (history.state && history.state.depth) || 1 }, '');
      render(false);
    } catch (e) { toast(saveErr(e)); }
  },
  async invShare() {
    const link = inviteLink(S.p.code), text = `${myName()} shared a shift calendar with you. Open this link to view my shifts:`;
    if (navigator.share) { try { await navigator.share({ title: 'Shift Calendar', text, url: link }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
    ACT.invCopy();
  },
  async invCopy() {
    const link = inviteLink(S.p.code);
    try { await navigator.clipboard.writeText(link); toast('Link copied'); } catch (e) { const el = $('#invLink'); if (el) { el.select(); toast('Press and hold to copy'); } }
  },
  async invRevoke(d) { try { await S.be.delDoc(`shareInvites/${d.c}`); if (S.p.code === d.c) S.p.code = ''; toast('Link cancelled'); } catch (e) { toast(saveErr(e)); } },
  async vwActive(d) {
    const v = S.viewers[d.id]; if (!v) return;
    try { await S.be.setDoc(`users/${S.user.uid}/viewers/${d.id}`, { active: !v.active }, true); toast(v.active ? 'Paused. They can no longer see your shifts' : 'Access is back on'); } catch (e) { toast(saveErr(e)); }
  },
  async vwSwap(d) {
    const v = S.viewers[d.id]; if (!v) return;
    try { await S.be.setDoc(`users/${S.user.uid}/viewers/${d.id}`, { swap: !v.swap }, true); toast(v.swap ? 'Swap requests turned off' : 'They can send swap requests'); } catch (e) { toast(saveErr(e)); }
  },
  async vwRemove(d) {
    const v = S.viewers[d.id];
    if (!confirm(`Remove ${(v && v.name) || 'this person'}? They will no longer see your calendar.`)) return;
    try { await S.be.delDoc(`users/${S.user.uid}/viewers/${d.id}`); toast('Removed'); } catch (e) { toast(saveErr(e)); }
  }
});

// =====================================================================
// JOINING (a colleague opens my link)
// =====================================================================
VIEWS.join = () => {
  const j = S.join || (S.join = { code: S.p.code, state: 'load' });
  if (j.code !== S.p.code) { S.join = { code: S.p.code, state: 'load' }; return VIEWS.join(); }
  if (j.state === 'load') {
    j.state = 'wait';
    S.be.getDoc(`shareInvites/${j.code}`).then(doc => {
      const now = nowMs();
      if (!doc) j.state = 'bad';
      else if (doc.owner === S.user.uid) j.state = 'own';
      else if (doc.expires < now) j.state = 'expired';
      else if (S.following[doc.owner]) { j.state = 'already'; j.doc = doc; }
      else { j.state = 'ok'; j.doc = doc; }
      if (S.view === 'join') render(false);
    }).catch(() => { j.state = 'bad'; if (S.view === 'join') render(false); });
  }
  const msg = {
    wait: ['Checking the link...', ''], bad: ['This link does not work', 'It may have been cancelled. Ask your colleague for a new one.'],
    own: ['This is your own link', 'Send it to a colleague instead of opening it yourself.'], expired: ['This link has expired', 'Ask your colleague to send a new one.'],
    already: [`You already follow ${esc(j.doc && j.doc.ownerName)}`, ''], ok: [`${esc(j.doc && j.doc.ownerName)} wants to share a calendar with you`, 'You will see only the shifts they work. Anything else shows as Off. You can stop following any time.']
  }[j.state] || ['', ''];
  return `<div class="stack" style="padding-top:40px"><div class="hero" style="margin:0;border-radius:20px;padding:28px 22px"><div class="logo">${ico('users', 30)}</div><h1 style="font-size:24px">${msg[0]}</h1><p>${msg[1]}</p></div>
    ${j.error ? `<div class="note err" role="alert">${esc(j.error)}</div>` : ''}
    ${j.state === 'ok' ? '<button class="btn" data-act="joinAccept">Accept and view calendar</button><button class="btn sec" data-act="joinDecline">Not now</button>'
      : j.state === 'already' ? `<button class="btn" data-act="cOpen" data-o="${esc(j.doc.owner)}">View calendar</button>` : '<button class="btn sec" data-act="joinDecline">Back to my calendar</button>'}</div>`;
};
Object.assign(ACT, {
  joinDecline: () => { S.join = null; tab('cal'); },
  async joinAccept() {
    const j = S.join, me = S.user.uid, owner = j.doc.owner, now = nowMs();
    try {
      // the viewer record first: the rules for the notice check that it exists
      await S.be.setDoc(`users/${owner}/viewers/${me}`, { code: j.code, name: myName(), email: S.user.email || '', since: now, active: true, swap: false }, false);
      await S.be.setDoc(`users/${me}/following/${owner}`, { name: j.doc.ownerName || 'Colleague', since: now }, false);
      await notify(owner, { type: 'joined', text: `${myName()} can now view your calendar.`, ref: '' });
      S.join = null; toast('Added'); history.replaceState({ view: 'cal', p: {}, depth: 0 }, ''); S.view = 'colleague'; S.p = { o: owner }; S.csel = null; S.cmonth = todayParts(); render(true);
    } catch (e) { j.error = (e.code || '').includes('permission') ? 'The link could not be used. It may have expired or been cancelled.' : saveErr(e); render(false); }
  }
});

// =====================================================================
// COLLEAGUES I FOLLOW
// =====================================================================
VIEWS.follow = () => {
  const list = Object.entries(S.following || {});
  return `<div class="stack">${top('Calendars shared with me')}
    ${list.length ? `<div class="stack" style="gap:8px">${list.map(([o, f]) => { const p = permOf(o), sv = S.shared[o]; const sub = sv && sv.denied ? 'Access paused' : p && p.swap ? 'You can send swap requests' : 'View only'; return `<div class="card row">${person(f.name || 'Colleague', sub)}<button class="btn sec slim" data-act="cOpen" data-o="${esc(o)}">View</button><button class="iconbtn" data-act="unfollow" data-o="${esc(o)}" aria-label="Stop following ${esc(f.name || '')}">${ico('x', 18)}</button></div>`; }).join('')}</div>`
      : `<div class="card">${empty('users', 'No shared calendars yet', 'When a colleague sends you an invite link, open it and tap Accept. Then you can see their shifts and find who can take yours.')}</div>`}
    <div class="note small">You only ever see the shifts a colleague works. Whether they are off, on vacation or sick is not shown.</div></div>${nav('settings')}`;
};
Object.assign(ACT, {
  followOpen: () => go('follow', {}),
  cOpen: d => { S.csel = null; S.cmonth = todayParts(); go('colleague', { o: d.o }); },
  async unfollow(d) {
    const f = S.following[d.o];
    if (!confirm(`Stop following ${(f && f.name) || 'this colleague'}?`)) return;
    try { await S.be.delDoc(`users/${d.o}/viewers/${S.user.uid}`); } catch (e) { /* the owner may have removed me already */ }
    try { await S.be.delDoc(`users/${S.user.uid}/following/${d.o}`); toast('Stopped following'); } catch (e) { toast(saveErr(e)); }
  },
  askColleague() {
    const ids = Object.keys(S.following || {});
    if (!ids.length) { toast('Open a colleague\'s invite link first'); return go('follow', {}); }
    if (ids.length === 1) return ACT.cOpen({ o: ids[0] });
    go('follow', {});
  }
});

// ---------- a colleague's calendar (view only) ----------
VIEWS.colleague = () => {
  const o = S.p.o, f = S.following[o] || {}, sv = S.shared[o], perm = permOf(o);
  const name = f.name || (sv && sv.name) || 'Colleague';
  const head = `${top(name + "'s shifts", true)}`;
  if (sv && sv.denied) return `<div class="stack">${head}<div class="note warn"><b>${esc(name)} paused your access.</b> Ask them to turn it back on in their Share my calendar screen.</div></div>${nav('settings')}`;
  if (!sv) return `<div class="stack">${head}<div class="card"><p class="mute">${S.shared[o] === null ? `${esc(name)} has not published their calendar yet. It appears a few moments after they open the app.` : 'Loading...'}</p></div></div>${nav('settings')}`;
  if (!S.cmonth) S.cmonth = todayParts();
  const { y, m } = S.cmonth, W = ws(), first = E.ymd(y, m, 1), dim = E.daysInMonth(y, m), lead = E.weekOffset(first, W), today = E.todayIso();
  const defs = Object.fromEntries((sv.shifts || []).map(s => [s.id, s]));
  let cells = '';
  for (let i = 0; i < lead; i++) cells += '<span class="cell blank"></span>';
  for (let d = 1; d <= dim; d++) {
    const date = E.ymd(y, m, d), id = sv.days && sv.days[date], def = id && defs[id], mi = E.dayInfo(date, S.C), msh = mi.isWorking && S.C.shifts[mi.work];
    const inWin = date >= sv.from && date <= sv.to;
    cells += `<button class="cell ${date === today ? 'now' : ''} ${S.csel === date ? 'picked' : ''}" data-act="cPick" data-d="${date}" aria-label="${DOWL[E.weekday(date)]} ${MONTHS[m - 1]} ${d}, ${def ? esc(name) + ' works ' + esc(def.name) : inWin ? esc(name) + ' is off' : 'not shared yet'}${msh ? ', you work ' + esc(msh.code) : ''}">
      <span class="dn">${d}</span>${def ? `<span class="bdg" style="${bstyle(def)}">${esc(def.code)}</span>` : `<span class="bdg offc">${inWin ? 'Off' : ''}</span>`}<span class="ic">${msh ? `<span class="mine">${esc(msh.code)}</span>` : ''}</span></button>`;
  }
  let detail = '';
  if (S.csel) {
    const d = S.csel, id = sv.days && sv.days[d], def = id && defs[id], mi = E.dayInfo(d, S.C), msh = mi.isWorking && S.C.shifts[mi.work];
    const canSwap = !!(def && perm && perm.active && perm.swap);
    detail = `<div class="card stack"><b>${fmtDY(d)}</b>
      <div class="row">${def ? chip(def, true) : '<span class="bdg offc" style="width:56px;height:48px">Off</span>'}<span class="grow"><b>${esc(name)}</b><div class="small mute">${def ? `${esc(def.name)} · ${def.start} to ${def.end}${E.crossesMidnight(def) ? ' (next day)' : ''}` : d >= sv.from && d <= sv.to ? 'Off' : 'Not shared for this date'}</div></span></div>
      <div class="row">${msh ? chip(msh, true) : '<span class="bdg offc" style="width:56px;height:48px">Off</span>'}<span class="grow"><b>You</b><div class="small mute">${msh ? `${esc(msh.name)} · ${msh.start} to ${msh.end}` : 'Off'}</div></span></div>
      ${canSwap ? `<button class="btn" data-act="swapNew" data-d="${d}">${ico('swap', 18)} Ask ${esc(name.split(' ')[0])} to swap shifts</button>`
        : def ? `<div class="note small">${esc(name)} has not turned on swap requests for you.</div>` : ''}</div>`;
  }
  return `<div class="stack">${head}
    <div class="mh"><span><span style="font-size:26px;font-weight:800;letter-spacing:-.02em">${MONTHS[m - 1]}</span><span class="yr">${y}</span></span><span class="row" style="gap:6px"><button class="iconbtn" data-act="cMonth" data-n="-1" aria-label="Previous month">${ico('back')}</button><button class="iconbtn" data-act="cMonth" data-n="1" aria-label="Next month">${ico('next')}</button></span></div>
    <div data-swipe="colleague"><div class="cal">${Array.from({ length: 7 }, (_, k) => `<div class="dow">${dowFrom(W, k).slice(0, 2)}</div>`).join('')}${cells}</div></div>
    <div class="legend"><span>${(sv.shifts || []).map(s => `<span>${chip(s)}${s.start} to ${s.end}</span>`).join('')}</span></div>
    <div class="legend"><span><span class="mine">AM</span> Small code = your own shift</span><span>Swipe left or right to change month</span></div>
    ${detail}</div>${nav('settings')}`;
};
SWIPE.colleague = n => ACT.cMonth({ n });
Object.assign(ACT, {
  cPick: d => { S.csel = S.csel === d.d ? null : d.d; render(false); },
  cMonth(d) { let { y, m } = S.cmonth; m += Number(d.n); if (m < 1) { m = 12; y--; } if (m > 12) { m = 1; y++; } S.cmonth = { y, m }; S.csel = null; render(false); }
});

// =====================================================================
// SWAP REQUESTS
// =====================================================================
// New request. I give one of my shifts and take the colleague's shift on the tapped date.
VIEWS.swapNew = () => {
  const o = S.p.o, f = S.following[o] || {}, sv = S.shared[o], sn = S.sn;
  if (!sv || sv.denied || !sn) return `<div class="stack">${top('Ask for a swap')}<div class="note warn">This calendar is not available right now.</div></div>`;
  const defs = Object.fromEntries((sv.shifts || []).map(s => [s.id, s])), theirDef = defs[sv.days[sn.theirDate]];
  const mine = myUpcoming(), name = f.name || 'Colleague';
  if (!theirDef) return `<div class="stack">${top('Ask for a swap')}<div class="note warn">${esc(name)} is not working on ${fmtD(sn.theirDate)}.</div></div>`;
  if (!sn.myDate || !mine.some(x => x.d === sn.myDate)) sn.myDate = (mine.find(x => x.d !== sn.theirDate) || mine[0] || {}).d || '';
  const give = mine.find(x => x.d === sn.myDate);
  let warns = [];
  if (give) {
    const myCtx = { shifts: S.C.shifts, patterns: S.C.patterns, days: { ...S.days, [give.d]: { type: 'OFF' } } };
    warns = SH.restWarnings(myCtx, sn.theirDate, theirDef).map(w => 'You: ' + w);
    const cc = colleagueCtx(o);
    if (cc) { const days = { ...cc.days }; delete days[sn.theirDate]; warns = warns.concat(SH.restWarnings({ ...cc, days }, give.d, give.sh).map(w => `${name.split(' ')[0]}: ${w}`)); }
    if (mine.length && S.C.shifts && E.dayInfo(sn.theirDate, S.C).isWorking && sn.theirDate !== give.d) warns.push(`You already work on ${fmtD(sn.theirDate)}.`);
  }
  return `<div class="stack">${top('Ask for a swap')}
    <div class="card stack"><div class="small mute" style="font-weight:700">You would take</div>
      <div class="row">${chip(theirDef, true)}<span class="grow"><b>${esc(name)}'s ${esc(theirDef.name)}</b><div class="small mute">${fmtDY(sn.theirDate)} · ${theirDef.start} to ${theirDef.end}</div></span></div></div>
    <div class="card stack"><div class="small mute" style="font-weight:700">In exchange you give one of your shifts</div>
      ${mine.length ? wheel('swapMyDate', mine.map(x => [x.d, `${fmtD(x.d)}  ·  ${x.sh.code}  ${x.sh.start}-${x.sh.end}`]), sn.myDate, 'Your shift to give') : '<p class="mute">You have no upcoming shifts to offer.</p>'}
      <p class="hint" style="margin:0">Roll to choose. You can offer a different date than theirs; your colleague can also suggest another date.</p></div>
    ${warns.length ? `<div class="note warn"><b>Heads up on rest time</b><br>${warns.map(esc).join('<br>')}</div>` : ''}
    <div><label for="swapNote">Message (optional)</label><textarea id="swapNote" maxlength="200" placeholder="I have an appointment that day">${esc(sn.note)}</textarea></div></div>
  <div class="actbar"><button class="btn" data-act="swapSend" ${give ? '' : 'disabled'}>Send request</button></div>`;
};
Object.assign(ACT, {
  swapNew(d) { S.sn = { theirDate: d.d, myDate: '', note: '' }; go('swapNew', { o: S.p.o }); },
  swapMyDate(d) { readNote(); S.sn.myDate = d.v; render(false); },
  async swapSend() {
    readNote();
    const o = S.p.o, sn = S.sn, sv = S.shared[o], f = S.following[o] || {};
    const defs = Object.fromEntries((sv.shifts || []).map(s => [s.id, s])), theirDef = defs[sv.days[sn.theirDate]], give = myUpcoming().find(x => x.d === sn.myDate);
    if (!theirDef || !give) return toast('Choose the shifts first');
    const now = nowMs(), id = rid('sw');
    const swap = SH.newSwap({ a: { uid: S.user.uid, name: myName() }, b: { uid: o, name: f.name || sv.name || 'Colleague' }, aDate: give.d, aShift: give.sh, bDate: sn.theirDate, bShift: theirDef, note: sn.note, now });
    try {
      await S.be.setDoc(`swaps/${id}`, swap, false);
      await notify(o, { type: 'swap', text: `${myName()} asks to swap: your ${theirDef.code} on ${fmtMD(sn.theirDate)} for their ${give.sh.code} on ${fmtMD(give.d)}.`, ref: id });
      toast('Request sent'); S.sn = null; history.replaceState({ view: 'swapView', p: { id }, depth: 1 }, ''); S.view = 'swapView'; S.p = { id }; render(true);
    } catch (e) { toast((e.code || '').includes('permission') ? 'Not allowed. Your colleague may have turned swap requests off.' : saveErr(e)); }
  }
});
function readNote() { const el = $('#swapNote'); if (el && S.sn) S.sn.note = el.value; }
document.addEventListener('change', e => { if (e.target.id === 'swapNote') readNote(); });

// =====================================================================
// WHO CAN TAKE MY SHIFT
// =====================================================================
// Looks at the calendars colleagues shared with me and says who is off that day, who would have a short rest, and who is busy.
VIEWS.whoCan = () => {
  const date = S.p.date, i = E.dayInfo(date, S.C), sh = S.C.shifts[i.work];
  const head = top('Who can take my shift?');
  if (!sh || i.type === 'SWAP_OUT') return `<div class="stack">${head}${empty('cal', 'You are not working that day', 'Pick one of your shifts on the calendar, then ask again.')}</div>`;
  const ids = Object.keys(S.following || {});
  const mine = `<div class="card row">${chip(sh, true)}<span class="grow"><b style="font-size:16px">${esc(sh.name)}</b><div class="small mute">${fmtDY(date)} · ${shiftTimes(sh, date)}</div></span></div>`;
  if (!ids.length) return `<div class="stack">${head}${mine}<div class="card">${empty('users', 'No colleagues yet', 'When a colleague shares their calendar with you, this screen shows who is free to take your shift.', 'Calendars shared with me', 'followOpen')}</div></div>`;
  const rank = { free: 0, tight: 1, working: 2, unknown: 3, none: 4 };
  const people = ids.map(o => { const f = S.following[o] || {}, sv = S.shared[o]; return { o, name: f.name || (sv && sv.name) || 'Colleague', perm: permOf(o), sv, a: SH.availability(sv, date, sh) }; })
    .sort((x, y) => rank[x.a.state] - rank[y.a.state] || x.name.localeCompare(y.name));
  const free = people.filter(p => p.a.state === 'free').length;
  const card = p => {
    const { a, sv, perm } = p, canSwap = !!(perm && perm.active && perm.swap);
    const tag = { free: ['ok', 'Off, good rest'], tight: ['tight', 'Off, short rest'], working: ['busy', 'Working'], unknown: ['busy', 'Not shared yet'], none: ['busy', 'Access paused'] }[a.state];
    const line = a.state === 'free' ? `${esc(p.name.split(' ')[0])} is off on ${fmtD(date)} and has enough rest around your ${esc(sh.code)} shift.`
      : a.state === 'tight' ? a.warns.map(esc).join(' ')
        : a.state === 'working' ? `${esc(p.name.split(' ')[0])} works ${a.shift ? esc(a.shift.code) + ' ' + a.shift.start + ' to ' + a.shift.end : 'that day'}. You could trade shifts instead.`
          : a.state === 'unknown' ? 'This date is outside the part of their calendar they share.' : 'They paused your access.';
    let offer = '';
    if (a.state === 'free' || a.state === 'tight' || a.state === 'working') {
      const opts = a.state === 'working' ? [{ d: date, def: a.shift }].filter(x => x.def) : SH.theirShifts(sv, E.addDays(date, -3) > E.todayIso() ? E.addDays(date, -3) : E.todayIso(), E.addDays(date, 10), 4).filter(x => x.d !== date);
      offer = !canSwap ? `<div class="small mute">View only. Ask ${esc(p.name.split(' ')[0])} to turn on swap requests for you.</div>`
        : opts.length ? `<div class="small mute" style="font-weight:700">${a.state === 'working' ? 'Trade with' : 'Offer to take one of their shifts in exchange'}</div><div class="takechips">${opts.map(x => `<button class="takechip" data-act="whoAsk" data-o="${esc(p.o)}" data-t="${x.d}" aria-label="Ask ${esc(p.name)} to swap for ${esc(x.def.code)} on ${fmtD(x.d)}">${chip(x.def)}${fmtD(x.d)}</button>`).join('')}</div>`
          : `<div class="small mute">They have no other shifts in the next 10 days to offer in exchange. Open their calendar to pick a date.</div><button class="btn sec slim" data-act="cOpen" data-o="${esc(p.o)}">Open ${esc(p.name.split(' ')[0])}'s calendar</button>`;
    }
    return `<div class="whocard"><div class="row">${person(p.name, '', `<span class="whotag ${tag[0]}">${tag[1]}</span>`)}</div><div class="small">${line}</div>${offer}</div>`;
  };
  return `<div class="stack">${head}${mine}
    <div class="note ${free ? '' : 'warn'}">${free ? `<b>${free} colleague${free === 1 ? ' is' : 's are'} free</b> on ${fmtD(date)}.` : 'Nobody who shares with you is clearly free that day.'} Only the shifts people work are shared, so a colleague on vacation looks like they are off. Ask first.</div>
    <div class="who">${people.map(card).join('')}</div></div>`;
};
Object.assign(ACT, {
  whoOpen: d => go('whoCan', { date: d.d }),
  whoAsk(d) { S.sn = { theirDate: d.t, myDate: S.p.date, note: '' }; go('swapNew', { o: d.o }); }
});

// One request: answer it, or follow it
VIEWS.swapView = () => {
  const id = S.p.id, s = S.swaps[id], me = S.user.uid;
  if (!s) return `<div class="stack">${top('Swap request')}<div class="card"><p class="mute">Loading, or this request was removed.</p></div></div>`;
  const my = SH.myPart(s, me), their = SH.theirPart(s, me), other = SH.otherName(s, me), mineTurn = s.turn === me && SH.isOpen(s), asker = s.aUid === me;
  const warns = [];
  const myCtx = { shifts: S.C.shifts, patterns: S.C.patterns, days: { ...S.days, [my.date]: { type: 'OFF' } } };
  if (SH.isOpen(s)) SH.restWarnings(myCtx, their.date, their.shift).forEach(w => warns.push(w));
  const status = { pending: asker ? `Waiting for ${esc(other)}` : 'Waiting for you', countered: mineTurn ? `${esc(other)} suggested a new date` : `Waiting for ${esc(other)} to answer your new date`, approved: 'Approved', declined: 'Declined', cancelled: 'Cancelled' }[s.status] || s.status;
  const mineDone = s.applied && s.applied[me];
  const shiftRow = (label, part, who) => `<div class="row">${chip(part.shift, true)}<span class="grow"><div class="small mute" style="font-weight:700">${label}</div><b>${fmtDY(part.date)}</b><div class="small mute">${esc(who)} · ${part.shift.start} to ${part.shift.end}</div></span></div>`;
  const log = (s.log || []).slice().reverse().map(l => `<div class="small mute" style="padding:2px 0">${l.by === me ? 'You' : esc(other)} ${{ asked: 'asked', countered: 'suggested ' + (l.date ? fmtMD(l.date) : 'a new date'), approved: 'approved', declined: 'declined', cancelled: 'cancelled' }[l.act] || l.act} · ${fmtAgo(l.at)}</div>`).join('');
  return `<div class="stack">${top('Swap with ' + other)}
    <div class="card stack"><div class="row between"><b>${status}</b><span class="tag" style="background:${s.status === 'approved' ? 'var(--soft)' : s.status === 'declined' || s.status === 'cancelled' ? 'var(--hol-bg)' : 'var(--warn-bg)'};padding:0 10px">${esc(SH.SWAP_STATUS[s.status] || s.status)}</span></div>
      ${shiftRow('You give', my, 'You')}${shiftRow('You take', their, other)}
      ${s.note ? `<div class="note small"><b>${asker ? 'Your' : esc(s.aName) + "'s"} message:</b> ${esc(s.note)}</div>` : ''}</div>
    ${warns.length ? `<div class="note warn"><b>Heads up on rest time</b><br>${warns.map(esc).join('<br>')}</div>` : ''}
    ${s.status === 'approved' ? `<div class="note">${mineDone ? 'Your calendar is updated.' : 'Updating your calendar...'}${s.applied && s.applied[SH.otherUid(s, me)] ? '' : ` ${esc(other)}'s calendar updates when they next open the app.`}</div>` : ''}
    ${log ? `<div class="card"><div class="small" style="font-weight:700;margin-bottom:4px">History</div>${log}</div>` : ''}</div>
  ${mineTurn ? `<div class="actbar stackbar"><div class="two"><button class="btn danger" data-act="swDecline">Decline</button><button class="btn" data-act="swApprove">Approve</button></div><button class="btn sec" data-act="swCounterOpen">Suggest a different date</button></div>`
    : SH.isOpen(s) && asker ? `<div class="actbar"><button class="btn danger" data-act="swCancel">Cancel my request</button></div>`
    : !SH.isOpen(s) ? `<div class="actbar"><button class="btn sec" data-act="swDelete">Remove from my list</button></div>` : ''}`;
};

// Suggest another date for MY shift
VIEWS.swapCounter = () => {
  const s = S.swaps[S.p.id], me = S.user.uid;
  if (!s) return `<div class="stack">${top('New date')}<div class="card"><p class="mute">This request is no longer available.</p></div></div>`;
  const their = SH.theirPart(s, me), mine = myUpcoming(90);
  if (!S.cc || S.cc.id !== s.id) S.cc = { id: s.id, d: SH.myPart(s, me).date };
  if (!mine.some(x => x.d === S.cc.d)) S.cc.d = (mine[0] || {}).d || '';
  const pick = mine.find(x => x.d === S.cc.d);
  const warns = pick ? SH.restWarnings({ shifts: S.C.shifts, patterns: S.C.patterns, days: { ...S.days, [SH.myPart(s, me).date]: { type: 'OFF' } } }, their.date, their.shift) : [];
  return `<div class="stack">${top('Suggest a different date')}
    <div class="note">${esc(SH.otherName(s, me))} wants to give <b>${esc(their.shift.code)}</b> on ${fmtDY(their.date)}. Choose which of <b>your</b> shifts you would give instead.</div>
    <div class="card stack">${mine.length ? wheel('ccDate', mine.map(x => [x.d, `${fmtD(x.d)}  ·  ${x.sh.code}  ${x.sh.start}-${x.sh.end}`]), S.cc.d, 'Your shift to give') : '<p class="mute">You have no upcoming shifts to offer.</p>'}</div>
    ${warns.length ? `<div class="note warn"><b>Heads up on rest time</b><br>${warns.map(esc).join('<br>')}</div>` : ''}</div>
  <div class="actbar"><button class="btn" data-act="swCounterSend" ${pick ? '' : 'disabled'}>Send my suggestion</button></div>`;
};

async function patchSwap(id, patch, noticeText) {
  const s = S.swaps[id];
  try {
    await S.be.setDoc(`swaps/${id}`, patch, true);
    await notify(SH.otherUid(s, S.user.uid), { type: 'swap', text: noticeText, ref: id });
    return true;
  } catch (e) { toast((e.code || '').includes('permission') ? 'Could not save. It may have changed. Try again.' : saveErr(e)); return false; }
}
Object.assign(ACT, {
  openSwap: d => go('swapView', { id: d.id }),
  ccDate: d => { S.cc.d = d.v; render(false); },
  swCounterOpen: () => { S.cc = null; go('swapCounter', { id: S.p.id }); },
  async swApprove() {
    const s = S.swaps[S.p.id], me = S.user.uid, my = SH.myPart(s, me), their = SH.theirPart(s, me);
    if (await patchSwap(s.id || S.p.id, SH.answerPatch(s, me, 'approved', nowMs()), `${myName()} approved the swap: ${their.shift.code} on ${fmtMD(their.date)} for ${my.shift.code} on ${fmtMD(my.date)}.`)) toast('Approved. Your calendar will update');
  },
  async swDecline() {
    const s = S.swaps[S.p.id], me = S.user.uid;
    if (await patchSwap(S.p.id, SH.answerPatch(s, me, 'declined', nowMs()), `${myName()} declined the swap.`)) toast('Declined');
  },
  async swCancel() {
    const s = S.swaps[S.p.id], me = S.user.uid, now = nowMs();
    if (await patchSwap(S.p.id, { status: 'cancelled', updated: now, log: [...(s.log || []), { at: now, by: me, act: 'cancelled' }].slice(-12) }, `${myName()} cancelled the swap request.`)) toast('Cancelled');
  },
  async swCounterSend() {
    const s = S.swaps[S.p.id], me = S.user.uid, pick = myUpcoming(90).find(x => x.d === S.cc.d);
    if (!pick) return;
    if (await patchSwap(S.p.id, SH.counterPatch(s, me, pick.d, pick.sh, nowMs()), `${myName()} suggests ${fmtD(pick.d)} (${pick.sh.code}) instead.`)) { toast('Suggestion sent'); S.cc = null; back(); }
  },
  async swDelete() {
    try { await S.be.delDoc(`swaps/${S.p.id}`); toast('Removed'); S.swaps = { ...S.swaps }; delete S.swaps[S.p.id]; back(); } catch (e) { toast(saveErr(e)); }
  }
});

// =====================================================================
// THE BELL
// =====================================================================
VIEWS.notices = () => {
  const me = S.user.uid;
  const notes = Object.entries(S.notes || {}).sort((a, b) => (b[1].at || 0) - (a[1].at || 0));
  const swaps = Object.entries(S.swaps || {}).map(([id, s]) => ({ ...s, id }));
  const waiting = swaps.filter(s => s.turn === me && SH.isOpen(s)), mine = swaps.filter(s => SH.isOpen(s) && s.turn !== me);
  const sw1 = (s, tag) => `<button class="item" data-act="openSwap" data-id="${esc(s.id)}"><span class="bdg av" style="background:var(--soft);color:var(--soft-ink)">${esc(SH.initials(SH.otherName(s, me)))}</span><span class="grow"><span class="t" style="display:block">${esc(SH.otherName(s, me))}</span><span class="s">${swapLine(s, me)}</span></span><span class="tag" style="background:var(--warn-bg);padding:0 8px">${tag}</span></button>`;
  const un = unreadCount();
  return `${demoNote()}<div class="stack"><div class="top"><button class="iconbtn" data-act="back" aria-label="Back">${ico('back')}</button><h1 class="grow">Notifications</h1>${un ? '<button class="btn sec slim" data-act="readAll">Mark all read</button>' : ''}</div>
    ${waiting.length ? `<div><h2 style="margin-bottom:6px">Waiting for your answer</h2><div class="card tight">${waiting.map(s => sw1(s, 'Answer')).join('')}</div></div>` : ''}
    ${mine.length ? `<div><h2 style="margin-bottom:6px">Your open requests</h2><div class="card tight">${mine.map(s => sw1(s, 'Waiting')).join('')}</div></div>` : ''}
    <div><h2 style="margin-bottom:6px">Recent</h2>${notes.length ? `<div class="card tight">${notes.slice(0, 40).map(([id, n]) => `<button class="item ${n.read ? '' : 'unread'}" data-act="openNote" data-id="${esc(id)}"><span class="bdg av" style="background:${n.read ? 'var(--track)' : 'var(--acc)'};color:${n.read ? 'var(--mute)' : 'var(--acc-ink)'}">${n.type === 'swap' ? ico('swap', 18) : ico('users', 18)}</span><span class="grow"><span class="t" style="display:block;font-weight:${n.read ? 600 : 800}">${esc(n.text)}</span><span class="s">${esc(n.fromName || '')} · ${fmtAgo(n.at)}</span></span></button>`).join('')}</div><button class="link" data-act="clearRead" style="margin-top:6px">Clear read notifications</button>`
      : '<div class="card"><p class="mute">Nothing yet. Swap requests and new colleagues show up here the next time you open the app.</p></div>'}</div></div>${nav('cal')}`;
};
Object.assign(ACT, {
  async openNote(d) {
    const n = S.notes[d.id]; if (!n) return;
    if (!n.read) S.be.setDoc(`users/${S.user.uid}/notifications/${d.id}`, { read: true }, true).catch(() => {});
    if (n.type === 'swap' && n.ref && S.swaps[n.ref]) go('swapView', { id: n.ref });
    else if (n.type === 'joined') go('sharing', {});
    else toast('That request is no longer open');
  },
  async readAll() {
    const ops = Object.entries(S.notes || {}).filter(([, n]) => !n.read).map(([id]) => S.be.setDoc(`users/${S.user.uid}/notifications/${id}`, { read: true }, true));
    try { await Promise.all(ops); } catch (e) { toast(saveErr(e)); }
  },
  async clearRead() {
    const ops = Object.entries(S.notes || {}).filter(([, n]) => n.read).map(([id]) => ({ op: 'del', path: `users/${S.user.uid}/notifications/${id}` }));
    if (ops.length) { try { await S.be.batch(ops); toast('Cleared'); } catch (e) { toast(saveErr(e)); } }
  }
});
