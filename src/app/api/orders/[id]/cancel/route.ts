import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import db from '@/lib/db';

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
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
               u.miles_balance, p.stock
        FROM orders o
        JOIN products p ON p.id = o.product_id
        JOIN users u ON u.id = o.user_id
        WHERE o.id = ?
      `).get(orderId) as {
        id: number;
        user_id: number;
        product_id: number;
        quantity: number;
        status: string;
        miles_balance: number;
        stock: number;
      } | undefined;

      if (!order) {
        throw new Error('ORDER_NOT_FOUND');
      }
      if (order.user_id !== payload.userId) {
        throw new Error('FORBIDDEN');
      }
      if (order.status === 'cancelled') {
        throw new Error('ALREADY_CANCELLED');
      }
      if (order.status !== 'pending') {
        throw new Error('NOT_CANCELLABLE');
      }
      if (!Number.isSafeInteger(order.quantity) || order.quantity <= 0
        || !Number.isSafeInteger(order.miles_balance) || order.miles_balance < 0
        || !Number.isSafeInteger(order.stock) || order.stock < 0
        || !Number.isSafeInteger(order.stock + order.quantity)) {
        throw new Error('DATA_INCONSISTENT');
      }

      const ledger = db.prepare(`
        SELECT
          SUM(CASE WHEN type = 'redeem' THEN 1 ELSE 0 END) AS redeemCount,
          SUM(CASE WHEN type = 'refund' THEN 1 ELSE 0 END) AS refundCount,
          MIN(CASE WHEN type = 'redeem' THEN amount END) AS amount,
          MIN(CASE WHEN type = 'redeem' THEN description END) AS description,
          SUM(CASE WHEN user_id != ? THEN 1 ELSE 0 END) AS foreignCount
        FROM miles_transactions
        WHERE order_id = ? AND type IN ('redeem', 'refund')
      `).get(order.user_id, order.id) as {
        redeemCount: number;
        refundCount: number;
        amount: number | null;
        description: string | null;
        foreignCount: number;
      } | undefined;
      if (
        !ledger
        || ledger.redeemCount !== 1
        || ledger.refundCount !== 0
        || ledger.foreignCount !== 0
        || ledger.amount === null
        || !Number.isSafeInteger(ledger.amount)
        || ledger.amount >= 0
      ) {
        throw new Error('LEDGER_INCONSISTENT');
      }
      const refundAmount = -ledger.amount;
      if (!Number.isSafeInteger(order.miles_balance + refundAmount)) {
        throw new Error('DATA_INCONSISTENT');
      }

      // Conditional update makes pending → cancelled atomic; changes = 0 means
      // another request already moved the order on
      const cancelled = db.prepare(
        "UPDATE orders SET status = 'cancelled' WHERE id = ? AND status = 'pending'"
      ).run(orderId);
      if (cancelled.changes !== 1) {
        throw new Error('NOT_CANCELLABLE');
      }

      // Refund the miles
      const refunded = db.prepare('UPDATE users SET miles_balance = miles_balance + ? WHERE id = ?')
        .run(refundAmount, order.user_id);
      if (refunded.changes !== 1) throw new Error('WRITE_FAILED');

      // Return the stock to the shelf
      const restocked = db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?')
        .run(order.quantity, order.product_id);
      if (restocked.changes !== 1) throw new Error('WRITE_FAILED');

      // Refund ledger row
      const refundDescription = ledger.description?.startsWith('兑换')
        ? `取消订单${ledger.description.slice(2)}退款`
        : '取消订单退款';
      const recorded = db.prepare(
        "INSERT INTO miles_transactions (user_id, amount, type, order_id, description) VALUES (?, ?, 'refund', ?, ?)"
      ).run(order.user_id, refundAmount, order.id, refundDescription);
      if (recorded.changes !== 1) throw new Error('WRITE_FAILED');

      return { newBalance: order.miles_balance + refundAmount };
    }).immediate();

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
      return NextResponse.json({ error: '仅待发货订单可取消，券码类订单发放后不可逆', code: 'ORDER_NOT_CANCELLABLE' }, { status: 409 });
    }
    if (message === 'ALREADY_CANCELLED') {
      return NextResponse.json({ error: '订单已取消，请刷新查看退款记录', code: 'ORDER_ALREADY_CANCELLED' }, { status: 409 });
    }
    if (message === 'LEDGER_INCONSISTENT') {
      return NextResponse.json({ error: '兑换账本不一致，无法安全退款', code: 'LEDGER_INCONSISTENT' }, { status: 409 });
    }
    if (message === 'DATA_INCONSISTENT') {
      return NextResponse.json({ error: '订单数据不一致，无法安全退款', code: 'ORDER_DATA_INCONSISTENT' }, { status: 409 });
    }
    return NextResponse.json({ error: '取消订单失败，请稍后重试', code: 'CANCELLATION_FAILED' }, { status: 500 });
  }
}
