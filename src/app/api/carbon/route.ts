import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import db from '@/lib/db';
import { CarbonCalculationSchema, calculateCarbonEmission } from '@/lib/carbon';

export async function POST(request: NextRequest) {
  try {
    const payload = await getAuthUser(request);
    if (!payload) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = CarbonCalculationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || '参数无效' },
        { status: 400 }
      );
    }

    const { distance, aircraftType, cabinClass, route } = parsed.data;

    // Recompute server-side; never trust a client-provided emission value
    const co2Kg = calculateCarbonEmission(distance, aircraftType, cabinClass);

    const result = db.prepare(
      'INSERT INTO carbon_records (user_id, distance, aircraft_type, cabin_class, co2_kg, route) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(payload.userId, distance, aircraftType, cabinClass, co2Kg, route || null);

    return NextResponse.json({ data: { id: result.lastInsertRowid, co2Kg } });
  } catch {
    return NextResponse.json({ error: '保存失败，请稍后重试' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const payload = await getAuthUser(request);
    if (!payload) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const stats = db.prepare(`
      SELECT COUNT(*) AS flightCount, COALESCE(SUM(co2_kg), 0) AS totalCo2Kg
      FROM carbon_records WHERE user_id = ?
    `).get(payload.userId) as { flightCount: number; totalCo2Kg: number };

    const records = db.prepare(`
      SELECT * FROM carbon_records WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 50
    `).all(payload.userId);

    // Trees actually standing: carbon redemptions minus cancelled orders
    const myTrees = db.prepare(`
      SELECT COALESCE(SUM(o.quantity), 0) AS trees
      FROM orders o JOIN products p ON o.product_id = p.id
      WHERE o.user_id = ? AND p.category = 'carbon' AND o.status != 'cancelled'
    `).get(payload.userId) as { trees: number };

    return NextResponse.json({
      data: {
        flightCount: stats.flightCount,
        totalCo2Kg: Math.round(stats.totalCo2Kg * 100) / 100,
        myTrees: myTrees.trees,
        records,
      },
    });
  } catch {
    return NextResponse.json({ error: '获取碳足迹失败' }, { status: 500 });
  }
}
