import { expect, test } from '@playwright/test';
import Database from 'better-sqlite3';
import { readFile } from 'fs/promises';
import path from 'path';
import { createAndLoginUser } from './helpers';

const E2E_DB = path.join(process.cwd(), 'e2e', 'greenmiles-e2e.db');

const VALID_EMPTY_IMPACT = {
  flightCount: 0,
  totalCo2Kg: 0,
  redeemedMiles: 0,
  treeCount: 0,
  projectedOffsetKg: 0,
  certificateCount: 0,
  milestones: { firstFlightAt: null, firstTreeAt: null, firstRideAt: null },
  certificateSources: [],
};

test.describe('阶段四我的成果', () => {
  test('全量汇总超过 50 条记录，排除取消订单并安全预览和下载', async ({ page }) => {
    test.setTimeout(60_000);
    const email = await createAndLoginUser(page);

    for (let index = 0; index < 51; index += 1) {
      const response = await page.request.post('/api/carbon', {
        data: {
          distance: 1077,
          aircraftType: 'NARROW_STANDARD',
          cabinClass: 'Y',
          route: 'PEK→SHA',
        },
      });
      expect(response.status()).toBe(200);
    }

    expect((await page.request.post('/api/orders', { data: { productId: 3, quantity: 1 } })).status()).toBe(200);
    expect((await page.request.post('/api/orders', { data: { productId: 1, quantity: 1 } })).status()).toBe(200);
    const db = new Database(E2E_DB);
    const product = db.prepare(`
      INSERT INTO products (name, description, category, mileage_cost, stock, icon_type)
      VALUES (?, ?, 'physical', 500, 10, 'bag')
    `).run('改价退款验证商品', '仅用于验证原始兑换金额退款');
    const physicalProductId = Number(product.lastInsertRowid);
    db.close();

    const physicalOrder = await page.request.post('/api/orders', {
      data: { productId: physicalProductId, quantity: 1, address: '北京市测试路 1 号' },
    });
    expect(physicalOrder.status()).toBe(200);
    const physicalBody = await physicalOrder.json();
    const editedDb = new Database(E2E_DB);
    editedDb.prepare('UPDATE products SET mileage_cost = 200 WHERE id = ?').run(physicalProductId);
    editedDb.close();
    const cancellation = await page.request.post(`/api/orders/${physicalBody.data.id}/cancel`);
    expect(cancellation.status()).toBe(200);
    expect((await cancellation.json()).data.new_balance).toBe(5800);

    await page.goto('/impact');
    await expect(page.locator('nav')).toHaveClass(/journey-nav/);
    await expect(page.getByRole('heading', { name: '我的成果', exact: true })).toBeVisible();
    await expect(page.getByText('51 段', { exact: true })).toBeVisible();
    await expect(page.getByText('已用于绿色兑换').locator('..')).toContainText('4,200');
    await expect(page.getByRole('heading', { name: '第一段绿色旅程' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '第一份植树支持' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '第一次绿色接驳' })).toBeVisible();
    await expect(page.getByText(/共 2 份/)).toBeVisible();

    const previewButton = page.getByRole('button', { name: '预览分享卡' });
    await previewButton.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('绿色旅行者 · 全部时间');
    await expect(dialog).toContainText('4,200 里程');
    await expect(dialog).toContainText('220 kg CO₂');
    await expect(dialog).not.toContainText(email);
    await expect(dialog).not.toContainText('PEK→SHA');
    await expect(dialog).not.toContainText('TREE-');
    await expect(dialog).not.toContainText('北京市测试路');
    await page.keyboard.press('Escape');
    await expect(previewButton).toBeFocused();

    await previewButton.click();
    const downloadPromise = page.waitForEvent('download');
    await dialog.getByRole('button', { name: '下载成果 PNG' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('greenmiles-impact.png');
    const downloadPath = await download.path();
    expect(downloadPath).not.toBeNull();
    const png = await readFile(downloadPath!);
    expect(png.length).toBeGreaterThan(5_000);
    expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(png.readUInt32BE(16)).toBe(750);
    expect(png.readUInt32BE(20)).toBe(1000);
  });

  test('新会员看到真实零状态、待开启里程碑和下一步行动', async ({ page }) => {
    await createAndLoginUser(page);
    await page.goto('/impact');

    await expect(page.getByRole('heading', { name: '第一份绿意，从一次选择开始' })).toBeVisible();
    await expect(page.getByText('待开启', { exact: true })).toHaveCount(3);
    await expect(page.getByRole('button', { name: '预览分享卡' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: '记录一段航班' })).toHaveAttribute('href', '/calculator');
    await expect(page.getByRole('link', { name: '探索绿色商城' })).toHaveAttribute('href', '/mall');
    await expect(page.getByText('暂无可收藏凭证', { exact: false })).toBeVisible();
  });

  test('批量兑换按凭证份数汇总而不是按订单行计数', async ({ page }) => {
    await createAndLoginUser(page);
    const order = await page.request.post('/api/orders', {
      data: { productId: 1, quantity: 3 },
    });
    expect(order.status()).toBe(200);

    await page.goto('/impact');

    await expect(page.getByText(/共 3 份/)).toBeVisible();
    await expect(page.getByText(/骑行卡凭证 · 3 份/)).toBeVisible();
  });

  test('畸形响应进入错误态且可以重试', async ({ page }) => {
    await createAndLoginUser(page);
    await page.route('**/api/impact', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          ...VALID_EMPTY_IMPACT,
          milestones: { ...VALID_EMPTY_IMPACT.milestones, firstFlightAt: '2026-02-30 00:00:00' },
        },
      }),
    }));
    await page.goto('/impact');
    await expect(page.locator('.journey-surface-light[role="alert"]')).toContainText('个人成果暂时无法加载');
    await expect(page.getByText('第一份绿意，从一次选择开始')).toHaveCount(0);

    await page.unroute('**/api/impact');
    await page.getByRole('button', { name: '重试' }).click();
    await expect(page.getByRole('heading', { name: '第一份绿意，从一次选择开始' })).toBeVisible();
  });

  test('会话过期时离开成果错误页并返回登录', async ({ page }) => {
    await createAndLoginUser(page);
    await page.route('**/api/impact', (route) => route.fulfill({ status: 401, body: '{}' }));

    await page.goto('/impact');

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('textbox', { name: '邮箱 *' })).toBeVisible();
    await expect(page.getByRole('button', { name: '登录', exact: true })).toBeVisible();
  });

  test('320/375px、两种材质和系统降级下无横向溢出', async ({ page }) => {
    await createAndLoginUser(page);
    await page.route('**/api/impact', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          flightCount: 123_456,
          totalCo2Kg: 123_456_789.12,
          redeemedMiles: 987_654_321,
          treeCount: 987_654,
          projectedOffsetKg: 217_283_880,
          certificateCount: 123_456,
          milestones: {
            firstFlightAt: '2026-01-01 00:00:00',
            firstTreeAt: '2026-01-02 00:00:00',
            firstRideAt: '2026-01-03 00:00:00',
          },
          certificateSources: [{
            sourceType: 'tree',
            productName: '超长植树项目名称用于验证窄屏换行而不是撑破页面边界',
            quantity: 999_999,
            createdAt: '2026-01-02 00:00:00',
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

    for (const width of [320, 375]) {
      await page.setViewportSize({ width, height: 812 });
      await page.goto('/impact');
      await expect(page.getByText('已用于绿色兑换').locator('..')).toContainText('987,654,321');
      const dimensions = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
      }));
      expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client);
    }

    await expect.poll(() => page.locator('.journey-surface-light').first().evaluate((element) => getComputedStyle(element).backdropFilter)).toBe('none');
    const duration = await page.getByRole('button', { name: '预览分享卡' }).evaluate((element) => getComputedStyle(element).transitionDuration);
    expect(Number.parseFloat(duration)).toBeLessThanOrEqual(0.001);
    await page.getByRole('button', { name: '玻璃外观' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-glass-mode', 'standard');
  });
});
