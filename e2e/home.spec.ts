import { test, expect } from '@playwright/test';
import Database from 'better-sqlite3';
import path from 'path';
import { createAndLoginUser } from './helpers';

const E2E_DB = path.join(process.cwd(), 'e2e', 'greenmiles-e2e.db');

test.describe('phase 1 home experience', () => {
  test('guest sees the commerce-first home and appearance persists without leaking styles', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('html')).toHaveAttribute('data-glass-mode', 'glass');
    await expect(page.getByRole('heading', { name: /让飞过的里程/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /探索绿色好物/ })).toHaveAttribute('href', '/mall');
    await expect(page.getByRole('link', { name: /计算飞行碳排放/ })).toHaveAttribute('href', '/calculator');
    await expect(page.getByText('注册领取 10,000 演示里程')).toBeVisible();
    await expect(page.getByRole('heading', { name: '精选绿色好物' })).toBeVisible();
    await expect(page.getByText('共享单车骑行卡')).toBeVisible();
    await expect(page.getByText('游客状态不会显示虚构的个人成果。')).toBeVisible();

    await page.getByRole('button', { name: /共享单车骑行卡.*查看详情/ }).click();
    await page.getByRole('button', { name: '加入购物车' }).click();
    await page.getByRole('button', { name: '打开购物车' }).click();
    await expect(page.getByRole('dialog').getByRole('button', { name: '登录后兑换' })).toBeVisible();
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: '玻璃外观' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-glass-mode', 'standard');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-glass-mode', 'standard');

    await page.getByRole('button', { name: '玻璃外观' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-glass-mode', 'glass');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-glass-mode', 'glass');

    await page.goto('/login');
    await expect(page.locator('nav')).not.toHaveClass(/home-nav/);
    await expect(page.getByPlaceholder('Coming Soon')).toBeVisible();
  });

  test('new member sees real zero-state data and can add a featured product to the cart', async ({ page }) => {
    await createAndLoginUser(page);
    await page.goto('/');

    await expect(page.getByText('已保存航班').locator('..').getByText(/^0 段$/)).toBeVisible();
    await expect(page.getByText('支持树量').locator('..').getByText(/^0 棵\*$/)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'GreenMiles 平台概览' })).toBeVisible();

    const featuredProduct = page.getByRole('button', { name: /共享单车骑行卡.*当前可兑换/ });
    await featuredProduct.focus();
    await featuredProduct.click();
    await expect(page.getByRole('dialog').getByText('共享单车骑行卡')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(featuredProduct).toBeFocused();
    await featuredProduct.click();
    await page.getByRole('button', { name: '加入购物车' }).click();
    await expect(page.locator('nav').getByText('1', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: '打开购物车' }).click();
    await expect(page.getByRole('dialog').getByText('购物车')).toBeVisible();
    await page.keyboard.press('Escape');

    await page.getByRole('link', { name: /探索绿色好物/ }).click();
    await expect(page).toHaveURL(/\/mall$/);
    await expect(page.locator('nav')).not.toHaveClass(/home-nav/);
    await expect(page.locator('nav').getByText('1', { exact: true })).toBeVisible();
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-glass-mode', 'glass');
  });

  test('a transient identity failure is retryable and never shown as a guest', async ({ page }) => {
    await createAndLoginUser(page);
    await page.route('**/api/user', (route) => route.fulfill({ status: 500, body: '{}' }));
    await page.goto('/');

    await expect(page.getByText('暂时无法确认会员状态')).toBeVisible();
    await expect(page.getByText('游客状态不会显示虚构的个人成果。')).not.toBeVisible();
    await expect(page.getByRole('link', { name: /注册领取/ })).not.toBeVisible();

    await page.unroute('**/api/user');
    await page.getByRole('button', { name: '重试', exact: true }).first().click();
    await expect(page.getByText('可用里程', { exact: true })).toBeVisible();
    await expect(page.getByText('10,000', { exact: true }).first()).toBeVisible();
  });

  test('member with activity sees personal data rather than platform totals', async ({ page }) => {
    await createAndLoginUser(page);
    await page.request.post('/api/carbon', {
      data: {
        distance: 1000,
        aircraftType: 'NARROW_STANDARD',
        cabinClass: 'Y',
        route: 'PEK→SHA',
      },
    });
    await page.request.post('/api/orders', { data: { productId: 3, quantity: 1 } });

    await page.goto('/');
    await expect(page.getByText('已保存航班').locator('..').getByText(/^1 段$/)).toBeVisible();
    await expect(page.getByText('支持树量').locator('..').getByText(/^1 棵\*$/)).toBeVisible();
    await expect(page.getByText('飞行碳足迹').locator('..').getByText(/^90 kg CO₂$/)).toBeVisible();
    await expect(page.getByText(/现有演示口径/)).toBeVisible();
  });

  test('320px member navigation contains a long balance without overflowing', async ({ page }) => {
    const email = await createAndLoginUser(page);
    const db = new Database(E2E_DB);
    db.prepare('UPDATE users SET miles_balance = ? WHERE email = ?').run(1_234_567_890, email);
    db.close();

    await page.setViewportSize({ width: 320, height: 812 });
    await page.goto('/');
    await expect(page.getByLabel('可用里程 1,234,567,890')).toBeVisible();
    const pageWidth = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(pageWidth.scroll).toBeLessThanOrEqual(pageWidth.client);
  });

  test('320px and 375px navigation stay usable without horizontal overflow', async ({ page }) => {
    for (const width of [375, 320]) {
      await page.setViewportSize({ width, height: 812 });
      await page.goto('/');
      const pageWidth = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
      }));
      expect(pageWidth.scroll).toBeLessThanOrEqual(pageWidth.client);
    }

    await page.getByRole('button', { name: '打开导航菜单' }).click();
    await expect(page.getByRole('link', { name: '商城', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: '订单', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: '碳足迹', exact: true })).toBeVisible();
    await page.getByRole('link', { name: '商城', exact: true }).focus();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: '打开导航菜单' })).toBeFocused();
  });

  test('reduced motion preference removes non-essential transition duration', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    const duration = await page.getByRole('link', { name: /探索绿色好物/ }).evaluate((element) => (
      getComputedStyle(element).transitionDuration
    ));
    expect(Number.parseFloat(duration)).toBeLessThanOrEqual(0.001);
  });

  test('one saved appearance follows the member through the completed journey routes only', async ({ page }) => {
    await createAndLoginUser(page);
    await page.goto('/');
    await page.getByRole('button', { name: '玻璃外观' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-glass-mode', 'standard');

    await page.goto('/calculator');
    await expect(page.locator('nav')).toHaveClass(/journey-nav/);
    await expect(page.locator('html')).toHaveAttribute('data-glass-mode', 'standard');
    const standardResultBackground = await page.locator('.journey-surface-light').first().evaluate((element) => getComputedStyle(element).backgroundColor);
    await page.getByRole('button', { name: '玻璃外观' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-glass-mode', 'glass');
    const glassResultBackground = await page.locator('.journey-surface-light').first().evaluate((element) => getComputedStyle(element).backgroundColor);
    expect(glassResultBackground).not.toBe(standardResultBackground);

    await page.goto('/mall');
    await expect(page.locator('nav')).toHaveClass(/journey-nav/);
    await expect(page.locator('.journey-surface-light').first()).toBeVisible();
    const mallGlass = await page.locator('.journey-surface-light').first().evaluate((element) => getComputedStyle(element).backdropFilter);
    expect(mallGlass).toContain('blur(');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-glass-mode', 'glass');
    await expect.poll(() => page.locator('.journey-surface-light').first().evaluate((element) => getComputedStyle(element).backdropFilter)).toContain('blur(');

    await page.setViewportSize({ width: 320, height: 812 });
    await page.getByRole('button', { name: '打开导航菜单' }).click();
    await expect(page.getByRole('link', { name: '订单', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '退出登录' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: '打开导航菜单' })).toBeFocused();

    await page.goto('/orders');
    await expect(page.locator('nav')).toHaveClass(/journey-nav/);
    await expect(page.getByRole('button', { name: '玻璃外观' })).toBeVisible();

    await page.goto('/footprint');
    await expect(page.locator('nav')).toHaveClass(/journey-nav/);
    await expect(page.locator('.journey-surface-heavy').first()).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-glass-mode', 'glass');

    await page.goto('/login');
    await expect(page.locator('nav')).not.toHaveClass(/journey-nav|home-nav/);
    await expect(page.getByRole('button', { name: '玻璃外观' })).toHaveCount(0);
  });

  test('stage-two portals and surfaces respect reduced transparency and motion', async ({ page }) => {
    await createAndLoginUser(page);
    const session = await page.context().newCDPSession(page);
    await session.send('Emulation.setEmulatedMedia', {
      features: [
        { name: 'prefers-reduced-transparency', value: 'reduce' },
        { name: 'prefers-reduced-motion', value: 'reduce' },
      ],
    });

    await page.goto('/mall');
    const product = page.getByRole('button', { name: /共享单车骑行卡.*查看详情/ });
    await expect(product).toBeVisible();
    await expect.poll(() => page.locator('.journey-surface-light').first().evaluate((element) => getComputedStyle(element).backdropFilter)).toBe('none');
    await product.click();
    const sheet = page.getByRole('dialog');
    await expect(sheet).toHaveClass(/journey-portal-surface/);
    await expect.poll(() => sheet.evaluate((element) => getComputedStyle(element).backdropFilter)).toBe('none');
    const duration = await sheet.getByRole('button', { name: '加入购物车' }).evaluate((element) => getComputedStyle(element).transitionDuration);
    expect(Number.parseFloat(duration)).toBeLessThanOrEqual(0.001);
    await page.keyboard.press('Escape');

    await page.goto('/calculator');
    await page.getByRole('combobox', { name: '出发机场' }).click();
    const popup = page.locator('.journey-select-content');
    await expect(popup).toBeVisible();
    await expect.poll(() => popup.evaluate((element) => getComputedStyle(element).backdropFilter)).toBe('none');
  });
});
