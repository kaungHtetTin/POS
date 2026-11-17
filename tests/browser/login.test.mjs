import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const { POS_BASE_URL, POS_TEST_EMAIL, POS_TEST_PASSWORD, POS_BROWSER_EXECUTABLE } = process.env;

test('failed login preserves form state and displays validation before successful login', {
    skip: !POS_BASE_URL || !POS_TEST_EMAIL || !POS_TEST_PASSWORD,
    timeout: 60000,
}, async () => {
    const browser = await chromium.launch({
        executablePath: POS_BROWSER_EXECUTABLE || '/usr/bin/chromium',
        headless: true,
        args: ['--no-sandbox', '--disable-dev-shm-usage'],
    });
    try {
        const page = await browser.newPage();
        const errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.goto(new URL('/login', POS_BASE_URL).href);
        const email = page.getByLabel('Email', { exact: true });
        const password = page.getByLabel('Password', { exact: true });
        await email.fill(POS_TEST_EMAIL);
        await password.fill('invalid-browser-test-password');
        await page.getByRole('button', { name: 'Log in', exact: true }).click();
        await page.locator('input#email[aria-invalid="true"]').waitFor();
        assert.equal(await email.inputValue(), POS_TEST_EMAIL);
        assert.equal(await password.inputValue(), 'invalid-browser-test-password');
        assert(new URL(page.url()).pathname.endsWith('/login'));

        await password.fill(POS_TEST_PASSWORD);
        await page.getByRole('button', { name: 'Log in', exact: true }).click();
        await page.waitForURL('**/dashboard');
        await page.getByText('Inventory attention desk', { exact: true }).waitFor();
        assert.deepEqual(errors, []);
    } finally {
        await browser.close();
    }
});
