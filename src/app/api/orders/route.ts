import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import db from '@/lib/db';
import { z } from 'zod';
import crypto from 'crypto';

const CreateOrderSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().min(1, '兑换数量至少为 1').max(10, '单次最多兑换 10 件').default(1),
  address: z.string().max(500, '地址不能超过 500 字').optional(),
});

function generateVoucherCode(iconType: string): string {
  const prefix = iconType === 'bike' ? 'BIKE' : iconType === 'hotel' ? 'HTL' : iconType === 'tree' ? 'TREE' : 'BAG';
  const uuid = crypto.randomUUID().split('-')[0].toUpperCase();
  return `${prefix}-${uuid}`;
}

export async function POST(request: NextRequest) {
  try {
    const payload = await getAuthUser(request);
    if (!payload) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = CreateOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || '参数无效' }, { status: 400 });
    }

    const { productId, quantity, address } = parsed.data;

    // Transaction: deduct miles + create order
    const result = db.transaction(() => {
      const user = db.prepare('SELECT id, miles_balance FROM users WHERE id = ?').get(payload.userId) as { id: number; miles_balance: number } | undefined;
      if (!user) {
        throw new Error('USER_NOT_FOUND');
      }

      const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId) as { id: number; name: string; mileage_cost: number; stock: number; icon_type: string; category: string; project_name: string | null; project_standard: string | null; project_vintage: string | null } | undefined;
      if (!product) {
        throw new Error('PRODUCT_NOT_FOUND');
      }

      if (product.category === 'physical' && !address?.trim()) {
        throw new Error('ADDRESS_REQUIRED');
      }

      if (product.stock < quantity) {
        throw new Error('OUT_OF_STOCK');
      }

      const totalCost = product.mileage_cost * quantity;

      if (user.miles_balance < totalCost) {
        throw new Error('INSUFFICIENT_BALANCE');
      }

      // Deduct miles
      db.prepare('UPDATE users SET miles_balance = miles_balance - ? WHERE id = ?').run(totalCost, user.id);

      // Decrease stock
      db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(quantity, product.id);

      // Generate voucher
      const voucherCode = generateVoucherCode(product.icon_type);

      // Physical goods await shipping; everything else is fulfilled instantly
      const status = product.category === 'physical' ? 'pending' : 'completed';

      // Create order
      const orderResult = db.prepare(
        'INSERT INTO orders (user_id, product_id, status, voucher_code, address, quantity) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(user.id, product.id, status, voucherCode, address || null, quantity);

      // Ledger entry for the redemption
      db.prepare(
        "INSERT INTO miles_transactions (user_id, amount, type, order_id, description) VALUES (?, ?, 'redeem', ?, ?)"
      ).run(user.id, -totalCost, orderResult.lastInsertRowid, `兑换「${product.name}」`);

      return {
        orderId: orderResult.lastInsertRowid,
        voucherCode,
        product,
        quantity,
        totalCost,
        status,
        newBalance: user.miles_balance - totalCost,
      };
    })();

    return NextResponse.json({
      data: {
        id: result.orderId,
        voucher_code: result.voucherCode,
        product_name: result.product.name,
        icon_type: result.product.icon_type,
        category: result.product.category,
        project_name: result.product.project_name || '',
        project_standard: result.product.project_standard || '',
        project_vintage: result.product.project_vintage || '',
        mileage_cost: result.totalCost,
        quantity: result.quantity,
        status: result.status,
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
      return NextResponse.json({ error: '商品库存不足' }, { status: 400 });
    }
    if (message === 'ADDRESS_REQUIRED') {
      return NextResponse.json({ error: '实体商品需要填写收货地址' }, { status: 400 });
    }
    if (message === 'INSUFFICIENT_BALANCE') {
      return NextResponse.json({ error: '里程余额不足' }, { status: 400 });
    }
    return NextResponse.json({ error: '兑换失败，请稍后重试' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const payload = await getAuthUser(request);
    if (!payload) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const orders = db.prepare(`
      SELECT o.*, p.name as product_name, p.icon_type, p.category,
             COALESCE(p.project_name, '') AS project_name,
             COALESCE(p.project_standard, '') AS project_standard,
             COALESCE(p.project_vintage, '') AS project_vintage,
             (p.mileage_cost * o.quantity) AS mileage_cost
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
