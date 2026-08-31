import { test, expect } from '@playwright/test';
import { createAndLoginUser, adminLoginViaApi } from './helpers';

test.describe('journey 6 — admin order fulfilment pipeline', () => {
  test('ship and complete a member order; illegal transitions are rejected', async ({ page }) => {
    // A member places a physical order (pending) via API
    const email = await createAndLoginUser(page);
    const order = await page.request.post('/api/orders', {
      data: { productId: 4, quantity: 2, address: '林青，13800138000，北京市朝阳区望京街道 8 号' },
    });
    const orderId = (await order.json()).data.id;
    expect(orderId).toBeGreaterThan(0);

    // The admin takes over in the same cookie jar (token + admin_token coexist)
    await adminLoginViaApi(page);
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: '管理后台' })).toBeVisible();

    // Order management tab lists the member's order
    await page.getByRole('tab', { name: '订单管理' }).click();
    const row = page.getByRole('row').filter({ hasText: email });
    await expect(row).toBeVisible();
    await expect(row.getByText('待发货')).toBeVisible();
    await expect(row.getByText('帆布袋 × 2')).toBeVisible();

    // Skipping the pipeline while still pending is rejected by the API
    const skip = await page.request.patch(`/api/admin/orders/${orderId}`, {
      data: { status: 'completed' },
    });
    expect(skip.status()).toBe(400);

    // pending → shipped
    await row.getByRole('button', { name: `标记发货 #${orderId}` }).click();
    await expect(row.getByText('已发货')).toBeVisible();

    // Re-entering the same state is rejected too
    const back = await page.request.patch(`/api/admin/orders/${orderId}`, {
      data: { status: 'shipped' },
    });
    expect(back.status()).toBe(400);

    // shipped → completed
    await row.getByRole('button', { name: `标记完成 #${orderId}` }).click();
    await expect(row.getByText('已完成')).toBeVisible();

    // Terminal state: no further action in the row
    await expect(row.getByRole('button')).toHaveCount(0);

    // Moving backwards from completed is also rejected
    const rewind = await page.request.patch(`/api/admin/orders/${orderId}`, {
      data: { status: 'shipped' },
    });
    expect(rewind.status()).toBe(400);
  });
});
