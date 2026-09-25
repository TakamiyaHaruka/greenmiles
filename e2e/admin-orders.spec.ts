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

    await page.goto('/');
    await page.getByRole('button', { name: '玻璃外观' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-glass-mode', 'standard');

    // The admin takes over in the same cookie jar (token + admin_token coexist)
    await adminLoginViaApi(page);
    const session = await page.context().newCDPSession(page);
    await session.send('Emulation.setEmulatedMedia', {
      features: [
        { name: 'prefers-reduced-transparency', value: 'reduce' },
        { name: 'prefers-reduced-motion', value: 'reduce' },
      ],
    });
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: '管理后台' })).toBeVisible();
    await expect(page.locator('nav')).toHaveClass(/journey-nav/);
    await expect(page.getByRole('button', { name: '玻璃外观' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-glass-mode', 'standard');
    await page.getByRole('button', { name: '玻璃外观' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-glass-mode', 'glass');

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
    const updateToast = page.locator('.journey-toast').filter({ hasText: `订单 #${orderId} 已更新` });
    await expect(updateToast).toBeVisible();
    await expect.poll(() => updateToast.evaluate((element) => getComputedStyle(element).backdropFilter)).toBe('none');

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

  test('admin login, failures, portals and dense tables remain recoverable on a narrow screen', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 812 });
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'GreenMiles 管理后台' })).toBeVisible();

    await page.getByLabel('管理员密码').fill('wrong-password');
    await page.getByRole('button', { name: '进入管理后台' }).click();
    await expect(page.getByRole('alert')).toBeVisible();

    await page.route('**/api/admin/products', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [{}] }),
    }));
    await page.getByLabel('管理员密码').fill(process.env.ADMIN_PASSWORD || 'e2e-admin-secret');
    await page.getByRole('button', { name: '进入管理后台' }).click();
    await expect(page.getByText('管理数据暂时无法加载，请重试')).toBeVisible();
    await page.unroute('**/api/admin/products');
    await page.getByRole('button', { name: '重试加载' }).click();
    await expect(page.getByRole('heading', { name: '管理后台', exact: true })).toBeVisible();

    const createButton = page.getByRole('button', { name: '新增商品' });
    await createButton.click();
    const productDialog = page.getByRole('dialog');
    await expect(productDialog).toHaveClass(/journey-portal-surface/);
    await productDialog.getByLabel(/商品名称/).fill('边界测试商品');
    await productDialog.getByLabel(/所需里程/).fill('100');
    await productDialog.getByRole('button', { name: '保存' }).click();
    await expect(productDialog.locator('#product-category')).toBeFocused();
    await expect(productDialog.locator('#product-category-error')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(createButton).toBeFocused();

    const firstDeleteButton = page.getByRole('button', { name: /^删除 / }).first();
    await firstDeleteButton.click();
    await expect(page.getByRole('dialog').getByRole('heading', { name: '确认删除商品' })).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: '取消' }).click();
    await expect(firstDeleteButton).toBeFocused();

    await page.route('**/api/admin/orders', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [{}] }),
    }));
    await page.getByRole('tab', { name: '订单管理' }).click();
    await expect(page.getByText('订单暂时无法加载，请重试')).toBeVisible();
    await page.unroute('**/api/admin/orders');
    await page.getByRole('button', { name: '重试订单加载' }).click();
    await expect(page.getByText('暂无订单').or(page.getByRole('table'))).toBeVisible();

    const pageWidth = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(pageWidth.scroll).toBeLessThanOrEqual(pageWidth.client);
  });

  test('an expired admin session during product save returns to login', async ({ page }) => {
    await adminLoginViaApi(page);
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: '管理后台', exact: true })).toBeVisible();

    await page.route('**/api/admin/products/*', (route) => {
      if (route.request().method() === 'PUT') {
        return route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: '未授权的管理员会话' }),
        });
      }
      return route.continue();
    });

    await page.getByRole('button', { name: /^编辑 / }).first().click();
    await page.getByRole('dialog').getByRole('button', { name: '保存' }).click();
    await expect(page.getByRole('heading', { name: 'GreenMiles 管理后台' })).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
});
