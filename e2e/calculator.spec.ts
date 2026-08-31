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
    await expect(page.getByText('96.93')).toBeVisible();

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
    await expect(page.getByText('80.77')).toBeVisible();
  });
});
