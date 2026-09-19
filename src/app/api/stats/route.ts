import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import db from '@/lib/db';
import { CARBON_OFFSET_PER_TREE_KG } from '@/lib/carbon';

/**
 * Platform-wide KPI dashboard data (PRD §6).
 * Every product in the mall is a green product, so net ledger redemptions are
 * green mileage. Total issued mileage = outstanding balances + net spending.
 */
export async function GET(request: NextRequest) {
  try {
    const payload = await getAuthUser(request);
    if (!payload) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const totals = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM orders WHERE status != 'cancelled') AS orderCount,
        (SELECT COALESCE(-SUM(t.amount), 0) FROM miles_transactions t
           WHERE t.type IN ('redeem', 'refund')
             AND NOT EXISTS (
               SELECT 1 FROM orders cancelled
               WHERE cancelled.id = t.order_id AND cancelled.status = 'cancelled'
             )) AS greenMilesSpent,
        (SELECT COALESCE(SUM(quantity), 0) FROM orders
           WHERE voucher_code LIKE 'TREE-%' AND status != 'cancelled') AS treeCount,
        (SELECT COALESCE(SUM(miles_balance), 0) FROM users) AS outstandingMiles,
        (SELECT COALESCE(SUM(co2_kg), 0) FROM carbon_records WHERE user_id = ?) AS userCo2Kg
    `).get(payload.userId) as {
      orderCount: number;
      greenMilesSpent: number;
      treeCount: number;
      outstandingMiles: number;
      userCo2Kg: number;
    };

    const greenMilesSpent = Math.max(0, totals.greenMilesSpent);
    const issuedMiles = greenMilesSpent + totals.outstandingMiles;
    const conversionRate = issuedMiles > 0 ? greenMilesSpent / issuedMiles : 0;

    const monthlyRows = db.prepare(`
      WITH monthly_activity AS (
        SELECT strftime('%Y-%m', created_at) AS month,
               -SUM(amount) AS milesSpent,
               0 AS trees
        FROM miles_transactions t
        WHERE t.type IN ('redeem', 'refund')
          AND NOT EXISTS (
            SELECT 1 FROM orders cancelled
            WHERE cancelled.id = t.order_id AND cancelled.status = 'cancelled'
          )
        GROUP BY month
        UNION ALL
        SELECT strftime('%Y-%m', created_at) AS month,
               0 AS milesSpent,
               SUM(quantity) AS trees
        FROM orders
        WHERE voucher_code LIKE 'TREE-%' AND status != 'cancelled'
        GROUP BY month
      )
      SELECT month, COALESCE(SUM(milesSpent), 0) AS milesSpent,
             COALESCE(SUM(trees), 0) AS trees
      FROM monthly_activity
      GROUP BY month ORDER BY month DESC LIMIT 6
    `).all() as Array<{ month: string; milesSpent: number; trees: number }>;

    return NextResponse.json({
      data: {
        orderCount: totals.orderCount,
        greenMilesSpent,
        unspentMiles: issuedMiles - greenMilesSpent,
        conversionRate: Math.round(conversionRate * 1000) / 1000,
        totalCo2OffsetKg: totals.treeCount * CARBON_OFFSET_PER_TREE_KG,
        userCo2Kg: Math.round(totals.userCo2Kg * 100) / 100,
        monthly: monthlyRows
          .reverse()
          .map((row) => ({
            month: row.month,
            milesSpent: row.milesSpent,
            offsetKg: row.trees * CARBON_OFFSET_PER_TREE_KG,
          })),
      },
    });
  } catch {
    return NextResponse.json({ error: '获取统计数据失败' }, { status: 500 });
  }
}
