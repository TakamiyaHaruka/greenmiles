import { test, expect } from '@playwright/test';
import { createAndLoginUser } from './helpers';

async function openCart(page: import('@playwright/test').Page) {
  await page
    .locator('nav')
    .getByRole('button')
    .filter({ has: page.locator('svg.lucide-shopping-cart') })
    .click();
}

async function expectDialogFitsViewport(page: import('@playwright/test').Page) {
  await expect.poll(async () => {
    const box = await page.getByRole('dialog').boundingBox();
    return box !== null && box.x >= -1 && box.x + box.width <= 321;
  }).toBe(true);
}

test.describe('journey 3+4 — redeem with miles and see the order', () => {
  test('add to cart, settle, get voucher with QR, balance drops, order appears', async ({ page }) => {
    await createAndLoginUser(page);

    const initialProductsResponse = await page.request.get('/api/products');
    expect(initialProductsResponse.ok()).toBe(true);
    const initialProducts = await initialProductsResponse.json() as { data: Array<{ name: string; stock: number }> };
    const initialHotel = initialProducts.data.find((product) => product.name === '酒店 50 元券');
    expect(initialHotel).toBeDefined();

    // Mall loads seeded products
    await page.goto('/mall');
    await expect(page.getByRole('heading', { name: '绿色商城' })).toBeVisible();
    await expect(page.getByText('酒店 50 元券')).toBeVisible();

    // Open product detail and add to cart
    await page.getByText('酒店 50 元券').first().click();
    await expect(page.getByRole('dialog').getByText('酒店 50 元券')).toBeVisible();
    await page.getByRole('button', { name: '加入购物车' }).click();

    // Cart badge shows 1 item
    await expect(page.locator('nav').getByText('1', { exact: true })).toBeVisible();

    // Open cart and settle (2,000 miles)
    await openCart(page);
    await expect(page.getByRole('dialog').getByText('购物车')).toBeVisible();
    await page.getByRole('button', { name: '结算' }).click();
    const catalogRefresh = page.waitForResponse((response) =>
      response.url().endsWith('/api/products')
      && response.request().method() === 'GET'
      && response.ok()
    );
    await page.getByRole('button', { name: '确认兑换' }).click();
    const refreshedProducts = await catalogRefresh;
    const refreshedPayload = await refreshedProducts.json() as { data: Array<{ name: string; stock: number }> };
    const refreshedHotel = refreshedPayload.data.find((product) => product.name === '酒店 50 元券');
    expect(refreshedHotel).toBeDefined();
    expect(refreshedHotel!.stock).toBeLessThan(initialHotel!.stock);

    // Voucher with code and QR code
    await expect(page.getByText('兑换成功')).toBeVisible();
    await expect(page.getByText('酒店优惠券码')).toBeVisible();
    // QRCodeSVG is the only svg exposing role="img" in the dialog
    await expect(page.getByRole('dialog').getByRole('img')).toBeVisible();

    // Balance dropped 10,000 → 8,000
    await expect(page.locator('nav').getByText('8,000')).toBeVisible();

    // Close the voucher and cart without navigating, then prove the refreshed response reached the detail UI.
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog').getByRole('heading', { name: '购物车', exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await page.getByText('酒店 50 元券').first().click();
    await expect(page.getByRole('dialog').getByText(`库存: ${refreshedHotel!.stock}`)).toBeVisible();
    await page.keyboard.press('Escape');

    // The order remains available through the primary navigation.
    await page.getByRole('link', { name: '订单', exact: true }).click();
    await expect(page).toHaveURL(/\/orders/);
    await expect(page.getByText('酒店 50 元券').first()).toBeVisible();
  });

  for (const conflict of [
    { error: '商品库存不足', code: 'OUT_OF_STOCK', outcome: 'out-of-stock' },
    { error: '商品不存在', code: 'PRODUCT_NOT_FOUND', outcome: 'removed' },
  ] as const) {
    test(`a ${conflict.error} settlement refreshes the catalog and preserves the error`, async ({ page }) => {
      await createAndLoginUser(page);
      let conflictReturned = false;
      await page.route('**/api/products', async (route) => {
        const response = await route.fetch();
        const body = await response.json() as { data: Array<Record<string, unknown>> };
        const products = conflictReturned
          ? conflict.outcome === 'removed'
            ? body.data.filter((product) => product.id !== 1)
            : body.data.map((product) => product.id === 1 ? { ...product, stock: 0 } : product)
          : body.data.map((product) => product.id === 1 ? { ...product, stock: 2 } : product);
        await route.fulfill({ response, json: { ...body, data: products } });
      });
      await page.route('**/api/orders', async (route) => {
        conflictReturned = true;
        await route.fulfill({
          status: conflict.error === '商品不存在' ? 404 : 400,
          contentType: 'application/json',
          body: JSON.stringify({ error: conflict.error, code: conflict.code }),
        });
      });

      await page.goto('/mall');
      const product = page.getByRole('button', { name: /共享单车骑行卡.*查看详情/ });
      await product.click();
      await page.getByRole('button', { name: '加入购物车' }).click();
      await openCart(page);
      await page.getByRole('button', { name: '结算' }).click();
      const catalogRefresh = page.waitForResponse((response) => (
        response.url().endsWith('/api/products')
        && response.request().method() === 'GET'
        && response.ok()
      ));
      await page.getByRole('button', { name: '确认兑换' }).click();

      await expect(page.getByText(conflict.error, { exact: true })).toBeVisible();
      await catalogRefresh;
      await page.keyboard.press('Escape');
      await page.keyboard.press('Escape');

      if (conflict.outcome === 'removed') {
        await expect(product).toHaveCount(0);
      } else {
        await expect(page.getByRole('button', { name: /共享单车骑行卡，暂时无货，查看详情/ })).toBeVisible();
      }
    });
  }

  test('physical item keeps address validation and multiple-quantity settlement on a narrow screen', async ({ page }) => {
    await createAndLoginUser(page);
    await page.setViewportSize({ width: 320, height: 812 });
    await page.goto('/mall');
    await page.getByRole('tab', { name: '实体' }).click();
    await expect(page.getByRole('button', { name: /帆布袋.*查看详情/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /共享单车骑行卡/ })).toHaveCount(0);

    const product = page.getByRole('button', { name: /帆布袋.*查看详情/ });
    await product.click();
    await expect(page.getByRole('dialog')).toHaveClass(/journey-portal-surface/);
    await expectDialogFitsViewport(page);
    await page.keyboard.press('Escape');
    await expect(product).toBeFocused();
    await product.click();
    await page.getByRole('button', { name: '加入购物车' }).click();
    await expect(page.getByText('请输入姓名')).toBeVisible();
    await page.getByLabel(/姓名/).fill('测试用户');
    await page.getByLabel(/手机号/).fill('13800138000');
    await page.getByLabel(/详细地址/).fill('北京市朝阳区测试街 1 号');
    await page.getByRole('button', { name: '加入购物车' }).click();

    await product.click();
    await page.getByLabel(/姓名/).fill('测试用户');
    await page.getByLabel(/手机号/).fill('13800138000');
    await page.getByLabel(/详细地址/).fill('北京市朝阳区测试街 1 号');
    await page.getByRole('button', { name: '加入购物车' }).click();
    await openCart(page);
    await expect(page.getByRole('dialog').getByText('帆布袋 × 2')).toBeVisible();
    await expectDialogFitsViewport(page);
    await page.getByRole('button', { name: '结算' }).click();
    await expect(page.getByRole('dialog')).toHaveClass(/journey-portal-surface/);
    await expect(page.getByRole('dialog').getByText(/1,000 里程兑换.*帆布袋 × 2/)).toBeVisible();
    await expectDialogFitsViewport(page);
    await page.getByRole('button', { name: '确认兑换' }).click();
    await expect(page.getByText('兑换成功')).toBeVisible();
    await expect(page.getByText('待发货')).toBeVisible();
    await expect(page.locator('nav').getByText('9,000')).toBeVisible();
    await expectDialogFitsViewport(page);

    const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
    expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client);
    await page.getByRole('button', { name: '查看订单' }).click();
    await expect(page).toHaveURL(/\/orders$/);
    await expect(page.getByText('帆布袋 × 2')).toBeVisible();
  });

  test('cart caps quantity at stock and supports accessible decrement controls at 320px', async ({ page }) => {
    await createAndLoginUser(page);
    await page.setViewportSize({ width: 320, height: 812 });
    await page.route('**/api/products', async (route) => {
      const response = await route.fetch();
      const body = await response.json() as { data: Array<Record<string, unknown>> };
      await route.fulfill({
        response,
        json: {
          ...body,
          data: body.data.map((product) =>
            product.id === 1 ? { ...product, stock: 2 } : product
          ),
        },
      });
    });

    await page.goto('/mall');
    const product = page.getByRole('button', { name: /共享单车骑行卡.*查看详情/ });

    await product.click();
    await page.getByRole('button', { name: '加入购物车' }).click();
    await product.click();
    await page.getByRole('button', { name: '加入购物车' }).click();
    await expect(page.locator('nav').getByText('2', { exact: true })).toBeVisible();

    await product.click();
    await expect(page.getByRole('button', { name: '已达库存上限' })).toBeDisabled();
    await page.keyboard.press('Escape');

    await openCart(page);
    const cart = page.getByRole('dialog');
    const decrease = cart.getByRole('button', { name: '减少 共享单车骑行卡 数量' });
    const increase = cart.getByRole('button', { name: '增加 共享单车骑行卡 数量' });

    await expect(cart.getByRole('status', { name: '共享单车骑行卡 当前数量 2' })).toHaveText('2');
    await expect(cart.getByText('已达库存上限')).toBeVisible();
    await expect(increase).toBeDisabled();
    await expect(decrease).toBeEnabled();
    await expectDialogFitsViewport(page);

    await decrease.focus();
    await page.keyboard.press('Enter');
    await expect(cart.getByRole('status', { name: '共享单车骑行卡 当前数量 1' })).toHaveText('1');
    await expect(decrease).toBeDisabled();
    await expect(increase).toBeEnabled();
    await expect(
      cart.getByText('总计', { exact: true }).locator('..').getByText('1,200 里程', { exact: true })
    ).toBeVisible();
    await expect(page.locator('nav').getByText('1', { exact: true })).toBeVisible();

    const dimensions = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client);
  });

  test('cart explains and enforces the ten-item order limit', async ({ page }) => {
    await createAndLoginUser(page);
    await page.route('**/api/products', async (route) => {
      const response = await route.fetch();
      const body = await response.json() as { data: Array<Record<string, unknown>> };
      await route.fulfill({
        response,
        json: {
          ...body,
          data: body.data.map((product) =>
            product.id === 1 ? { ...product, stock: 12 } : product
          ),
        },
      });
    });

    await page.goto('/mall');
    const product = page.getByRole('button', { name: /共享单车骑行卡.*查看详情/ });
    for (let quantity = 0; quantity < 10; quantity += 1) {
      await product.click();
      await page.getByRole('button', { name: '加入购物车' }).click();
    }

    await product.click();
    await expect(page.getByRole('button', { name: '单笔最多 10 件' })).toBeDisabled();
    await page.keyboard.press('Escape');

    await openCart(page);
    const cart = page.getByRole('dialog');
    await expect(cart.getByText('单笔最多 10 件')).toBeVisible();
    await expect(cart.getByRole('button', { name: '增加 共享单车骑行卡 数量' })).toBeDisabled();
  });

  test('list request failure is distinct from an empty category and can retry', async ({ page }) => {
    await createAndLoginUser(page);
    await page.route('**/api/products', (route) => route.fulfill({ status: 503, body: '{}' }));
    await page.goto('/mall');
    await expect(page.getByRole('alert').getByText('商品暂时无法加载')).toBeVisible();
    await page.unroute('**/api/products');
    await page.getByRole('button', { name: '重试' }).click();
    await expect(page.getByRole('button', { name: /共享单车骑行卡.*查看详情/ })).toBeVisible();

    await page.route('**/api/products', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{"data":[]}' }));
    await page.reload();
    await expect(page.getByText('暂无商品', { exact: true })).toBeVisible();
    await expect(page.getByText('商品暂时无法加载')).toHaveCount(0);

    await page.unroute('**/api/products');
    await page.route('**/api/products', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{"data":{}}' }));
    await page.reload();
    await expect(page.getByRole('alert').getByText('商品暂时无法加载')).toBeVisible();
  });
});
