// Build-integrity checks — no browser required. Run with: node --test
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'detrita.html');

test('committed detrita.html matches a fresh build (not stale)', () => {
	// build.js --check exits non-zero if the committed file differs from a rebuild.
	execFileSync('node', ['build.js', '--check'], { cwd: ROOT, stdio: 'pipe' });
});

test('built file carries the expected markers', () => {
	const html = fs.readFileSync(OUT, 'utf8');
	assert.match(html, /0\.85\.2 \(2026-10-11\)/, 'version string present');
	assert.match(html, /detrita-v5/, 'service worker cache bumped to v5');
	assert.match(html, /rel="apple-touch-icon"/, 'apple-touch-icon present');
	// The manifest is a separate static file, linked by URL — not inlined.
	assert.match(html, /rel="manifest" href="\/manifest\.webmanifest"/, 'links the manifest file');
	assert.doesNotMatch(html, /data:application\/manifest\+json/, 'no inline data: manifest');
});

test('index.html is emitted for root serving and mirrors detrita.html', () => {
	const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
	const main = fs.readFileSync(OUT, 'utf8');
	assert.equal(index, main, 'index.html is identical to detrita.html');
});

test('manifest.webmanifest is valid JSON and its icons exist on disk', () => {
	const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.webmanifest'), 'utf8'));
	assert.equal(manifest.name, '/detrita');
	assert.equal(manifest.display, 'standalone');
	assert.equal(manifest.start_url, '/');
	const sizes = manifest.icons.map((i) => i.sizes);
	assert.ok(sizes.includes('192x192') && sizes.includes('512x512'), 'has 192 and 512 icons');
	assert.ok(
		manifest.icons.some((i) => (i.purpose || '').includes('maskable')),
		'has a maskable icon',
	);
	// Every referenced icon (root-relative /icons/...) is a committed file.
	for (const icon of manifest.icons) {
		assert.ok(!icon.src.startsWith('data:'), `icon ${icon.src} is a file, not a data URI`);
		const rel = icon.src.replace(/^\//, '');
		assert.ok(fs.existsSync(path.join(ROOT, rel)), `icon file exists: ${rel}`);
	}
	// The apple-touch-icon referenced by the HTML also exists.
	assert.ok(
		fs.existsSync(path.join(ROOT, 'icons', 'apple-touch-icon-180.png')),
		'apple-touch-icon file exists',
	);
});
