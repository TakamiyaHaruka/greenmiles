import { test, expect } from '@playwright/test';
import { createAndLoginUser } from './helpers';

const LONG_ROUTE = 'PEK→HKG→SIN→SYD 超长航线标签用于检查窄屏断行与数据边界';

async function createFlight(page: Parameters<typeof createAndLoginUser>[0]) {
  const response = await page.request.post('/api/carbon', {
    data: { distance: 1077, aircraftType: 'NARROW_STANDARD', cabinClass: 'Y', route: 'PEK→SHA' },
  });
  expect(response.status()).toBe(200);
}

test.describe('阶段三碳足迹', () => {
  test('展示投影、可交互图表、季度报告和最近记录', async ({ page }) => {
    await createAndLoginUser(page);
    await createFlight(page);
    const order = await page.request.post('/api/orders', { data: { productId: 3, quantity: 1 } });
    expect(order.status()).toBe(200);

    await page.goto('/footprint');
    await expect(page.locator('nav')).toHaveClass(/journey-nav/);
    await expect(page.getByText('1 棵树 · 十年累计固定 220 kg')).toBeVisible();
    await expect(page.getByText('航班次数')).toBeVisible();
    await expect(page.getByText('96.93 kg', { exact: false }).first()).toBeVisible();

    const chartBar = page.locator('.recharts-bar-rectangle').first();
    await expect(chartBar).toBeVisible();
    await expect(page.getByRole('img', { name: '月度碳排放柱状图' })).toBeVisible();
    await expect(page.locator('#monthly-chart-summary')).toContainText('月度碳排放趋势');
    await expect(page.locator('#monthly-chart-summary')).toContainText('96.93 kg');
    await chartBar.hover();
    await expect(page.locator('.recharts-tooltip-wrapper')).toContainText('CO₂ (kg)');

    await expect(page.getByText('季度报告')).toBeVisible();
    await expect(page.getByRole('button', { name: '下载季报海报' })).toBeVisible();
    await expect(page.getByRole('button', { name: '下载证书海报' })).toBeVisible();
    await expect(page.getByText('PEK→SHA')).toBeVisible();
  });

  test('新用户看到明确空状态和计算器行动入口', async ({ page }) => {
    await createAndLoginUser(page);
    await page.goto('/footprint');

    await expect(page.getByText('0 棵树 · 十年累计固定 0 kg')).toBeVisible();
    await expect(page.getByText('还没有飞行记录，去计算器记一笔吧')).toBeVisible();
    await expect(page.getByText('暂无季度数据')).toBeVisible();
    await expect(page.getByRole('link', { name: '计算一次飞行碳排放' })).toHaveAttribute('href', '/calculator');
    await expect(page.getByRole('link', { name: '前往计算器' })).toHaveAttribute('href', '/calculator');
    await expect(page.getByRole('button', { name: '下载证书海报' })).toHaveCount(0);
  });

  test('接口失败与无数据状态分离，并可重试', async ({ page }) => {
    await createAndLoginUser(page);
    await page.route('**/api/carbon', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          flightCount: 1,
          totalCo2Kg: 99,
          myTrees: 0,
          records: [{ id: 1, distance: 1000, aircraft_type: 'NARROW_STANDARD', cabin_class: 'Y', co2_kg: null }],
        },
      }),
    }));
    await page.goto('/footprint');
    await expect(page.locator('.journey-surface-light[role="alert"]')).toContainText('碳足迹暂时无法加载');
    await expect(page.getByText('还没有飞行记录')).toHaveCount(0);

    await page.unroute('**/api/carbon');
    await page.getByRole('button', { name: '重试' }).click();
    await expect(page.getByText('0 棵树 · 十年累计固定 0 kg')).toBeVisible();
  });

  test('320px 和系统降级下保持可读且无横向溢出', async ({ page }) => {
    await createAndLoginUser(page);
    await page.route('**/api/carbon', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          flightCount: 1,
          totalCo2Kg: 123_456_789.12,
          myTrees: 987_654,
          records: [{
            id: 7001,
            distance: 19_999.99,
            aircraft_type: 'NARROW_STANDARD',
            cabin_class: 'Y',
            co2_kg: 98_765_432.1,
            route: LONG_ROUTE,
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
    await page.goto('/footprint');
    await expect(page.getByText(LONG_ROUTE)).toBeVisible();
    await expect(page.getByText('123,456,789.12 kg')).toBeVisible();
    await expect(page.locator('.journey-chart-panel')).toBeVisible();

    const dimensions = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client);
    await expect.poll(() => page.locator('.journey-surface-heavy').first().evaluate((element) => getComputedStyle(element).backdropFilter)).toBe('none');
    const duration = await page.locator('nav a[href="/mall"]').first().evaluate((element) => getComputedStyle(element).transitionDuration);
    expect(Number.parseFloat(duration)).toBeLessThanOrEqual(0.001);
  });
});
