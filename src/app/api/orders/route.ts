import { NextRequest, NextResponse } from 'next/server';
import { verifyJwt } from '@/lib/auth';
import db from '@/lib/db';
import { z } from 'zod';
import crypto from 'crypto';

const CreateOrderSchema = z.object({
  productId: z.number().int().positive(),
  address: z.string().max(500, '地址不能超过 500 字').optional(),
});

function generateVoucherCode(iconType: string): string {
  const prefix = iconType === 'bike' ? 'BIKE' : iconType === 'hotel' ? 'HTL' : iconType === 'tree' ? 'TREE' : 'BAG';
  const uuid = crypto.randomUUID().split('-')[0].toUpperCase();
  return `${prefix}-${uuid}`;
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('cookie')?.match(/token=([^;]+)/)?.[1];
    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const payload = await verifyJwt(token);
    if (!payload) {
      return NextResponse.json({ error: '登录已过期' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = CreateOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || '参数无效' }, { status: 400 });
    }

    const { productId, address } = parsed.data;

    // Transaction: deduct miles + create order
    const result = db.transaction(() => {
      const user = db.prepare('SELECT id, miles_balance FROM users WHERE id = ?').get(payload.userId) as { id: number; miles_balance: number } | undefined;
      if (!user) {
        throw new Error('USER_NOT_FOUND');
      }

      const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId) as { id: number; name: string; mileage_cost: number; stock: number; icon_type: string; category: string } | undefined;
      if (!product) {
        throw new Error('PRODUCT_NOT_FOUND');
      }

      if (product.stock <= 0) {
        throw new Error('OUT_OF_STOCK');
      }

      if (user.miles_balance < product.mileage_cost) {
        throw new Error('INSUFFICIENT_BALANCE');
      }

      // Deduct miles
      db.prepare('UPDATE users SET miles_balance = miles_balance - ? WHERE id = ?').run(product.mileage_cost, user.id);

      // Decrease stock
      db.prepare('UPDATE products SET stock = stock - 1 WHERE id = ?').run(product.id);

      // Generate voucher
      const voucherCode = generateVoucherCode(product.icon_type);

      // Create order
      const orderResult = db.prepare(
        'INSERT INTO orders (user_id, product_id, status, voucher_code, address) VALUES (?, ?, ?, ?, ?)'
      ).run(user.id, product.id, 'completed', voucherCode, address || null);

      return {
        orderId: orderResult.lastInsertRowid,
        voucherCode,
        product,
        newBalance: user.miles_balance - product.mileage_cost,
      };
    })();

    return NextResponse.json({
      data: {
        id: result.orderId,
        voucher_code: result.voucherCode,
        product_name: result.product.name,
        icon_type: result.product.icon_type,
        category: result.product.category,
        mileage_cost: result.product.mileage_cost,
        new_balance: result.newBalance,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'UNKNOWN';
    if (message === 'USER_NOT_FOUND') {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }
    if (message === 'PRODUCT_NOT_FOUND') {
      return NextResponse.json({ error: '商品不存在' }, { status: 404 });
    }
    if (message === 'OUT_OF_STOCK') {
      return NextResponse.json({ error: '商品已售罄' }, { status: 400 });
    }
    if (message === 'INSUFFICIENT_BALANCE') {
      return NextResponse.json({ error: '里程余额不足' }, { status: 400 });
    }
    return NextResponse.json({ error: '兑换失败，请稍后重试' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('cookie')?.match(/token=([^;]+)/)?.[1];
    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const payload = await verifyJwt(token);
    if (!payload) {
      return NextResponse.json({ error: '登录已过期' }, { status: 401 });
    }

    const orders = db.prepare(`
      SELECT o.*, p.name as product_name, p.icon_type, p.category, p.mileage_cost
      FROM orders o
      JOIN products p ON o.product_id = p.id
      WHERE o.user_id = ?
      ORDER BY o.created_at DESC
    `).all(payload.userId);

    return NextResponse.json({ data: orders });
  } catch {
    return NextResponse.json({ error: '获取订单失败' }, { status: 500 });
  }
}
