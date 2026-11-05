/* LabSupply service worker: แคชเฉพาะไฟล์หน้าเว็บของตัวเอง (network-first)
 * ไม่แตะคำขอไป script.google.com หรือ CDN เด็ดขาด ข้อมูลจริงมาจาก server เสมอ
 * เปลี่ยน VERSION ทุกครั้งที่อัปโหลดไฟล์ชุดใหม่ */
const VERSION = 'labsupply-1.0.2';
const ASSETS = [
  './', 'index.html', 'manifest.json', 'assets/app.css',
  'js/config.js', 'js/core.js', 'js/scan.js', 'js/print.js', 'js/docs.js', 'js/guide-content.js', 'js/app.js',
  'js/pages/dashboard.js', 'js/pages/items.js', 'js/pages/receive.js', 'js/pages/issue.js', 'js/pages/stock.js',
  'js/pages/alerts.js', 'js/pages/reports.js', 'js/pages/settings.js', 'js/pages/guide.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
];

self.addEventListener('install', ev => {
  ev.waitUntil(caches.open(VERSION).then(c => Promise.all(ASSETS.map(a => c.add(a).catch(() => null)))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', ev => {
  ev.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', ev => {
  const req = ev.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  ev.respondWith(
    fetch(req).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(m => m || caches.match('index.html')))
  );
});
