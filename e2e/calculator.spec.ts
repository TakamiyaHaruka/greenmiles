import { test, expect } from '@playwright/test';
import { createAndLoginUser } from './helpers';

test.describe('journey 2 — carbon calculator', () => {
  test('preset route + aircraft + cabin shows the emission result', async ({ page }) => {
    await createAndLoginUser(page);

    await page.goto('/calculator');

    // Empty state before anything is filled in
    await expect(page.getByText('请输入完整的航班信息')).toBeVisible();

    // Preset route 北京→上海 — PEK-SHA great-circle distance = 1077 km
    await page.getByRole('button', { name: /北京→上海/ }).click();
    await expect(page.getByLabel('飞行距离 (km)')).toHaveValue('1077');

    // 机型: 窄体标准机型 (0.090 kg/km) — 舱位: 经济舱 (×1.0)
    await page.getByText('选择机型').click();
    await page.getByRole('option', { name: '窄体标准机型', exact: true }).click();
    await page.getByText('选择舱位').click();
    await page.getByRole('option', { name: '经济舱', exact: true }).click();

    // 1077 × 0.090 × 1.0 = 96.93 kg CO₂
    await expect(page.getByText('96.93', { exact: true })).toBeVisible();

    // A relatable analogy appears (tree absorption or car km)
    await expect(page.getByText(/一棵树|开车行驶/)).toBeVisible();
  });

  test('flight number import prefills route, distance and aircraft', async ({ page }) => {
    await createAndLoginUser(page);

    await page.goto('/calculator');

    // Import CA1501 (PEK→SHA, A20N) from the seeded mock provider
    await page.getByLabel('按航班号导入').fill('ca1501');
    await page.getByRole('button', { name: /查询/ }).click();

    // The import badge shows the resolved route
    await expect(page.getByText(/国航 CA1501/)).toBeVisible();

    // Distance auto-computed from the resolved airports
    await expect(page.getByLabel('飞行距离 (km)')).toHaveValue('1077');

    // Only the cabin class is left to pick (aircraft A20N was auto-mapped)
    await page.getByText('选择舱位').click();
    await page.getByRole('option', { name: '经济舱', exact: true }).click();

    // 1077 × 0.075 × 1.0 = 80.775 → 80.77 kg CO₂ (FP rounds 80.77499… down).
    // This result is only reachable with the auto-mapped NARROW_EFFICIENT coefficient
    await expect(page.getByText('80.77', { exact: true })).toBeVisible();
  });

  test('save failure can retry, then the result carries its context to the mall', async ({ page }) => {
    await createAndLoginUser(page);
    await page.goto('/calculator');
    await page.getByRole('button', { name: /北京→上海/ }).click();
    await page.getByRole('combobox', { name: '机型' }).click();
    await expect(page.locator('.journey-select-content')).toBeVisible();
    await page.getByRole('option', { name: '窄体标准机型', exact: true }).click();
    await page.getByRole('combobox', { name: '舱位' }).click();
    await page.getByRole('option', { name: '经济舱', exact: true }).click();
    await expect(page.getByRole('img', { name: '碳排放 96.93 kg CO₂' })).toBeVisible();

    await page.route('**/api/carbon', (route) => route.fulfill({ status: 503, body: '{}' }));
    await page.getByRole('button', { name: '保存到我的碳足迹' }).click();
    await expect(page.getByRole('button', { name: '保存失败，点击重试' })).toBeVisible();
    await page.unroute('**/api/carbon');
    await page.getByRole('button', { name: '保存失败，点击重试' }).click();
    await expect(page.getByRole('button', { name: '已保存到我的碳足迹' })).toBeVisible();

    await page.getByRole('button', { name: '前往绿色商城抵消' }).click();
    await expect(page).toHaveURL(/\/mall$/);
    await expect(page.getByText(/抵消您本次飞行的/)).toBeVisible();
    await expect(page.getByText('96.93 kg')).toBeVisible();
  });

  test('import and result remain usable at 320px and 375px without overflow', async ({ page }) => {
    await createAndLoginUser(page);
    for (const width of [320, 375]) {
      await page.setViewportSize({ width, height: 812 });
      await page.goto('/calculator');
      await page.getByLabel('按航班号导入').fill('CA1501');
      await page.getByRole('button', { name: /查询/ }).click();
      await expect(page.getByText(/国航 CA1501/)).toBeVisible();
      await page.getByRole('combobox', { name: '舱位' }).click();
      await page.getByRole('option', { name: '经济舱', exact: true }).click();
      await expect(page.getByRole('img', { name: /碳排放 .* kg CO₂/ })).toBeVisible();
      await expect(page.getByRole('button', { name: '前往绿色商城抵消' })).toBeVisible();
      const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
      expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client);
    }
  });
});
