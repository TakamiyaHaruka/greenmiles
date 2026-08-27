import { test, expect } from '@playwright/test';
import Database from 'better-sqlite3';
import path from 'path';
import { createAndLoginUser } from './helpers';

const E2E_DB = path.join(process.cwd(), 'e2e', 'greenmiles-e2e.db');

test.describe('settlement guard', () => {
  test('insufficient balance disables settle and shows the shortfall', async ({ page }) => {
    const email = await createAndLoginUser(page);

    // Drop this user's balance below 植树公益's 3,000-mile cost
    const db = new Database(E2E_DB);
    db.prepare('UPDATE users SET miles_balance = ? WHERE email = ?').run(1000, email);
    db.close();

    // Add 植树公益 (3,000 miles) to the cart
    await page.goto('/mall');
    await expect(page.getByText('植树公益')).toBeVisible();
    await page.getByText('植树公益').first().click();
    await expect(page.getByRole('dialog').getByText('植树公益')).toBeVisible();
    await page.getByRole('button', { name: '加入购物车' }).click();

    // Open the cart
    await page
      .locator('nav')
      .getByRole('button')
      .filter({ has: page.locator('svg.lucide-shopping-cart') })
      .click();

    // Settle is disabled with the exact shortfall (3,000 − 1,000 = 2,000)
    const settle = page.getByRole('button', { name: '结算' });
    await expect(settle).toBeDisabled();
    await expect(page.getByText(/里程不足（还差 2,000 里程）/)).toBeVisible();
  });
});
