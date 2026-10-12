#!/usr/bin/env node
/*
 * build.js — assembles the single-file `detrita.html` from the sources in src/.
 *
 * There is no bundler and no dependency: the pieces are concatenated in filename
 * order and inlined into the shell, so the output is byte-for-byte what you get by
 * hand-writing one file. Edit files under src/ — never edit detrita.html directly.
 *
 *   node build.js            # writes ./detrita.html, ./index.html and ./sw.js
 *   node build.js --check    # builds in memory and fails if any output is stale
 *
 * See CLAUDE.md for the source layout and conventions.
 */
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SRC = path.join(ROOT, 'src');

// The app ships under two names, both committed and identical:
//   detrita.html — the portable, shareable single file (openable from file://)
//   index.html       — so any static host (Vercel included) serves it at "/" with
//                      no rewrite needed. Identical content, so git stores one blob.
const OUTPUTS = ['detrita.html', 'index.html'].map((f) => path.join(ROOT, f));

const STYLES_MARKER = '/*__BUILD_STYLES__*/\n';
const SCRIPTS_MARKER = '//__BUILD_SCRIPTS__\n';

// Concatenate every file in `dir` (sorted by name) into one Buffer.
function concatDir(dir) {
	const files = fs.readdirSync(dir).filter((f) => !f.startsWith('.')).sort();
	return Buffer.concat(files.map((f) => fs.readFileSync(path.join(dir, f))));
}

function build() {
	const shell = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');
	const styles = concatDir(path.join(SRC, 'styles')).toString('utf8');
	const scripts = concatDir(path.join(SRC, 'app')).toString('utf8');

	if (!shell.includes(STYLES_MARKER)) throw new Error('src/index.html: missing styles marker');
	if (!shell.includes(SCRIPTS_MARKER)) throw new Error('src/index.html: missing scripts marker');

	// Use function replacers so `$` sequences in the content are inserted literally
	// (a string replacement would treat `$'`, `$&`, etc. as special patterns).
	return shell
		.replace(STYLES_MARKER, () => styles)
		.replace(SCRIPTS_MARKER, () => scripts);
}

// The service worker is a separate static file (browsers won't register one from a
// blob: URL). Its cache name is a hash of everything it caches, so each release gets a
// fresh cache and returning users never keep a stale copy of the app.
const SW_OUT = path.join(ROOT, 'sw.js');
const SW_ASSETS = ['manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon-180.png'];

function buildServiceWorker(html) {
	const hash = crypto.createHash('sha256').update(html);
	for (const f of SW_ASSETS) hash.update(fs.readFileSync(path.join(ROOT, f)));
	const src = fs.readFileSync(path.join(SRC, 'sw.js'), 'utf8');
	const marker = "'detrita-__BUILD_HASH__'";
	if (!src.includes(marker)) throw new Error('src/sw.js: missing cache-name marker');
	return src.replace(marker, () => `'detrita-${hash.digest('hex').slice(0, 12)}'`);
}

const html = build();
const files = [...OUTPUTS.map((p) => [p, html]), [SW_OUT, buildServiceWorker(html)]];

if (process.argv.includes('--check')) {
	const stale = files
		.filter(([p, content]) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '') !== content)
		.map(([p]) => p);
	if (stale.length) {
		console.error(
			'Stale build output: ' +
				stale.map((p) => path.basename(p)).join(', ') +
				' — run `node build.js` and commit the result.',
		);
		process.exit(1);
	}
	console.log('Build output is up to date.');
} else {
	for (const [p, content] of files) fs.writeFileSync(p, content);
	console.log(
		'Built %s (%d bytes) + sw.js.',
		OUTPUTS.map((p) => path.basename(p)).join(' + '),
		Buffer.byteLength(html),
	);
}
