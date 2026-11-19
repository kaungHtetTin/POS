import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';

// Exercise the built POS UI without touching the application's database.
test('POS catalog loads every page in table and grid views on desktop and mobile', { timeout: 120000 }, async (t) => {
    const manifest = JSON.parse(await readFile(new URL('../../public/build/manifest.json', import.meta.url)));
    const entry = manifest['resources/js/app.jsx'];
    const requests = [];
    const server = createServer(async (req, res) => {
        const url = new URL(req.url, 'http://localhost');
        if (url.pathname.startsWith('/api/')) {
            let payload = [];
            if (url.pathname === '/api/pos.catalog') {
                const page = Number(url.searchParams.get('page') || 1);
                requests.push(page);
                const start = (page - 1) * 30;
                payload = {
                    data: Array.from({ length: Math.min(30, 95 - start) }, (_, i) => ({
                        id: start + i + 1, name: `Medicine ${String(start + i + 1).padStart(3, '0')}`,
                        barcode: `TEST${start + i + 1}`, stock_quantity: 10, units: [],
                    })),
                    meta: { current_page: page, last_page: 4 },
                };
            }
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(payload));
            return;
        }
        const asset = url.pathname.match(/\/build\/(assets\/[\w.-]+)$/);
        if (asset) {
            try {
                const body = await readFile(new URL(`../../public/build/${asset[1]}`, import.meta.url));
                res.setHeader('Content-Type', asset[1].endsWith('.css') ? 'text/css' : 'text/javascript');
                res.end(body);
            } catch { res.writeHead(404).end(); }
            return;
        }
        const props = {
            auth: { user: { id: 1, name: 'Test Cashier', permissions: [], roles: [], accessible_branches: [] } },
            flash: {}, settings: {}, translations: {}, ziggy: {},
            paymentMethods: ['Cash'], paymentStatuses: ['Paid'],
            posDefaults: { default_view: url.searchParams.get('view') || 'table', barcode_focus: false },
            activeSession: { id: 1, expected_amount: 0 },
        };
        res.setHeader('Content-Type', 'text/html');
        res.end(`<!doctype html><html><head>
            ${(entry.css || []).map((css) => `<link rel="stylesheet" href="/build/${css}">`).join('')}
            </head><body><div id="app"></div>
            <script id="spa-page" type="application/json">${JSON.stringify({ component: 'POS/Index', props, url: req.url })}</script>
            <script>window.route = (name, params = {}) => name ? '/api/' + name + '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v != null)) : { current: () => false };</script>
            <script type="module" src="/build/${entry.file}"></script></body></html>`);
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    t.after(() => new Promise((resolve) => server.close(resolve)));
    const browser = await chromium.launch({
        ...(process.env.POS_BROWSER_EXECUTABLE ? { executablePath: process.env.POS_BROWSER_EXECUTABLE } : { channel: process.platform === 'win32' ? 'msedge' : 'chromium' }),
        headless: true,
    });
    try {
        for (const viewport of [{ width: 1366, height: 768 }, { width: 390, height: 844 }, { width: 1920, height: 3000 }]) {
            for (const view of ['table', 'grid']) {
                requests.length = 0;
                const page = await browser.newPage({ viewport });
                const errors = [];
                page.on('pageerror', (error) => errors.push(error.message));
                await page.goto(`http://127.0.0.1:${server.address().port}/pos?view=${view}`);
                await page.getByText('Medicine 001', { exact: true }).waitFor();
                const catalog = page.locator('.pos-catalog');
                for (let i = 0; i < 12 && !await page.getByText('Medicine 095', { exact: true }).count(); i++) {
                    if (viewport.height === 3000 && view === 'table') {
                        // The first batch fits: page two must load without a scroll event.
                        await page.getByText('Medicine 031', { exact: true }).waitFor();
                    }
                    await catalog.evaluate((element) => {
                        const scroller = [...element.querySelectorAll('*')].find((node) => node.scrollHeight > node.clientHeight && ['auto', 'scroll'].includes(getComputedStyle(node).overflowY));
                        if (scroller) scroller.scrollTop = scroller.scrollHeight;
                        window.scrollTo(0, document.documentElement.scrollHeight);
                    });
                    await page.waitForTimeout(250);
                }
                assert.equal(await page.getByText('Medicine 095', { exact: true }).count(), 1, `${viewport.width}x${viewport.height} ${view}`);
                assert.deepEqual([...new Set(requests)].sort(), [1, 2, 3, 4]);
                assert.equal(requests.filter((page) => page > 1).length, 3, `${viewport.width}x${viewport.height} ${view}: requests ${requests}`);
                assert.equal(await page.getByText('Medicine 001', { exact: true }).count(), 1);
                await page.getByRole('button', { name: view === 'table' ? 'Grid view' : 'List view', exact: true }).click();
                assert.equal(await page.getByText('Medicine 095', { exact: true }).count(), 1, 'switching views preserves all loaded products');
                assert.deepEqual(errors, []);
                await page.close();
            }
        }
    } finally {
        await browser.close();
    }
});
