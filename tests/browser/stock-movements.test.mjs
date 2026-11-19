import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, readFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';

// Render the production UI with synthetic history; never create business records.
test('stock history filters, pagination, export and responsive overflow', { timeout: 120000 }, async (t) => {
    const manifest = JSON.parse(await readFile(new URL('../../public/build/manifest.json', import.meta.url)));
    const entry = manifest['resources/js/app.jsx'];
    const history = Array.from({ length: 28 }, (_, index) => ({
        id: `movement-${index}`, product_id: 'product-1', product_name: 'Paracetamol 500mg', branch_id: 'branch-1',
        branch_name: 'Main Branch', type: index === 0 ? 'Adjustment' : 'Purchase', reference: `REF-${index}`,
        batch_number: 'BATCH-1', quantity: index === 0 ? -2 : 5, balance_before: 10, balance_after: index === 0 ? 8 : 15,
        user_name: 'Inventory Manager', notes: index === 0 ? 'Damage: Broken seal' : '', created_at: '2026-11-20T06:00:00.000000Z',
    }));
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
        const filters = Object.fromEntries(url.searchParams);
        let rows = history.filter(row => (!filters.type || row.type === filters.type)
            && (!filters.search || row.product_name.toLowerCase().includes(filters.search.toLowerCase())));
        const page = Number(filters.page || 1);
        const props = {
            auth: { user: { id: 'user-1', name: 'Test Manager', permissions: ['manage_inventory'], roles: [], accessible_branches: [] } },
            flash: {}, settings: {}, translations: {}, ziggy: {}, timezone: 'Asia/Yangon', filters,
            branches: [{ id: 'branch-1', name: 'Main Branch' }], products: [{ id: 'product-1', name: 'Paracetamol 500mg' }],
            types: ['Opening balance', 'Purchase', 'Sale', 'Adjustment'],
            movements: { data: rows.slice((page - 1) * 25, page * 25), total: rows.length, per_page: 25,
                current_page: page, last_page: Math.max(1, Math.ceil(rows.length / 25)) },
        };
        const payload = { component: 'Inventory/Movements', props, url: req.url };
        if (req.headers['x-spa'] === 'true') {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(payload));
            return;
        }
        res.setHeader('Content-Type', 'text/html');
        res.end(`<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1">
            ${(entry.css || []).map(css => `<link rel="stylesheet" href="/build/${css}">`).join('')}</head>
            <body><div id="app"></div><script id="spa-page" type="application/json">${JSON.stringify(payload)}</script>
            <script>window.route = (name, params = {}) => name ? (name === 'inventory.movements.index' ? '/inventory/movements' : '/test/' + name) + '?' + new URLSearchParams(params) : { current: () => false };</script>
            <script type="module" src="/build/${entry.file}"></script></body></html>`);
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    t.after(() => new Promise(resolve => server.close(resolve)));
    const browser = await chromium.launch({ channel: process.platform === 'win32' ? 'msedge' : 'chromium', headless: true });
    await mkdir(new URL('../../storage/app/testing/', import.meta.url), { recursive: true });
    try {
        for (const width of [1440, 1024, 390]) {
            const page = await browser.newPage({ viewport: { width, height: 900 }, acceptDownloads: true });
            const errors = [];
            page.on('pageerror', error => errors.push(error.message));
            await page.goto(`http://127.0.0.1:${server.address().port}/inventory/movements`);
            await page.getByRole('heading', { name: 'Stock Movement History', level: 1, exact: true }).waitFor();
            assert.equal(await page.getByRole('cell', { name: 'Paracetamol 500mg', exact: true }).count(), 25);
            assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `No document overflow at ${width}`);
            await page.screenshot({ path: new URL(`../../storage/app/testing/stock-movements-${width}.png`, import.meta.url).pathname.replace(/^\/(\w:)/, '$1'), fullPage: true });
            await page.getByRole('button', { name: 'Next page', exact: true }).click();
            await page.waitForFunction(() => document.querySelectorAll('tbody tr').length === 3);
            await page.getByLabel('Search', { exact: true }).fill('missing product');
            await page.getByRole('button', { name: 'Apply', exact: true }).click();
            await page.getByText('No stock movements found for the selected filters.', { exact: true }).waitFor();
            assert(!new URL(page.url()).searchParams.has('page'), 'Applying filters resets pagination');
            await page.getByRole('button', { name: 'Reset', exact: true }).click();
            await page.getByRole('cell', { name: 'REF-0', exact: true }).waitFor();
            await page.getByLabel('Action', { exact: true }).click();
            await page.getByRole('option', { name: 'Adjustment', exact: true }).click();
            await page.getByRole('button', { name: 'Apply', exact: true }).click();
            await page.waitForFunction(() => document.querySelectorAll('tbody tr').length === 1);
            assert.equal(new URL(page.url()).searchParams.get('type'), 'Adjustment');
            const downloadEvent = page.waitForEvent('download');
            await page.getByRole('button', { name: 'Export CSV', exact: true }).click();
            assert.equal((await downloadEvent).suggestedFilename(), 'stock-movements.csv');
            assert.deepEqual(errors, []);
            await page.close();
        }
    } finally {
        await browser.close();
    }
});
