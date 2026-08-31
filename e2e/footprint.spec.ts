import { test, expect } from '@playwright/test';
import { createAndLoginUser } from './helpers';

test.describe('碳足迹页', () => {
  test('shows projection, chart and poster buttons after a flight and a tree redemption', async ({ page }) => {
    await createAndLoginUser(page);

    // One flight record
    const record = await page.request.post('/api/carbon', {
      data: { distance: 1077, aircraftType: 'NARROW_STANDARD', cabinClass: 'Y', route: 'PEK→SHA' },
    });
    expect(record.status()).toBe(200);

    // One standing tree (carbon product, 3000 miles of the 10000 sign-up grant)
    const order = await page.request.post('/api/orders', { data: { productId: 3, quantity: 1 } });
    expect(order.status()).toBe(200);

    await page.goto('/footprint');

    // 1 tree × 22 kg/year × 10 years = 220 kg
    await expect(page.getByText('1 棵树 · 十年累计固定 220 kg')).toBeVisible();

    // KPI row reflects the flight and the tree
    await expect(page.getByText('航班次数')).toBeVisible();
    await expect(page.getByText('96.93 kg', { exact: false }).first()).toBeVisible();

    // Monthly trend chart has a bar for the record's month
    const chart = page.locator('.recharts-bar-rectangle');
    await expect(chart.first()).toBeVisible();

    // Quarterly report card renders with poster buttons
    await expect(page.getByText('季度报告')).toBeVisible();
    await expect(page.getByRole('button', { name: '下载季报海报' })).toBeVisible();
    await expect(page.getByRole('button', { name: '下载证书海报' })).toBeVisible();

    // Flight records list shows the route label
    await expect(page.getByText('PEK→SHA')).toBeVisible();
  });

  test('shows empty-state hints for a fresh account', async ({ page }) => {
    await createAndLoginUser(page);
    await page.goto('/footprint');

    await expect(page.getByText('0 棵树 · 十年累计固定 0 kg')).toBeVisible();
    await expect(page.getByText('还没有飞行记录，去计算器记一笔吧')).toBeVisible();
    await expect(page.getByText('暂无季度数据')).toBeVisible();
    // No tree redeemed → no certificate poster button
    await expect(page.getByRole('button', { name: '下载证书海报' })).toHaveCount(0);
  });
});
