/* Album 2€ – service worker: fa funzionare l'app senza internet */
const SHELL = 'album-shell-v4';
const IMG = 'album-img-v1';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('album-shell-') && k !== SHELL).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// immagini delle monete: prima dalla memoria del telefono, altrimenti da Wikimedia (e le salva)
async function image(req) {
  const cache = await caches.open(IMG);
  const hit = await cache.match(req.url);
  if (hit) return hit;
  try {
    const r = await fetch(req.url, { mode: 'cors', credentials: 'omit' });
    if (r.ok) { cache.put(req.url, r.clone()); return r; }
  } catch (e) { }
  try {
    const r = await fetch(req);
    if (r.ok || r.type === 'opaque') cache.put(req.url, r.clone());
    return r;
  } catch (e) { return Response.error(); }
}

// file dell'app: risponde subito con la copia salvata e intanto cerca una versione nuova
async function shell(req) {
  const cache = await caches.open(SHELL);
  const hit = await cache.match(req, { ignoreSearch: true }) || (req.mode === 'navigate' ? await cache.match('./index.html') : null);
  const net = fetch(req).then(r => { if (r.ok) cache.put(req, r.clone()); return r; }).catch(() => null);
  return hit || (await net) || Response.error();
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname.endsWith('wikimedia.org')) { e.respondWith(image(req)); return; }
  if (url.origin === self.location.origin) { e.respondWith(shell(req)); return; }
  // tutto il resto (es. l'elenco da Wikipedia quando premi "Aggiorna dati") va direttamente in rete
});
