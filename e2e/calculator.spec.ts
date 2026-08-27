import { test, expect } from '@playwright/test';
import { createAndLoginUser } from './helpers';

test.describe('journey 2 — carbon calculator', () => {
  test('preset route + aircraft + cabin shows the emission result', async ({ page }) => {
    await createAndLoginUser(page);

    await page.goto('/calculator');

    // Empty state before anything is filled in
    await expect(page.getByText('请输入完整的航班信息')).toBeVisible();

    // Preset route 北京→上海 = 1075 km
    await page.getByRole('button', { name: /北京→上海/ }).click();
    await expect(page.getByLabel('飞行距离 (km)')).toHaveValue('1075');

    // 机型: 窄体标准机型 (0.090 kg/km) — 舱位: 经济舱 (×1.0)
    await page.getByText('选择机型').click();
    await page.getByRole('option', { name: '窄体标准机型', exact: true }).click();
    await page.getByText('选择舱位').click();
    await page.getByRole('option', { name: '经济舱', exact: true }).click();

    // 1075 × 0.090 × 1.0 = 96.75 kg CO₂
    await expect(page.getByText('96.75')).toBeVisible();

    // A relatable analogy appears (tree absorption or car km)
    await expect(page.getByText(/一棵树|开车行驶/)).toBeVisible();
  });
});
