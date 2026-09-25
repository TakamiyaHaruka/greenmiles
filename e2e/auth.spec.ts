import { test, expect } from '@playwright/test';
import { uniqueEmail } from './helpers';

test.describe('journey 1 — register & login', () => {
  test('register via UI, then log in and see the 10,000 miles balance', async ({ page }) => {
    const email = uniqueEmail('ui');

    // Register
    await page.goto('/register');
    await expect(page.locator('nav')).toHaveClass(/journey-nav/);
    await expect(page.getByRole('heading', { name: '创建账号' })).toBeVisible();
    await page.getByLabel(/邮箱/).fill(email);
    await page.getByLabel(/^密码/).fill('password123');
    await page.getByLabel(/确认密码/).fill('password123');
    await page.getByRole('button', { name: '注册' }).click();
    await expect(page.getByText('注册成功，请登录')).toBeVisible();

    // Switch to login
    await page.getByRole('link', { name: '立即登录' }).click();
    await expect(page).toHaveURL(/\/login/);

    // Log in
    await page.getByLabel(/邮箱/).fill(email);
    await page.getByLabel(/^密码/).fill('password123');
    await page.getByRole('button', { name: '登录' }).click();

    // Redirected to home with the seeded balance in the navbar
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('nav').getByText('10,000')).toBeVisible();
  });

  test('wrong password shows the error message', async ({ page }) => {
    const email = uniqueEmail('wrongpw');
    await page.request.post('/api/auth/register', {
      data: { email, password: 'password123', confirmPassword: 'password123' },
    });

    await page.goto('/login');
    await page.getByLabel(/邮箱/).fill(email);
    await page.getByLabel(/^密码/).fill('wrong-password');
    await page.getByRole('button', { name: '登录' }).click();

    await expect(page.getByRole('alert').filter({ hasText: '邮箱或密码错误' })).toBeVisible();
  });

  test('auth validation is associated and the saved appearance survives narrow-screen navigation', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 812 });
    await page.goto('/register');

    await page.getByRole('button', { name: '注册' }).click();
    await expect(page.locator('#email')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#email-error')).toBeVisible();

    await page.getByLabel(/邮箱/).fill('validation@e2e.test');
    await page.getByLabel(/^密码/).fill('short');
    await page.getByLabel(/确认密码/).fill('different');
    await page.getByRole('button', { name: '注册' }).click();
    await expect(page.locator('#password')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#password-error')).toBeVisible();

    await page.getByRole('button', { name: '玻璃外观' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-glass-mode', 'standard');
    await page.getByRole('link', { name: '立即登录' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-glass-mode', 'standard');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-glass-mode', 'standard');

    await page.getByRole('button', { name: '打开导航菜单' }).click();
    await expect(page.getByRole('link', { name: '商城', exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: '打开导航菜单' })).toBeFocused();

    const pageWidth = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(pageWidth.scroll).toBeLessThanOrEqual(pageWidth.client);
  });
});

test.describe('route guard', () => {
  test('unauthenticated visit to /orders redirects to /login', async ({ page }) => {
    await page.goto('/orders');
    await page.waitForURL(/\/login\?from=/);
    await expect(page).toHaveURL(/\/login\?from=%2Forders/);
  });
});
