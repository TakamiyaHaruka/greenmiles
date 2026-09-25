import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { projectedOffsetKg } from '@/lib/carbon';
import db from '@/lib/db';

interface ImpactSummaryRow {
  flightCount: number;
  totalCo2Kg: number;
  netMilesAmount: number;
  treeCount: number;
  certificateCount: number;
}

interface MilestoneRow {
  firstFlightAt: string | null;
  firstTreeAt: string | null;
  firstRideAt: string | null;
}

interface CertificateSourceRow {
  sourceType: 'tree' | 'bike' | 'hotel';
  productName: string;
  quantity: number;
  createdAt: string;
}

/** All-time, privacy-safe impact summary for the signed-in member. */
export async function GET(request: NextRequest) {
  try {
    const payload = await getAuthUser(request);
    if (!payload) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const summary = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM carbon_records WHERE user_id = ?) AS flightCount,
        (SELECT COALESCE(SUM(co2_kg), 0) FROM carbon_records WHERE user_id = ?) AS totalCo2Kg,
        (SELECT COALESCE(SUM(t.amount), 0) FROM miles_transactions t
           WHERE t.user_id = ? AND t.type IN ('redeem', 'refund')
             AND NOT EXISTS (
               SELECT 1 FROM orders cancelled
               WHERE cancelled.id = t.order_id AND cancelled.status = 'cancelled'
             )) AS netMilesAmount,
        (SELECT COALESCE(SUM(quantity), 0) FROM orders
           WHERE user_id = ? AND status != 'cancelled' AND voucher_code LIKE 'TREE-%') AS treeCount,
        (SELECT COALESCE(SUM(quantity), 0) FROM orders
           WHERE user_id = ? AND status = 'completed'
             AND (voucher_code LIKE 'TREE-%' OR voucher_code LIKE 'BIKE-%' OR voucher_code LIKE 'HTL-%')) AS certificateCount
    `).get(
      payload.userId,
      payload.userId,
      payload.userId,
      payload.userId,
      payload.userId
    ) as ImpactSummaryRow;

    const milestones = db.prepare(`
      SELECT
        (SELECT MIN(created_at) FROM carbon_records WHERE user_id = ?) AS firstFlightAt,
        (SELECT MIN(created_at) FROM orders
           WHERE user_id = ? AND status != 'cancelled' AND voucher_code LIKE 'TREE-%') AS firstTreeAt,
        (SELECT MIN(created_at) FROM orders
           WHERE user_id = ? AND status != 'cancelled' AND voucher_code LIKE 'BIKE-%') AS firstRideAt
    `).get(payload.userId, payload.userId, payload.userId) as MilestoneRow;

    const certificateSources = db.prepare(`
      SELECT
        CASE
          WHEN o.voucher_code LIKE 'TREE-%' THEN 'tree'
          WHEN o.voucher_code LIKE 'BIKE-%' THEN 'bike'
          ELSE 'hotel'
        END AS sourceType,
        p.name AS productName,
        o.quantity AS quantity,
        o.created_at AS createdAt
      FROM orders o
      JOIN products p ON p.id = o.product_id
      WHERE o.user_id = ? AND o.status = 'completed'
        AND (o.voucher_code LIKE 'TREE-%' OR o.voucher_code LIKE 'BIKE-%' OR o.voucher_code LIKE 'HTL-%')
      ORDER BY o.created_at DESC, o.id DESC
      LIMIT 6
    `).all(payload.userId) as CertificateSourceRow[];

    const treeCount = Math.max(0, summary.treeCount);
    const redeemedMiles = Math.max(0, -summary.netMilesAmount);

    return NextResponse.json({
      data: {
        flightCount: summary.flightCount,
        totalCo2Kg: Math.round(summary.totalCo2Kg * 100) / 100,
        redeemedMiles,
        treeCount,
        projectedOffsetKg: projectedOffsetKg(treeCount),
        certificateCount: summary.certificateCount,
        milestones: {
          firstFlightAt: milestones.firstFlightAt,
          firstTreeAt: milestones.firstTreeAt,
          firstRideAt: milestones.firstRideAt,
        },
        certificateSources,
      },
    });
  } catch {
    return NextResponse.json({ error: '获取个人成果失败' }, { status: 500 });
  }
}
