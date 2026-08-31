import { expect, type Page } from '@playwright/test';

// Every test gets its own user so parallel runs never collide
// on the shared E2E database.
export function uniqueEmail(prefix = 'user') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@e2e.test`;
}

export async function registerViaApi(page: Page, email: string, password = 'password123') {
  const res = await page.request.post('/api/auth/register', {
    data: { email, password, confirmPassword: password },
  });
  // 201 = created; 409 would mean a collision (should not happen with unique emails)
  expect([201, 409]).toContain(res.status());
}

export async function loginViaApi(page: Page, email: string, password = 'password123') {
  const res = await page.request.post('/api/auth/login', {
    data: { email, password },
  });
  expect(res.status()).toBe(200);
}

/** Create a fresh user and log in via API (shares the page's cookie jar). */
export async function createAndLoginUser(page: Page) {
  const email = uniqueEmail();
  await registerViaApi(page, email);
  await loginViaApi(page, email);
  return email;
}

/** Establish an admin console session via API (shares the page's cookie jar). */
export async function adminLoginViaApi(page: Page) {
  const res = await page.request.post('/api/admin/login', {
    data: { password: process.env.ADMIN_PASSWORD || 'e2e-admin-secret' },
  });
  expect(res.status()).toBe(200);
}
