import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import db from '@/lib/db';

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/**
 * Cancels a pending (awaiting-shipment) order: refunds the miles, restores the
 * stock and writes a refund ledger row — all in one transaction. Voucher orders
 * (status 'completed') are fulfilled instantly and cannot be reversed.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getAuthUser(request);
    if (!payload) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const orderId = parseId((await params).id);
    if (orderId === null) {
      return NextResponse.json({ error: '订单 ID 无效' }, { status: 400 });
    }

    const result = db.transaction(() => {
      const order = db.prepare(`
        SELECT o.id, o.user_id, o.product_id, o.quantity, o.status,
               (p.mileage_cost * o.quantity) AS total_cost,
               p.name AS product_name,
               u.miles_balance
        FROM orders o
        JOIN products p ON o.product_id = p.id
        JOIN users u ON u.id = o.user_id
        WHERE o.id = ?
      `).get(orderId) as {
        id: number;
        user_id: number;
        product_id: number;
        quantity: number;
        status: string;
        total_cost: number;
        product_name: string;
        miles_balance: number;
      } | undefined;

      if (!order) {
        throw new Error('ORDER_NOT_FOUND');
      }
      if (order.user_id !== payload.userId) {
        throw new Error('FORBIDDEN');
      }
      if (order.status !== 'pending') {
        throw new Error('NOT_CANCELLABLE');
      }

      // Conditional update makes pending → cancelled atomic; changes = 0 means
      // another request already moved the order on
      const cancelled = db.prepare(
        "UPDATE orders SET status = 'cancelled' WHERE id = ? AND status = 'pending'"
      ).run(orderId);
      if (cancelled.changes === 0) {
        throw new Error('NOT_CANCELLABLE');
      }

      // Refund the miles
      db.prepare('UPDATE users SET miles_balance = miles_balance + ? WHERE id = ?')
        .run(order.total_cost, order.user_id);

      // Return the stock to the shelf
      db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?')
        .run(order.quantity, order.product_id);

      // Refund ledger row
      db.prepare(
        "INSERT INTO miles_transactions (user_id, amount, type, order_id, description) VALUES (?, ?, 'refund', ?, ?)"
      ).run(order.user_id, order.total_cost, order.id, `取消订单「${order.product_name}」退款`);

      return { newBalance: order.miles_balance + order.total_cost };
    })();

    return NextResponse.json({ data: { new_balance: result.newBalance } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'UNKNOWN';
    if (message === 'ORDER_NOT_FOUND') {
      return NextResponse.json({ error: '订单不存在' }, { status: 404 });
    }
    if (message === 'FORBIDDEN') {
      return NextResponse.json({ error: '无权操作此订单' }, { status: 403 });
    }
    if (message === 'NOT_CANCELLABLE') {
      return NextResponse.json({ error: '仅待发货订单可取消，券码类订单发放后不可逆' }, { status: 400 });
    }
    return NextResponse.json({ error: '取消订单失败，请稍后重试' }, { status: 500 });
  }
}
