import { test, expect, type Locator, type Page } from '@playwright/test';
import { createAndLoginUser } from './helpers';

const ADDRESS = '林青，13800138000，北京市朝阳区望京街道 8 号';
const LONG_PRODUCT = '超长名称环保帆布袋与可循环旅行收纳套装特别纪念版本';

async function createPendingOrder(page: Page) {
  const response = await page.request.post('/api/orders', {
    data: { productId: 4, quantity: 1, address: ADDRESS },
  });
  expect(response.status()).toBe(200);
  const payload = await response.json();
  expect(payload.data.status).toBe('pending');
}

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client);
}

async function expectAllMotionDurationsReduced(locator: Locator) {
  const durations = await locator.evaluate((root) => {
    const toSeconds = (raw: string) => raw.split(',').map((value) => {
      const trimmed = value.trim();
      const parsed = Number.parseFloat(trimmed);
      if (!Number.isFinite(parsed)) return 0;
      return trimmed.endsWith('ms') ? parsed / 1000 : parsed;
    });
    return [root, ...root.querySelectorAll('*')].flatMap((element) => {
      const style = getComputedStyle(element);
      return [...toSeconds(style.transitionDuration), ...toSeconds(style.animationDuration)];
    });
  });
  expect(durations.length).toBeGreaterThan(0);
  expect(durations.every((duration) => duration <= 0.001)).toBe(true);
}

