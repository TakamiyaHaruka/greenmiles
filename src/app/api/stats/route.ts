import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import db from '@/lib/db';
import { CARBON_OFFSET_PER_TREE_KG } from '@/lib/carbon';

/**
 * Platform-wide KPI dashboard data (PRD §6).
 * Every product in the mall is a green product, so redeemed mileage is green mileage.
 * Total issued mileage = outstanding balances + everything already spent.
 */
export async function GET(request: NextRequest) {
  try {
    const payload = await getAuthUser(request);
    if (!payload) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const totals = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM orders) AS orderCount,
        (SELECT COALESCE(SUM(p.mileage_cost * o.quantity), 0)
           FROM orders o JOIN products p ON o.product_id = p.id) AS greenMilesSpent,
        (SELECT COUNT(*) FROM orders o
           JOIN products p ON o.product_id = p.id
           WHERE p.category = 'carbon') AS treeCount,
        (SELECT COALESCE(SUM(miles_balance), 0) FROM users) AS outstandingMiles,
        (SELECT COALESCE(SUM(co2_kg), 0) FROM carbon_records WHERE user_id = ?) AS userCo2Kg
    `).get(payload.userId) as {
      orderCount: number;
      greenMilesSpent: number;
      treeCount: number;
      outstandingMiles: number;
      userCo2Kg: number;
    };

    const issuedMiles = totals.greenMilesSpent + totals.outstandingMiles;
    const conversionRate = issuedMiles > 0 ? totals.greenMilesSpent / issuedMiles : 0;

    const monthlyRows = db.prepare(`
      SELECT strftime('%Y-%m', o.created_at) AS month,
             COALESCE(SUM(p.mileage_cost * o.quantity), 0) AS milesSpent,
             COALESCE(SUM(CASE WHEN p.category = 'carbon' THEN 1 ELSE 0 END), 0) AS trees
      FROM orders o JOIN products p ON o.product_id = p.id
      GROUP BY month ORDER BY month DESC LIMIT 6
    `).all() as Array<{ month: string; milesSpent: number; trees: number }>;

    return NextResponse.json({
      data: {
        orderCount: totals.orderCount,
        greenMilesSpent: totals.greenMilesSpent,
        unspentMiles: issuedMiles - totals.greenMilesSpent,
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
