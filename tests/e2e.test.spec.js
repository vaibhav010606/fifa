import { test, expect } from '@playwright/test';

// NOTE: The staff login credentials must match STAFF_ID / STAFF_PASSWORD in your .env
const STAFF_ID = process.env.E2E_STAFF_ID || 'ST-8821';
const STAFF_PASSWORD = process.env.E2E_STAFF_PASSWORD || 'replace_with_a_strong_password';

test.describe('MatchPulse AI - End to End Flow', () => {

    test('Landing page renders role selector', async ({ page }) => {
        await page.goto('http://localhost:3000');
        await expect(page.locator('#view-landing')).toBeVisible();
        await expect(page.locator('#btn-role-fan')).toBeVisible();
        await expect(page.locator('#btn-role-volunteer')).toBeVisible();
        await expect(page.locator('#btn-role-staff')).toBeVisible();
    });

    // Fix: this test was incorrectly nested inside the 'Landing page' test
    test('Volunteer portal routing', async ({ page }) => {
        await page.goto('http://localhost:3000');
        await page.locator('#btn-role-volunteer').click();
        await expect(page.locator('#view-volunteer')).toBeVisible();
    });

    test('Fan portal routing', async ({ page }) => {
        await page.goto('http://localhost:3000');
        await page.locator('#btn-role-fan').click();
        await expect(page.locator('#view-fan')).toBeVisible();
    });

    test('Fan portal tabs', async ({ page }) => {
        await page.goto('http://localhost:3000');
        await page.locator('#btn-role-fan').click();

        // Wait for tabs to render
        await page.locator('.fan-tab-btn[data-tab="wayfinder"]').click();
        await expect(page.locator('#fan-tab-content')).toBeVisible();

        await page.locator('.fan-tab-btn[data-tab="food"]').click();
        await expect(page.locator('#fan-tab-content')).toBeVisible();
    });

    test('Staff login flow — invalid then valid credentials', async ({ page }) => {
        await page.goto('http://localhost:3000');

        // Open modal
        await page.locator('#btn-role-staff').click();
        await expect(page.locator('#staff-auth-modal')).not.toHaveClass(/hidden/);

        // Enter invalid credentials — error should appear
        await page.locator('#staff-id-input').fill('admin');
        await page.locator('#staff-pass-input').fill('wrong');
        await page.locator('#modal-btn-login').click();
        await expect(page.locator('#staff-auth-error')).toBeVisible();

        // Enter valid credentials — should transition to control room
        await page.locator('#staff-id-input').fill(STAFF_ID);
        await page.locator('#staff-pass-input').fill(STAFF_PASSWORD);
        await page.locator('#modal-btn-login').click();

        await expect(page.locator('#view-control-room')).toBeVisible();
        await expect(page.locator('#staff-auth-modal')).toHaveClass(/hidden/);
    });

});
