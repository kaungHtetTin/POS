import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, readFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';

test('light loading placeholders and retained content during slow requests', { timeout: 120000 }, async t => {
    const manifest = JSON.parse(await readFile(new URL('../../public/build/manifest.json', import.meta.url)));
    const entry = manifest['resources/js/app.jsx'];
    const server = createServer(async (req, res) => {
        const url = new URL(req.url, 'http://localhost');
        const asset = url.pathname.match(/\/build\/(assets\/[\w.-]+)$/);
        if (asset) {
            try {
                res.setHeader('Content-Type', asset[1].endsWith('.css') ? 'text/css' : 'text/javascript');
                res.end(await readFile(new URL(`../../public/build/${asset[1]}`, import.meta.url)));
            } catch { res.writeHead(404).end(); }
            return;
        }
        const login = url.pathname === '/login';
        const props = {
            auth: { user: login ? null : { id: 'test-user', name: 'Test Manager', permissions: ['manage_inventory'], roles: [], accessible_branches: [] } },
            flash: {}, settings: {}, translations: {}, ziggy: {}, filters: {},
            branches: [], products: [], types: ['Purchase', 'Sale'],
            movements: { data: [{ id: 'movement-1', product_name: 'Paracetamol', branch_name: 'Main Branch', type: 'Purchase',
                quantity: 5, balance_before: 0, balance_after: 5, created_at: '2026-11-20T06:00:00Z', user_name: 'Test Manager' }],
                total: 1, per_page: 25, current_page: 1, last_page: 1 },
        };
        const payload = { component: login ? 'Auth/Login' : 'Inventory/Movements', props, url: req.url };
        if (req.headers['x-spa'] === 'true') {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(payload));
            return;
        }
        res.setHeader('Content-Type', 'text/html');
        res.end(`<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1">
            ${(entry.css || []).map(css => `<link rel="stylesheet" href="/build/${css}">`).join('')}</head><body>
            <div id="app"></div><script id="spa-page" type="application/json">${JSON.stringify(payload)}</script>
            <script>window.route = (name, params = {}) => name ? ({ 'inventory.movements.index': '/inventory/movements', 'inventory.index': '/inventory', login: '/login' }[name] || '/test/' + name) + '?' + new URLSearchParams(params) : { current: () => false };</script>
            <script type="module" src="/build/${entry.file}"></script></body></html>`);
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    t.after(() => new Promise(resolve => server.close(resolve)));
    const base = `http://127.0.0.1:${server.address().port}`;
    const browser = await chromium.launch({ channel: process.platform === 'win32' ? 'msedge' : 'chromium', headless: true });
    await mkdir(new URL('../../storage/app/testing/', import.meta.url), { recursive: true });
    try {
        for (const [width, mode] of [[1440, 'light'], [390, 'light'], [1440, 'dark']]) {
            const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
            const errors = [];
            page.on('pageerror', error => errors.push(error.message));
            await page.addInitScript(mode => localStorage.setItem('app.theme', mode), mode);
            let releaseImport;
            const importGate = new Promise(resolve => { releaseImport = resolve; });
            await page.route(`**/${manifest['resources/js/Pages/Inventory/Movements.jsx'].file}`, async route => {
                await importGate;
                await route.continue();
            });
            await page.goto(`${base}/inventory/movements`);
            const skeleton = page.getByRole('status', { name: 'Loading page content' });
            await skeleton.waitFor();
            assert.equal(await skeleton.getAttribute('data-loading-shape'), 'table');
            const appearance = await skeleton.locator('.MuiSkeleton-root').evaluateAll(nodes => nodes.map(node => ({
                height: node.getBoundingClientRect().height, color: getComputedStyle(node).backgroundColor, animation: getComputedStyle(node).animationName,
            })));
            assert(appearance.every(item => item.height <= 17), 'Only text-sized placeholders');
            assert(appearance.every(item => item.animation === 'none'), 'Reduced motion respected');
            if (mode === 'light') assert(appearance.every(item => item.color === 'rgb(234, 240, 236)'));
            assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
            await page.screenshot({ path: new URL(`../../storage/app/testing/loading-${mode}-${width}.png`, import.meta.url).pathname.replace(/^\/(\w:)/, '$1'), fullPage: true });
            releaseImport();
            await page.getByRole('cell', { name: 'Paracetamol', exact: true }).waitFor();

            let releaseRefresh;
            const refreshGate = new Promise(resolve => { releaseRefresh = resolve; });
            await page.route('**/inventory/movements?**', async route => {
                await refreshGate;
                await route.continue();
            });
            await page.getByLabel('Search', { exact: true }).fill('Paracetamol');
            const searchInput = await page.getByLabel('Search', { exact: true }).elementHandle();
            await page.getByRole('button', { name: 'Apply', exact: true }).click();
            const progress = page.getByRole('progressbar', { name: 'Updating page content' });
            await progress.waitFor();
            assert.equal(await skeleton.count(), 0);
            assert.equal(await page.getByRole('cell', { name: 'Paracetamol', exact: true }).count(), 1);
            assert.equal(await progress.evaluate(node => node.getBoundingClientRect().height), 2);
            assert(await page.getByLabel('Search', { exact: true }).evaluate((node, previous) => node === previous, searchInput));
            releaseRefresh();
            await progress.waitFor({ state: 'detached' });
            assert.equal(await page.getByLabel('Search', { exact: true }).inputValue(), 'Paracetamol');
            if (width === 1440) {
                let releaseNavigation;
                const navigationGate = new Promise(resolve => { releaseNavigation = resolve; });
                await page.route(url => url.pathname === '/inventory', async route => {
                    await navigationGate;
                    await route.continue();
                });
                await page.getByRole('link', { name: 'Stock Balance', exact: true }).click();
                await skeleton.waitFor();
                assert.equal(await skeleton.getAttribute('data-loading-shape'), 'table');
                assert.equal(await progress.count(), 0, 'One loading signal per transition');
                releaseNavigation();
                await page.getByRole('cell', { name: 'Paracetamol', exact: true }).waitFor();
            }
            assert.deepEqual(errors, []);
            await page.close();
        }

        const formPage = await browser.newPage({ viewport: { width: 1024, height: 800 } });
        let releaseFormImport;
        const formGate = new Promise(resolve => { releaseFormImport = resolve; });
        await formPage.route(`**/${manifest['resources/js/Pages/Auth/Login.jsx'].file}`, async route => {
            await formGate;
            await route.continue();
        });
        await formPage.goto(`${base}/login`);
        const formSkeleton = formPage.getByRole('status', { name: 'Loading page content' });
        await formSkeleton.waitFor();
        assert.equal(await formSkeleton.getAttribute('data-loading-shape'), 'form');
        releaseFormImport();
        await formPage.getByLabel('Email', { exact: true }).fill('test@example.test');
        await formPage.getByLabel('Password', { exact: true }).fill('keep-this-value');
        let releaseValidation;
        const validationGate = new Promise(resolve => { releaseValidation = resolve; });
        await formPage.route(url => url.pathname === '/login', async route => {
            await validationGate;
            await route.fulfill({ status: 422, contentType: 'application/json', body: JSON.stringify({ errors: { email: 'Invalid credentials' } }) });
        });
        await formPage.getByRole('button', { name: 'Log in', exact: true }).click();
        await formPage.getByRole('progressbar', { name: 'Updating page content' }).waitFor();
        assert.equal(await formSkeleton.count(), 0);
        assert.equal(await formPage.getByLabel('Password', { exact: true }).inputValue(), 'keep-this-value');
        releaseValidation();
        await formPage.getByText('Invalid credentials', { exact: true }).waitFor();
        assert.equal(await formPage.getByLabel('Email', { exact: true }).inputValue(), 'test@example.test');
        assert.equal(await formPage.getByLabel('Password', { exact: true }).inputValue(), 'keep-this-value');
        await formPage.close();
    } finally {
        await browser.close();
    }
});
