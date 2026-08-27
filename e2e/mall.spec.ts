import { test, expect } from '@playwright/test';
import { createAndLoginUser } from './helpers';

async function openCart(page: import('@playwright/test').Page) {
  await page
    .locator('nav')
    .getByRole('button')
    .filter({ has: page.locator('svg.lucide-shopping-cart') })
    .click();
}

test.describe('journey 3+4 — redeem with miles and see the order', () => {
  test('add to cart, settle, get voucher with QR, balance drops, order appears', async ({ page }) => {
    await createAndLoginUser(page);

    // Mall loads seeded products
    await page.goto('/mall');
    await expect(page.getByRole('heading', { name: '绿色商城' })).toBeVisible();
    await expect(page.getByText('酒店 50 元券')).toBeVisible();

    // Open product detail and add to cart
    await page.getByText('酒店 50 元券').first().click();
    await expect(page.getByRole('dialog').getByText('酒店 50 元券')).toBeVisible();
    await page.getByRole('button', { name: '加入购物车' }).click();

    // Cart badge shows 1 item
    await expect(page.locator('nav').getByText('1', { exact: true })).toBeVisible();

    // Open cart and settle (2,000 miles)
    await openCart(page);
    await expect(page.getByRole('dialog').getByText('购物车')).toBeVisible();
    await page.getByRole('button', { name: '结算' }).click();
    await page.getByRole('button', { name: '确认兑换' }).click();

    // Voucher with code and QR code
    await expect(page.getByText('兑换成功')).toBeVisible();
    await expect(page.getByText('酒店优惠券码')).toBeVisible();
    // QRCodeSVG is the only svg exposing role="img" in the dialog
    await expect(page.getByRole('dialog').getByRole('img')).toBeVisible();

    // Balance dropped 10,000 → 8,000
    await expect(page.locator('nav').getByText('8,000')).toBeVisible();

    // Jump to orders from the voucher dialog
    await page.getByRole('button', { name: '查看订单' }).click();
    await expect(page).toHaveURL(/\/orders/);
    await expect(page.getByText('酒店 50 元券').first()).toBeVisible();
  });
});
