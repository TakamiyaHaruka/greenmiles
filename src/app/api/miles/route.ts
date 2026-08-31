import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import db from '@/lib/db';

/** Miles ledger for the signed-in member: balance + the most recent entries */
export async function GET(request: NextRequest) {
  try {
    const payload = await getAuthUser(request);
    if (!payload) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const user = db.prepare('SELECT miles_balance FROM users WHERE id = ?').get(payload.userId) as
      | { miles_balance: number }
      | undefined;
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    const transactions = db.prepare(`
      SELECT id, amount, type, order_id, description, created_at
      FROM miles_transactions
      WHERE user_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT 50
    `).all(payload.userId);

    return NextResponse.json({
      data: {
        balance: user.miles_balance,
        transactions,
      },
    });
  } catch {
    return NextResponse.json({ error: '获取里程明细失败' }, { status: 500 });
  }
}
