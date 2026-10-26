import { expect, test } from '@playwright/test';
import { adminLoginViaApi, createAndLoginUser } from './helpers';

const timestamps = [
  '2026-10-26 12:00:00',
  '2026-10-26 20:30:00',
  '2026-10-26 01:30:00',
  '2026-03-08 06:59:59',
  '2026-03-08T07:00:00Z',
  '2026-11-01T01:59:59-04:00',
  '2026-11-01 06:00:00',
];

// Fixed expectations check the rendered pages independently of the formatter.
const timezones = [
  {
    id: 'UTC',
    expected: [
      '2026/10/26 12:00:00', '2026/10/26 20:30:00', '2026/10/26 01:30:00',
      '2026/03/08 06:59:59', '2026/03/08 07:00:00',
      '2026/11/01 05:59:59', '2026/11/01 06:00:00',
    ],
  },
  {
    id: 'Asia/Hong_Kong',
    expected: [
      '2026/10/26 20:00:00', '2026/10/27 04:30:00', '2026/10/26 09:30:00',
      '2026/03/08 14:59:59', '2026/03/08 15:00:00',
      '2026/11/01 13:59:59', '2026/11/01 14:00:00',
    ],
  },
  {
    id: 'America/New_York',
    expected: [
      '2026/10/26 08:00:00', '2026/10/26 16:30:00', '2026/10/25 21:30:00',
      '2026/03/08 01:59:59', '2026/03/08 03:00:00',
      '2026/11/01 01:59:59', '2026/11/01 01:00:00',
    ],
  },
  {
    id: 'Asia/Kathmandu',
    expected: [
      '2026/10/26 17:45:00', '2026/10/27 02:15:00', '2026/10/26 07:15:00',
      '2026/03/08 12:44:59', '2026/03/08 12:45:00',
      '2026/11/01 11:44:59', '2026/11/01 11:45:00',
    ],
  },
];

for (const timezone of timezones) {
  test.describe(`时间显示 — ${timezone.id}`, () => {
    test.use({ timezoneId: timezone.id });

    test('会员订单、余额流水和后台在跨日及夏令时边界显示一致', async ({ page }) => {
      await createAndLoginUser(page);
      await adminLoginViaApi(page);

      const orders = timestamps.map((created_at, index) => ({
        id: index + 1,
        user_id: 1,
        email: 'timezone@e2e.test',
        product_name: `时区样本 ${index + 1}`,
        category: 'physical',
        icon_type: 'bag',
        status: 'completed',
        quantity: 1,
        mileage_cost: 500,
        voucher_code: `TIMEZONE-${index + 1}`,
        address: null,
        created_at,
      }));

      await page.route('**/api/orders', (route) => route.fulfill({ json: { data: orders } }));
      await page.route('**/api/admin/orders', (route) => route.fulfill({ json: { data: orders } }));
      await page.route('**/api/miles', (route) => route.fulfill({
        json: {
          data: {
            balance: 6500,
            transactions: timestamps.map((created_at, index) => ({
              id: index + 1, amount: -500, type: 'redeem', order_id: index + 1,
              description: `时区流水 ${index + 1}`, created_at,
            })),
          },
        },
      }));

      await page.goto('/orders');
      const memberTimes: string[] = [];
      for (const [index, expected] of timezone.expected.entries()) {
        const date = page.getByLabel(`订单 ${orders[index].product_name} 状态区`).getByText(expected, { exact: true });
        await expect(date).toBeVisible();
        memberTimes.push((await date.textContent())!);
      }

      await page.getByRole('tab', { name: '余额明细' }).click();
      for (const [index, expected] of timezone.expected.entries()) {
        const transaction = page.getByText(`时区流水 ${index + 1}`, { exact: true }).locator('..');
        const date = transaction.getByText(expected, { exact: true });
        await expect(date).toBeVisible();
        await expect(date).toHaveText(memberTimes[index]);
      }

      await page.goto('/admin');
      await page.getByRole('tab', { name: '订单管理' }).click();
      for (const [index, expected] of timezone.expected.entries()) {
        const row = page.getByRole('row').filter({ hasText: orders[index].product_name });
        const date = row.getByRole('cell', { name: expected, exact: true });
        await expect(date).toBeVisible();
        await expect(date).toHaveText(memberTimes[index]);
      }
    });
  });
}
