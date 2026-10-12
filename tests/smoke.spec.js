// @ts-check
const { test, expect } = require('@playwright/test');

const APP = '/detrita.html';

test('boots with a rendered board and no uncaught errors', async ({ page }) => {
	const pageErrors = [];
	page.on('pageerror', (e) => pageErrors.push(e.message));

	await page.goto(APP);
	await expect(page).toHaveTitle('/detrita');

	// Default board seeds a set of stage columns.
	const board = page.locator('#board');
	await expect(board).toBeVisible();
	await expect.poll(() => board.evaluate((el) => el.children.length)).toBeGreaterThan(3);

	expect(pageErrors, 'no uncaught page errors on boot').toEqual([]);
});

test('serves the app at the site root', async ({ page }) => {
	// index.html is emitted next to detrita.html so "/" serves the board
	// directly on any static host (no rewrite required).
	const pageErrors = [];
	page.on('pageerror', (e) => pageErrors.push(e.message));

	await page.goto('/');
	await expect(page).toHaveTitle('/detrita');
	await expect(page.locator('#board')).toBeVisible();
	expect(pageErrors, 'no uncaught page errors at root').toEqual([]);
});

test('adds a card via quick capture', async ({ page }) => {
	await page.goto(APP);
	const badge = page.locator('#inbox-badge');
	await expect(badge).toBeVisible();
	const before = Number((await badge.textContent())?.trim() || '0');

	await page.fill('#quick-input', 'PlaywrightSmokeCard');
	await page.press('#quick-input', 'Enter');

	await expect
		.poll(async () => Number((await badge.textContent())?.trim() || '0'))
		.toBe(before + 1);
	await expect(page.locator('#inbox-list')).toContainText('PlaywrightSmokeCard');
});

test('help panel shows the current version', async ({ page }) => {
	await page.goto(APP);
	// The help modal overlays the button once open, so force the toggle click.
	await page.locator('#btn-help').click({ force: true });
	const panel = page.locator('.help-panel');
	await expect(panel).toBeVisible();
	await expect(panel).toContainText('0.86.0 (2026-10-12)');
});

test('links a valid web app manifest served as a separate file', async ({ page }) => {
	await page.goto(APP);
	const link = page.locator('link[rel="manifest"]');
	await expect(link).toHaveCount(1);
	await expect(link).toHaveAttribute('href', '/manifest.webmanifest');

	const manifest = await page.evaluate(async () => {
		const href = document.querySelector('link[rel="manifest"]').getAttribute('href');
		const res = await fetch(href);
		return res.json();
	});

	expect(manifest.name).toBe('/detrita');
	expect(manifest.short_name).toBe('detrita');
	expect(manifest.display).toBe('standalone');
	const sizes = manifest.icons.map((i) => i.sizes);
	expect(sizes).toContain('192x192');
	expect(sizes).toContain('512x512');
	expect(manifest.icons.some((i) => i.purpose && i.purpose.includes('maskable'))).toBe(true);

	// Icons are real files (not inline data URIs) and each one resolves.
	for (const icon of manifest.icons) {
		expect(icon.src.startsWith('data:'), 'icon is a file URL, not a data URI').toBe(false);
		const status = await page.evaluate(async (src) => (await fetch(src)).status, icon.src);
		expect(status, `icon ${icon.src} is reachable`).toBe(200);
	}
});

test('works offline after the first visit', async ({ page, context }) => {
	await page.goto('/');
	await page.evaluate(() => navigator.serviceWorker.ready);
	// The page that installed the worker isn't controlled yet; reload once while online.
	await page.reload();
	await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

	await context.setOffline(true);
	await page.reload();
	await expect(page.locator('#board')).toBeVisible();
	await expect.poll(() => page.locator('#board').evaluate((el) => el.children.length)).toBeGreaterThan(3);
	await context.setOffline(false);
});
