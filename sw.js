// Service worker: lets the app open with no signal.
// App files: try the network first (so updates show up), fall back to the saved copy.
// Firebase library and fonts: saved on first use, then served from the phone.
const CACHE = 'shift-calendar-v1-6';
const SHELL = ['./', 'index.html', 'style.css', 'app.js', 'core.js', 'banks.js', 'pay.js', 'share.js', 'engine.js', 'holidays.js', 'countries.js', 'backend.js',
  'views-cal.js', 'views-leave.js', 'views-pay.js', 'views-rot.js', 'views-settings.js', 'views-social.js',
  'firebase-config.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const library = url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/');
  const fonts = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!sameOrigin && !library && !fonts) return; // sign-in and database traffic is never touched

  if (sameOrigin) {
    e.respondWith(fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
      return res;
    }).catch(() => caches.match(req).then(r => r || caches.match('index.html'))));
  } else {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok || res.type === 'opaque') {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    })));
  }
});