test.describe('阶段三订单、账本与凭证', () => {
  test('材质 Dialog 取消订单并同步余额、状态和退款流水', async ({ page }) => {
    await createAndLoginUser(page);
    await createPendingOrder(page);

    await page.goto('/orders');
    await expect(page.locator('nav')).toHaveClass(/journey-nav/);
    await expect(page.getByText('帆布袋').first()).toBeVisible();
    await expect(page.getByText('待发货').first()).toBeVisible();

    const cancelButton = page.getByRole('button', { name: '取消订单 帆布袋' });
    await cancelButton.focus();
    await cancelButton.click();
    const dialog = page.getByRole('dialog', { name: '确认取消订单' });
    await expect(dialog).toHaveClass(/journey-portal-surface/);
    await expect(dialog.getByText(/500 里程将退回余额/)).toBeVisible();

    await page.keyboard.press('Tab');
    expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
    await page.keyboard.press('Escape');
    await expect(cancelButton).toBeFocused();
    await expect(page.getByText('待发货').first()).toBeVisible();

    await cancelButton.click();
    await page.getByRole('dialog', { name: '确认取消订单' }).getByRole('button', { name: '确认取消' }).click();

    await expect(page.getByText('已取消').first()).toBeVisible();
    await expect(page.getByLabel('订单 帆布袋 状态区')).toBeFocused();
    await expect(page.locator('nav').getByText('10,000')).toBeVisible();
    await page.getByRole('tab', { name: '余额明细' }).click();
    await expect(page.getByText('注册赠礼')).toBeVisible();
    await expect(page.getByText('取消订单「帆布袋」退款')).toBeVisible();
    await expect(page.getByText('+500')).toBeVisible();
    await expect(page.getByText('兑换「帆布袋」')).toBeVisible();
    await expect(page.getByText('-500', { exact: true })).toBeVisible();

    await page.getByRole('tab', { name: '订单历史' }).click();
    await expect(page.getByRole('button', { name: '取消订单 帆布袋' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: '查看凭证' })).toHaveCount(0);
  });

  test('取消失败保留原状态，并允许在同一 Dialog 重试', async ({ page }) => {
    await createAndLoginUser(page);
    await createPendingOrder(page);
    await page.goto('/orders');

    await page.route('**/api/orders/*/cancel', (route) => route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: '模拟取消失败' }),
    }));
    await page.getByRole('button', { name: '取消订单 帆布袋' }).click();
    const dialog = page.getByRole('dialog', { name: '确认取消订单' });
    await dialog.getByRole('button', { name: '确认取消' }).click();
    await expect(dialog.getByRole('alert')).toContainText('模拟取消失败');
    await expect(page.getByText('待发货').first()).toBeVisible();

    await page.unroute('**/api/orders/*/cancel');
    await dialog.getByRole('button', { name: '重试取消' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText('已取消').first()).toBeVisible();
  });

  test('首次账本失败后取消成功会自动恢复并显示退款流水', async ({ page }) => {
    await createAndLoginUser(page);
    await createPendingOrder(page);
    let milesRequests = 0;
    await page.route('**/api/miles', async (route) => {
      milesRequests += 1;
      if (milesRequests === 1) {
        await route.fulfill({ status: 500, contentType: 'application/json', body: '{}' });
      } else {
        await route.continue();
      }
    });

    await page.goto('/orders');
    await expect(page.getByText('帆布袋').first()).toBeVisible();
    await page.getByRole('tab', { name: '余额明细' }).click();
    await expect(page.getByText('里程明细暂时无法加载')).toBeVisible();
    await page.getByRole('tab', { name: '订单历史' }).click();
    await page.getByRole('button', { name: '取消订单 帆布袋' }).click();
    await page.getByRole('dialog', { name: '确认取消订单' }).getByRole('button', { name: '确认取消' }).click();

    await expect.poll(() => milesRequests).toBeGreaterThanOrEqual(2);
    await page.getByRole('tab', { name: '余额明细' }).click();
    await expect(page.getByText('取消订单「帆布袋」退款')).toBeVisible();
    await expect(page.getByRole('button', { name: '重试明细' })).toHaveCount(0);
  });

  test('订单与账本失败独立重试，凭证关闭后焦点返回入口', async ({ page }) => {
    await createAndLoginUser(page);
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: () => Promise.reject(new Error('clipboard denied')) },
      });
    });
    const response = await page.request.post('/api/orders', { data: { productId: 2, quantity: 1 } });
    expect((await response.json()).data.status).toBe('completed');

    await page.route('**/api/orders', (route) => route.fulfill({ status: 500, body: '{}' }));
    await page.route('**/api/miles', (route) => route.fulfill({ status: 500, body: '{}' }));
    await page.goto('/orders');
    await expect(page.getByText('订单暂时无法加载')).toBeVisible();

    await page.unroute('**/api/orders');
    await page.getByRole('button', { name: '重试订单' }).click();
    const voucherButton = page.getByRole('button', { name: '查看凭证' });
    await expect(voucherButton).toBeVisible();
    await voucherButton.focus();
    await voucherButton.click();
    const voucherDialog = page.getByRole('dialog', { name: '凭证详情' });
    await expect(voucherDialog).toHaveClass(/journey-portal-surface/);
    await expect(voucherDialog.getByText('酒店优惠券码')).toBeVisible();
    await page.keyboard.press('Tab');
    expect(await voucherDialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
    await voucherDialog.getByRole('button', { name: /复制券码/ }).click();
    await expect(page.getByText('券码复制失败，请手动选择复制')).toBeVisible();
    await expect(voucherDialog.getByText('券码已复制')).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(voucherButton).toBeFocused();

    await page.getByRole('tab', { name: '余额明细' }).click();
    await expect(page.getByText('里程明细暂时无法加载')).toBeVisible();
    await page.unroute('**/api/miles');
    await page.getByRole('button', { name: '重试明细' }).click();
    await expect(page.getByText('兑换「酒店 50 元券」')).toBeVisible();
  });

  test('320px 订单与 Portal 不溢出，减少透明度和动态时降级', async ({ page }) => {
    await createAndLoginUser(page);
    await page.route('**/api/orders', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [{
          id: 9001,
          product_name: LONG_PRODUCT,
          icon_type: 'bag',
          category: 'physical',
          mileage_cost: 9_876_543_210,
          quantity: 10,
          status: 'pending',
          voucher_code: 'BAG-LONG-CODE',
          address: '香港特别行政区一个非常长的收货地址用于检查窄屏断行与内容边界',
          created_at: '2026-09-19 10:00:00',
        }],
      }),
    }));
    await page.route('**/api/miles', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          balance: 1_234_567_890_123,
          transactions: [{
            id: 8001,
            amount: -9_876_543_210,
            type: 'redeem',
            order_id: 9001,
            description: `兑换「${LONG_PRODUCT}」`,
            created_at: '2026-09-19 10:00:00',
          }],
        },
      }),
    }));
    const session = await page.context().newCDPSession(page);
    await session.send('Emulation.setEmulatedMedia', {
      features: [
        { name: 'prefers-reduced-transparency', value: 'reduce' },
        { name: 'prefers-reduced-motion', value: 'reduce' },
      ],
    });
    await page.setViewportSize({ width: 320, height: 812 });
    await page.goto('/orders');
    await expect(page.getByText(LONG_PRODUCT).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expect.poll(() => page.locator('.journey-surface-light').first().evaluate((element) => getComputedStyle(element).backdropFilter)).toBe('none');

    await page.getByRole('tab', { name: '余额明细' }).click();
    await expect(page.getByText('1,234,567,890,123')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.getByRole('tab', { name: '订单历史' }).click();
    await page.getByRole('button', { name: `取消订单 ${LONG_PRODUCT}` }).click();
    const dialog = page.getByRole('dialog', { name: '确认取消订单' });
    await expect.poll(() => dialog.evaluate((element) => getComputedStyle(element).backdropFilter)).toBe('none');
    const portalDimensions = await dialog.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return {
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
        dialogScroll: element.scrollWidth,
        dialogClient: element.clientWidth,
        left: rect.left,
        right: rect.right,
        viewport: window.innerWidth,
      };
    });
    expect(portalDimensions.scroll).toBeLessThanOrEqual(portalDimensions.client);
    expect(portalDimensions.dialogScroll).toBeLessThanOrEqual(portalDimensions.dialogClient);
    expect(portalDimensions.left).toBeGreaterThanOrEqual(0);
    expect(portalDimensions.right).toBeLessThanOrEqual(portalDimensions.viewport);
    await expectAllMotionDurationsReduced(page.locator('body'));
  });

  test('畸形订单与账本响应进入错误态而不渲染', async ({ page }) => {
    await createAndLoginUser(page);
    await page.route('**/api/orders', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [{ id: 1, product_name: '缺字段订单' }] }),
    }));
    await page.route('**/api/miles', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { balance: null, transactions: [{ id: 1 }] } }),
    }));
    await page.goto('/orders');
    await expect(page.getByText('订单暂时无法加载')).toBeVisible();
    await page.getByRole('tab', { name: '余额明细' }).click();
    await expect(page.getByText('里程明细暂时无法加载')).toBeVisible();
  });
});
