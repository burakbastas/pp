// Çevrimdışı çalışma: uygulama dosyaları ilk açılışta saklanır.
const V = 'iki-el-014e4e5d';
const FILES = ['./', 'css/app.css', 'fonts/alegreya-800.woff', 'fonts/alegreya-sans-400.woff', 'fonts/alegreya-sans-700.woff', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable.png', 'index.html', 'js/audio/input.js', 'js/audio/piano.js', 'js/data/curriculum.js', 'js/data/exercises.js', 'js/data/notes.js', 'js/gen/accomp.js', 'js/gen/sight.js', 'js/gen/vocal.js', 'js/main.js', 'js/notation/glyphs.js', 'js/notation/parse.js', 'js/notation/render.js', 'js/notation/theory.js', 'js/store.js', 'js/ui/dom.js', 'js/ui/keyboard.js', 'js/ui/player.js', 'js/ui/practice.js', 'js/ui/reading.js', 'manifest.webmanifest'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== V).map(x => caches.delete(x)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request)));
});
