// ── Service worker for offline use ──
// sw.js is a static file served next to the app (built from src/sw.js). Service workers
// need http(s); on file:// there is none, and none is needed — everything is inlined.
try {
	if ('serviceWorker' in navigator && location.protocol !== 'file:') {
		window.addEventListener('load', () => {
			navigator.serviceWorker.register('sw.js').catch((err) => console.warn('Offline mode unavailable:', err));
		});
	}
} catch (_) { /* service workers unavailable (e.g. sandboxed iframe) */ }
