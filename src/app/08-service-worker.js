// ── Service Worker for offline caching ──
try {
	if ('serviceWorker' in navigator && navigator.serviceWorker && location.protocol !== 'file:') {
	const SW_CODE = `
		const CACHE = 'detrita-v5';
		const ASSETS = ['/'];

		self.addEventListener('install', (e) => {
			e.waitUntil(
				caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
			);
		});

		self.addEventListener('activate', (e) => {
			e.waitUntil(
				caches.keys().then(keys =>
					Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
				).then(() => self.clients.claim())
			);
		});

		self.addEventListener('fetch', (e) => {
			if (e.request.method !== 'GET') return;
			e.respondWith(
				caches.match(e.request).then(cached => {
					const fetchP = fetch(e.request).then(resp => {
						if (resp.ok) {
							const clone = resp.clone();
							caches.open(CACHE).then(c => c.put(e.request, clone));
						}
						return resp;
					}).catch(() => cached);
					return cached || fetchP;
				})
			);
		});

		self.addEventListener('message', (e) => {
			if (e.data === 'skipWaiting') self.skipWaiting();
		});
	`;
	const swBlob = new Blob([SW_CODE], { type: 'application/javascript' });
	const swUrl = URL.createObjectURL(swBlob);
	navigator.serviceWorker.register(swUrl).catch(() => {});
}
} catch (_) { /* SW unavailable in sandbox */ }

