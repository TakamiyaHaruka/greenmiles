import { expect, test, type Page } from '@playwright/test';
import Database from 'better-sqlite3';
import path from 'node:path';
import { adminLoginViaApi, createAndLoginUser } from './helpers';

async function createOrder(page: Page, category: 'physical' | 'virtual' = 'physical', quantity = 1) {
  const name = `历史金额-${category}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const created = await page.request.post('/api/admin/products', {
    data: { name, description: '历史订单金额验证', category, mileage_cost: 500, stock: 20, icon_type: category === 'virtual' ? 'bike' : 'bag' },
  });
  expect(created.status()).toBe(201);
  const product = (await created.json()).data;
  const response = await page.request.post('/api/orders', {
    data: { productId: product.id, expectedUnitCost: 500, quantity, address: '测试收件人（虚构），测试联系电话（虚构），测试收货地址（虚构）' },
  });
  expect(response.status()).toBe(200);
  return { product: product as { id: number; name: string }, order: (await response.json()).data as { id: number } };
}

async function reprice(page: Page, productId: number, price: number) {
  const products = (await (await page.request.get('/api/admin/products')).json()).data;
  const current = products.find((product: { id: number }) => product.id === productId);
  expect(current).toBeTruthy();
  expect((await page.request.put(`/api/admin/products/${productId}`, { data: { ...current, mileage_cost: price } })).status()).toBe(200);
}

async function expectApiAmount(page: Page, id: number, amount: number | null) {
  for (const endpoint of ['/api/orders', '/api/admin/orders']) {
    const response = await page.request.get(endpoint);
    expect(response.status()).toBe(200);
    const rows = (await response.json()).data as Array<{ id: number; mileage_cost: number | null }>;
    expect(rows.filter((row) => row.id === id)).toHaveLength(1);
    expect(rows.find((row) => row.id === id)?.mileage_cost).toBe(amount);
  }
}

test.beforeEach(async ({ page }) => {
  await createAndLoginUser(page);
  await adminLoginViaApi(page);
});

test('500 里程兑换后改价为 800，会员和后台保留原额，取消仍只退 500', async ({ page }) => {
  const { product, order } = await createOrder(page);
  await reprice(page, product.id, 800);
  await expectApiAmount(page, order.id, 500);
  await page.goto('/orders');
  const card = page.getByLabel(`订单 ${product.name} 状态区`);
  await expect(card.getByText('-500 里程', { exact: true })).toBeVisible();
  await expect(card.getByText('-800 里程', { exact: true })).toHaveCount(0);
  await card.getByRole('button', { name: `取消订单 ${product.name}` }).click();
  await page.getByRole('dialog', { name: '确认取消订单' }).getByRole('button', { name: '确认取消' }).click();
  await expect(card.getByText('已取消', { exact: true })).toBeVisible();
  await expect(card.getByText('-500 里程', { exact: true })).toBeVisible();
  await expect(page.locator('nav').getByText('10,000')).toBeVisible();
  const ledger = (await (await page.request.get('/api/miles')).json()).data;
  expect(ledger.transactions.filter((row: { order_id: number; type: string }) => row.order_id === order.id && row.type === 'refund'))
    .toMatchObject([{ amount: 500 }]);
  await expectApiAmount(page, order.id, 500);
  await page.goto('/admin');
  await page.getByRole('tab', { name: '订单管理' }).click();
  const row = page.getByRole('row').filter({ hasText: product.name });
  await expect(row.getByRole('cell', { name: '500', exact: true })).toBeVisible();
  await expect(row.getByText('已取消', { exact: true })).toBeVisible();
});

test('两件订单总额为 1000，改价和发货返回值均不重复乘数量', async ({ page }) => {
  const { product, order } = await createOrder(page, 'physical', 2);
  await reprice(page, product.id, 800);
  await expectApiAmount(page, order.id, 1000);
  for (const status of ['shipped', 'completed']) {
    const response = await page.request.patch(`/api/admin/orders/${order.id}`, { data: { status } });
    expect(response.status()).toBe(200);
    expect((await response.json()).data).toMatchObject({ status, mileage_cost: 1000 });
  }
  await page.goto('/orders');
  await expect(page.getByLabel(`订单 ${product.name} 状态区`).getByText('-1,000 里程', { exact: true })).toBeVisible();
  await page.goto('/admin');
  await page.getByRole('tab', { name: '订单管理' }).click();
  const row = page.getByRole('row').filter({ hasText: product.name });
  await expect(row.getByRole('cell', { name: '1,000', exact: true })).toBeVisible();
  await expect(row.getByText('已完成', { exact: true })).toBeVisible();
});

test('凭证海报使用原额，异常流水只降级该订单金额且后台同样可读', async ({ page }) => {
  await page.addInitScript(() => {
    const target = window as unknown as Window & { orderPosterText: string[] };
    target.orderPosterText = [];
    const original = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text, x, y, maxWidth) {
      target.orderPosterText.push(text);
      if (maxWidth === undefined) original.call(this, text, x, y);
      else original.call(this, text, x, y, maxWidth);
    };
  });
  const { product, order } = await createOrder(page, 'virtual');
  const valid = await createOrder(page);
  await reprice(page, product.id, 800);
  await page.goto('/orders');
  let card = page.getByLabel(`订单 ${product.name} 状态区`);
  await expect(card.getByText('-500 里程', { exact: true })).toBeVisible();
  await card.getByRole('button', { name: '查看凭证' }).click();
  let dialog = page.getByRole('dialog', { name: '凭证详情' });
  await page.evaluate(() => { (window as unknown as Window & { orderPosterText: string[] }).orderPosterText = []; });
  let download = page.waitForEvent('download');
  await dialog.getByRole('button', { name: '下载券码海报', exact: true }).click();
  await download;
  expect(await page.evaluate(() => (window as unknown as Window & { orderPosterText: string[] }).orderPosterText)).toContain('500 里程');
  await page.keyboard.press('Escape');

  // Isolated test database only: duplicate a debit to simulate untrustworthy history.
  const db = new Database(path.join(process.cwd(), 'e2e', 'greenmiles-e2e.db'));
  let duplicateId: number | bigint | undefined;
  try {
    duplicateId = db.prepare(`INSERT INTO miles_transactions (user_id, order_id, amount, type, description)
      SELECT user_id, order_id, amount, type, description FROM miles_transactions
      WHERE order_id = ? AND type = 'redeem'`).run(order.id).lastInsertRowid;
    await expectApiAmount(page, order.id, null);
    await page.reload();
    card = page.getByLabel(`订单 ${product.name} 状态区`);
    await expect(card.getByText('金额暂不可用', { exact: true })).toBeVisible();
    await expect(page.getByLabel(`订单 ${valid.product.name} 状态区`).getByText('-500 里程', { exact: true })).toBeVisible();
    await card.getByRole('button', { name: '查看凭证' }).click();
    dialog = page.getByRole('dialog', { name: '凭证详情' });
    await page.evaluate(() => { (window as unknown as Window & { orderPosterText: string[] }).orderPosterText = []; });
    download = page.waitForEvent('download');
    await dialog.getByRole('button', { name: '下载券码海报', exact: true }).click();
    await download;
    const text = await page.evaluate(() => (window as unknown as Window & { orderPosterText: string[] }).orderPosterText);
    expect(text).toContain('金额暂不可用');
    expect(text).not.toContain('800 里程');
    expect(text).not.toContain('0 里程');
    await page.goto('/admin');
    await page.getByRole('tab', { name: '订单管理' }).click();
    await expect(page.getByRole('row').filter({ hasText: product.name }).getByText('金额暂不可用', { exact: true })).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: valid.product.name }).getByRole('cell', { name: '500', exact: true })).toBeVisible();
  } finally {
    if (duplicateId !== undefined) {
      db.prepare("DELETE FROM miles_transactions WHERE id = ? AND order_id = ? AND type = 'redeem'").run(duplicateId, order.id);
    }
    db.close();
  }
});
