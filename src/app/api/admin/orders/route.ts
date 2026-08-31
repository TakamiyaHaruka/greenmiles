import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import db from '@/lib/db';

/** All orders across members, joined with the buyer email and product name */
export async function GET(request: NextRequest) {
  try {
    if (!(await requireAdmin(request))) {
      return NextResponse.json({ error: '未授权的管理员会话' }, { status: 401 });
    }

    const orders = db.prepare(`
      SELECT o.id, o.user_id, u.email, o.product_id, p.name AS product_name,
             p.category, p.icon_type, o.status, o.quantity,
             (p.mileage_cost * o.quantity) AS mileage_cost,
             o.voucher_code, o.address, o.created_at
      FROM orders o
      JOIN users u ON u.id = o.user_id
      JOIN products p ON p.id = o.product_id
      ORDER BY o.created_at DESC, o.id DESC
    `).all();

    return NextResponse.json({ data: orders });
  } catch {
    return NextResponse.json({ error: '获取订单列表失败' }, { status: 500 });
  }
}
