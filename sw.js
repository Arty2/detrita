// Service worker — offline support for /detrita.
//
// Built to ./sw.js by build.js, which replaces __BUILD_HASH__ with a hash of the app,
// manifest and icons, so every release gets a fresh cache and old ones are deleted.
// It must be a real file next to the app: browsers refuse to register a service
// worker from a blob: or data: URL.
//
// Strategy: the app page is network-first (a 3 s timeout falls back to the cached copy),
// so online users always get the latest build and offline users get the last one they
// loaded. Other same-origin files (manifest, icons) are cache-first.
'use strict';

const CACHE = 'detrita-2a30c1036068';
const SHELL = new URL('./', self.location).href;
const ASSETS = [
	'./',
	'./manifest.webmanifest',
	'./icons/icon-192.png',
	'./icons/icon-512.png',
	'./icons/icon-maskable-512.png',
	'./icons/apple-touch-icon-180.png',
];
const NETWORK_TIMEOUT_MS = 3000;

self.addEventListener('install', (e) => {
	e.waitUntil(
		caches.open(CACHE)
			.then((c) => c.addAll(ASSETS.map((a) => new Request(a, { cache: 'reload' }))))
			.then(() => self.skipWaiting()),
	);
});

self.addEventListener('activate', (e) => {
	e.waitUntil(
		caches.keys()
			.then((keys) => Promise.all(keys.filter((k) => k.startsWith('detrita-') && k !== CACHE).map((k) => caches.delete(k))))
			.then(() => self.clients.claim()),
	);
});

self.addEventListener('fetch', (e) => {
	const req = e.request;
	if (req.method !== 'GET') return;
	const url = new URL(req.url);
	if (url.origin !== self.location.origin) return; // e.g. images linked from card notes

	if (req.mode === 'navigate') {
		e.respondWith(navigate(req));
		return;
	}
	e.respondWith(
		caches.match(req).then((hit) => hit || fetch(req).then((resp) => {
			if (resp.ok && resp.type === 'basic') {
				const copy = resp.clone();
				caches.open(CACHE).then((c) => c.put(req, copy));
			}
			return resp;
		})),
	);
});

// Every page in scope is the same single-file app, so all navigations share one cached copy.
function navigate(req) {
	const network = fetch(req).then((resp) => {
		// Skip redirects (e.g. /detrita.html → /detrita): a cached redirect can't answer a navigation.
		if (resp.ok && !resp.redirected && resp.type === 'basic') {
			const copy = resp.clone();
			caches.open(CACHE).then((c) => c.put(SHELL, copy));
		}
		return resp;
	});
	const cached = () => caches.match(SHELL);
	const slow = new Promise((resolve) => setTimeout(resolve, NETWORK_TIMEOUT_MS))
		.then(cached)
		.then((hit) => hit || network);
	return Promise.race([network, slow]).catch(() => cached().then((hit) => hit || Response.error()));
}
