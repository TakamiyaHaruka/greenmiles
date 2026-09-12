import { test, expect } from '@playwright/test';
import { createAndLoginUser } from './helpers';

async function openCart(page: import('@playwright/test').Page) {
  await page
    .locator('nav')
    .getByRole('button')
    .filter({ has: page.locator('svg.lucide-shopping-cart') })
    .click();
}

async function expectDialogFitsViewport(page: import('@playwright/test').Page) {
  await expect.poll(async () => {
    const box = await page.getByRole('dialog').boundingBox();
    return box !== null && box.x >= -1 && box.x + box.width <= 321;
  }).toBe(true);
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

  test('physical item keeps address validation and multiple-quantity settlement on a narrow screen', async ({ page }) => {
    await createAndLoginUser(page);
    await page.setViewportSize({ width: 320, height: 812 });
    await page.goto('/mall');
    await page.getByRole('tab', { name: '实体' }).click();
    await expect(page.getByRole('button', { name: /帆布袋.*查看详情/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /共享单车骑行卡/ })).toHaveCount(0);

    const product = page.getByRole('button', { name: /帆布袋.*查看详情/ });
    await product.click();
    await expect(page.getByRole('dialog')).toHaveClass(/journey-portal-surface/);
    await expectDialogFitsViewport(page);
    await page.keyboard.press('Escape');
    await expect(product).toBeFocused();
    await product.click();
    await page.getByRole('button', { name: '加入购物车' }).click();
    await expect(page.getByText('请输入姓名')).toBeVisible();
    await page.getByLabel(/姓名/).fill('测试用户');
    await page.getByLabel(/手机号/).fill('13800138000');
    await page.getByLabel(/详细地址/).fill('北京市朝阳区测试街 1 号');
    await page.getByRole('button', { name: '加入购物车' }).click();

    await product.click();
    await page.getByLabel(/姓名/).fill('测试用户');
    await page.getByLabel(/手机号/).fill('13800138000');
    await page.getByLabel(/详细地址/).fill('北京市朝阳区测试街 1 号');
    await page.getByRole('button', { name: '加入购物车' }).click();
    await openCart(page);
    await expect(page.getByRole('dialog').getByText('帆布袋 × 2')).toBeVisible();
    await expectDialogFitsViewport(page);
    await page.getByRole('button', { name: '结算' }).click();
    await expect(page.getByRole('dialog')).toHaveClass(/journey-portal-surface/);
    await expect(page.getByRole('dialog').getByText(/1,000 里程兑换.*帆布袋 × 2/)).toBeVisible();
    await expectDialogFitsViewport(page);
    await page.getByRole('button', { name: '确认兑换' }).click();
    await expect(page.getByText('兑换成功')).toBeVisible();
    await expect(page.getByText('待发货')).toBeVisible();
    await expect(page.locator('nav').getByText('9,000')).toBeVisible();
    await expectDialogFitsViewport(page);

    const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
    expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client);
    await page.getByRole('button', { name: '查看订单' }).click();
    await expect(page).toHaveURL(/\/orders$/);
    await expect(page.getByText('帆布袋 × 2')).toBeVisible();
  });

  test('list request failure is distinct from an empty category and can retry', async ({ page }) => {
    await createAndLoginUser(page);
    await page.route('**/api/products', (route) => route.fulfill({ status: 503, body: '{}' }));
    await page.goto('/mall');
    await expect(page.getByRole('alert').getByText('商品暂时无法加载')).toBeVisible();
    await page.unroute('**/api/products');
    await page.getByRole('button', { name: '重试' }).click();
    await expect(page.getByRole('button', { name: /共享单车骑行卡.*查看详情/ })).toBeVisible();

    await page.route('**/api/products', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{"data":[]}' }));
    await page.reload();
    await expect(page.getByText('暂无商品', { exact: true })).toBeVisible();
    await expect(page.getByText('商品暂时无法加载')).toHaveCount(0);

    await page.unroute('**/api/products');
    await page.route('**/api/products', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{"data":{}}' }));
    await page.reload();
    await expect(page.getByRole('alert').getByText('商品暂时无法加载')).toBeVisible();
  });
});
