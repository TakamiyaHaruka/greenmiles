// Regenerates the README screenshots into docs/screenshots/.
// Usage: start the app (npm run dev -p 3100), then
//   ADMIN_PASSWORD=<from .env.local> node scripts/screenshot.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.SHOT_BASE || 'http://localhost:3100';
const OUT_DIR = path.join(process.cwd(), 'docs', 'screenshots');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

async function waitForServer() {
  for (let i = 0; i < 90; i++) {
    try {
      // /login is public; API routes now answer 401 JSON when unauthenticated
      const res = await fetch(`${BASE}/login`);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`server not ready at ${BASE}`);
}

async function main() {
  await waitForServer();
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  // Anonymous views
  await page.goto(`${BASE}/`, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT_DIR, 'landing.png') });

  await page.goto(`${BASE}/login`, { waitUntil: 'load' });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT_DIR, 'login.png') });

  // Demo member session (register is idempotent: 409 when the user exists)
  const email = 'demo@greenmiles.com';
  const password = 'demo123456';
  await page.request
    .post(`${BASE}/api/auth/register`, { data: { email, password, confirmPassword: password } })
    .catch(() => {});
  const login = await page.request.post(`${BASE}/api/auth/login`, { data: { email, password } });
  if (!login.ok()) throw new Error(`member login failed: ${login.status()}`);

  // Seed demo activity so the dashboard charts show real numbers
  await page.request.post(`${BASE}/api/carbon`, { data: { distance: 1075, aircraftType: 'NARROW_STANDARD', cabinClass: 'Y' } });
  await page.request.post(`${BASE}/api/carbon`, { data: { distance: 1888, aircraftType: 'WIDE_EFFICIENT', cabinClass: 'C' } });
  await page.request.post(`${BASE}/api/orders`, { data: { productId: 3, quantity: 1 } });
  await page.request.post(`${BASE}/api/orders`, { data: { productId: 1, quantity: 1 } });
  await page.request.post(`${BASE}/api/orders`, { data: { productId: 2, quantity: 1 } });
  await page.request.post(`${BASE}/api/orders`, {
    data: { productId: 4, quantity: 1, address: '林青，13800138000，北京市朝阳区望京街道 8 号' },
  });

  // Member dashboard with real KPIs
  await page.goto(`${BASE}/`, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT_DIR, 'dashboard.png') });

  // Calculator with an imported flight + cabin selection
  await page.goto(`${BASE}/calculator`, { waitUntil: 'load' });
  await page.fill('#flightNo', 'ca1501');
  await page.getByRole('button', { name: /查询/ }).click();
  await page.waitForTimeout(600); // let the import prefill route, distance and aircraft
  // combobox order: 0=dep, 1=arr, 2=aircraft, 3=cabin
  await page.getByRole('combobox').nth(2).click();
  await page.getByRole('option', { name: '窄体高效机型', exact: true }).click();
  await page.waitForTimeout(400); // let the popover finish closing before opening the next one
  await page.getByRole('combobox').nth(3).click();
  await page.getByRole('option', { name: '经济舱', exact: true }).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT_DIR, 'calculator.png') });

  // Mall
  await page.goto(`${BASE}/mall`, { waitUntil: 'load' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT_DIR, 'mall.png') });

  // Orders with vouchers
  await page.goto(`${BASE}/orders`, { waitUntil: 'load' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT_DIR, 'orders.png') });

  // Admin console in a separate session
  if (ADMIN_PASSWORD) {
    const adminContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    const adminPage = await adminContext.newPage();
    const adminLogin = await adminPage.request.post(`${BASE}/api/admin/login`, {
      data: { password: ADMIN_PASSWORD },
    });
    if (!adminLogin.ok()) throw new Error(`admin login failed: ${adminLogin.status()}`);
    await adminPage.goto(`${BASE}/admin`, { waitUntil: 'load' });
    await adminPage.waitForTimeout(800);
    await adminPage.screenshot({ path: path.join(OUT_DIR, 'admin.png') });
    await adminContext.close();
  }

  await browser.close();
  console.log(`screenshots written to ${OUT_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
