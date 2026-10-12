# CLAUDE.md

Guidance for AI agents (and humans) working in this repo.

## What this is

`/detrita` is a **local-first, single-file kanban board**. The whole app ships as one
static file, `detrita.html` — no framework, no runtime dependencies, no server. Data
lives in the browser (OPFS with an IndexedDB fallback) and can sync to a local `.md` file.

## Source layout — edit `src/`, never `detrita.html`

`detrita.html` is **generated**. Do not hand-edit it; your change would be overwritten by
the next build (and CI fails if it's out of sync). Edit the sources under `src/` and rebuild:

```
src/
  index.html            # HTML shell: <head>, body markup, and two build markers:
                        #   /*__BUILD_STYLES__*/   and   //__BUILD_SCRIPTS__
  styles/*.css          # concatenated (filename order) into the <style> block.
                        #   Split by CSS @layer: 00-layers, 01-reset, 02-tokens,
                        #   03-layout, 04-components, 05-utilities.
  app/*.js              # concatenated (filename order) into the <script> block.
                        #   Split by top-level section: 00-core, 01-undo-redo,
                        #   02-stage-header, 03-swimlanes, 04-cells, 05-drag,
                        #   06-cell-editor, 07-modal-wiring, 08-service-worker, 09-boot.
  sw.js                 # service worker source; build writes it to ./sw.js with a
                        #   content-hashed cache name.
build.js                # zero-dependency Node build (concatenate + inline).
detrita.html        # GENERATED, committed (kept in git so it stays openable/portable).
index.html              # GENERATED, committed — identical copy so static hosts serve "/".
sw.js                   # GENERATED, committed — the service worker, served next to the app.
```

The build is **pure concatenation**: the JS stays one global scope exactly as before, so
moving code between `src/app/*.js` files is safe as long as ordering is preserved. There is
no bundler and no ES-module system — don't add `import`/`export`.

## Build & test

```sh
npm ci            # once, installs @playwright/test
node build.js     # regenerate detrita.html  (npm run build)
node build.js --check   # fail if the committed file is stale  (npm run check)
npm run test:integrity  # node --test, no browser
npm test          # Playwright smoke tests (serves the repo, drives detrita.html)
```

In this sandbox the browser is preinstalled; point Playwright at it:
`PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npm test`. In GitHub Actions CI, the browser is
installed with `npx playwright install --with-deps chromium` (see `.github/workflows/ci.yml`),
which also runs the build, verifies `detrita.html` isn't stale, and runs both test suites.

**Workflow for any change:** edit `src/` → `node build.js` → run tests → commit the `src/`
change together with the regenerated `detrita.html`, `index.html` and `sw.js`.

## Conventions

- **Version** is `MAJOR.MINOR.PATCH`, dated with the day it ships. Bump the **minor** for
  anything users notice — a feature, a redesign, a rename. Bump the **patch** for small
  changes that ship on their own: a bug fix, a copy edit, an icon tweak, a docs-only
  change that still rebuilds the HTML. Never ship a user-visible change without bumping
  something.

  Always write all three numbers, everywhere — `0.85.0`, never `0.85`. It lives in
  **five** spots and they must agree, or the tests fail:

  | Spot | Form |
  |---|---|
  | `src/index.html` (help panel) | `Current version: X.Y.Z (YYYY-MM-DD)` |
  | `README.md` (link block) | `Current version: X.Y.Z (YYYY-MM-DD)` |
  | `package.json` `version` | `X.Y.Z` |
  | `tests/integrity.test.js` | asserts the built version string |
  | `tests/smoke.spec.js` | asserts the help panel shows it |

- **Service worker** (offline support) is the static file `sw.js`, built from `src/sw.js`
  and registered by `src/app/08-service-worker.js`. It has to be a real file: browsers refuse
  to register a service worker from a `blob:` or `data:` URL. Its cache name is a hash of the
  built app, manifest and icons, so there is nothing to bump — any change gets a new cache.
  The app page is network-first (3 s timeout, then the cached copy), so online users always
  get the latest build. Commit the regenerated `sw.js` with every build.
- **Stay inline where it counts.** The favicon is inlined (data URI) so the built
  `detrita.html` stays self-contained and openable from `file://`, where there's no service
  worker and none is needed.
- **Manifest & icons are separate static files.** `manifest.webmanifest` and `icons/*.png`
  live at the repo root and are served next to `detrita.html` — a real manifest URL is
  what makes the PWA reliably installable (a `data:` manifest can't resolve `start_url`). The
  built file still opens from `file://`; the manifest just won't load there, which is fine.
  Regenerate icons from the brand `<path>` in `src/index.html` with `npm run gen:icons`
  (`tools/gen-icons.js`, uses the Playwright browser); icons are committed, so this isn't part
  of the build or deploy.
- File-sync features use the File System Access API and need `http(s)://` (they're disabled on
  `file://`).

## Deploy

Static hosting, no build required by the host. The build emits `index.html` (identical to
`detrita.html`), so `/` serves the app on any static host with no rewrite — this is the
primary fix for the root 404. On **Vercel**, `vercel.json` also turns the build off (no-op
`buildCommand`/`installCommand`, `outputDirectory: "."`) and serves the committed repo root —
otherwise Vercel sees `package.json`, runs `npm run build`, and then fails looking for a
`public/` output dir. `cleanUrls` makes `/detrita` resolve; the config serves
`/manifest.webmanifest` with the right `Content-Type`, serves `/sw.js` with `no-cache`, and long-caches `/icons/*`. A `/` →
`/detrita.html` rewrite is kept as a harmless fallback behind `index.html`. `.vercelignore`
keeps `src/`, `tests/`, and tooling out of the deploy. `_redirects` covers Netlify/Cloudflare
Pages, which Vercel ignores. Repo: https://github.com/arty2/detrita.
