import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import db from '@/lib/db';

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** The one-way fulfilment state machine: pending → shipped → completed */
const TRANSITIONS: Record<string, string> = {
  pending: 'shipped',
  shipped: 'completed',
};

/** Moves an order along the fulfilment pipeline (admin action). */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await requireAdmin(request))) {
      return NextResponse.json({ error: '未授权的管理员会话' }, { status: 401 });
    }

    const orderId = parseId((await params).id);
    if (orderId === null) {
      return NextResponse.json({ error: '订单 ID 无效' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const target = typeof body?.status === 'string' ? body.status : '';
    if (!target) {
      return NextResponse.json({ error: '缺少目标状态' }, { status: 400 });
    }

    const order = db.prepare('SELECT id, status FROM orders WHERE id = ?').get(orderId) as
      | { id: number; status: string }
      | undefined;
    if (!order) {
      return NextResponse.json({ error: '订单不存在' }, { status: 404 });
    }

    const next = TRANSITIONS[order.status];
    if (order.status === 'cancelled' || next !== target) {
      return NextResponse.json(
        { error: `不允许的状态转移：${order.status} → ${target}（仅支持 待发货→已发货→已完成）` },
        { status: 400 }
      );
    }

    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(target, orderId);

    const updated = db.prepare(`
      SELECT o.id, o.user_id, u.email, o.product_id, p.name AS product_name,
             p.category, p.icon_type, o.status, o.quantity,
             (p.mileage_cost * o.quantity) AS mileage_cost,
             o.voucher_code, o.address, o.created_at
      FROM orders o
      JOIN users u ON u.id = o.user_id
      JOIN products p ON p.id = o.product_id
      WHERE o.id = ?
    `).get(orderId);

    return NextResponse.json({ data: updated });
  } catch {
    return NextResponse.json({ error: '更新订单状态失败' }, { status: 500 });
  }
}
