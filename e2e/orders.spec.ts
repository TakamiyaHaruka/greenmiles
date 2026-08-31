import { test, expect } from '@playwright/test';
import { createAndLoginUser } from './helpers';

test.describe('journey 5 — order cancellation and the miles ledger', () => {
  test('cancel a pending order: miles refund, status flips, ledger shows the refund', async ({ page }) => {
    await createAndLoginUser(page);

    // Redeem the canvas bag (physical, 500 miles) directly via API → pending order
    const order = await page.request.post('/api/orders', {
      data: { productId: 4, quantity: 1, address: '林青，13800138000，北京市朝阳区望京街道 8 号' },
    });
    expect(order.status()).toBe(200);
    const orderBody = await order.json();
    expect(orderBody.data.status).toBe('pending');

    await page.goto('/orders');
    await expect(page.getByText('帆布袋').first()).toBeVisible();
    await expect(page.getByText('待发货').first()).toBeVisible();

    // Accept the confirmation dialog, then cancel
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: '取消订单 帆布袋' }).click();

    // Status flips and the refund lands in the navbar balance
    await expect(page.getByText('已取消').first()).toBeVisible();
    await expect(page.locator('nav').getByText('10,000')).toBeVisible();

    // The ledger tab lists the welcome grant and the refund
    await page.getByRole('tab', { name: '余额明细' }).click();
    await expect(page.getByText('注册赠礼')).toBeVisible();
    await expect(page.getByText('取消订单「帆布袋」退款')).toBeVisible();
    await expect(page.getByText('+500')).toBeVisible();
    await expect(page.getByText('兑换「帆布袋」')).toBeVisible();
    await expect(page.getByText('-500')).toBeVisible();

    // A cancelled order has no further cancel action
    await page.getByRole('tab', { name: '订单历史' }).click();
    await expect(page.getByRole('button', { name: '取消订单 帆布袋' })).toHaveCount(0);
  });

  test('completed voucher orders expose no cancel action', async ({ page }) => {
    await createAndLoginUser(page);

    // Hotel voucher (virtual) is fulfilled instantly → completed
    const order = await page.request.post('/api/orders', { data: { productId: 2, quantity: 1 } });
    expect((await order.json()).data.status).toBe('completed');

    await page.goto('/orders');
    await expect(page.getByText('酒店 50 元券').first()).toBeVisible();
    await expect(page.getByText('已完成').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /取消订单/ })).toHaveCount(0);
  });
});
