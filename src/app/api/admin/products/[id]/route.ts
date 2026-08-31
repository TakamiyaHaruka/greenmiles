import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminJwt } from '@/lib/auth';
import db, { PRODUCT_SELECT } from '@/lib/db';
import { ProductSchema } from '@/lib/schemas';

async function requireAdmin(request: NextRequest): Promise<boolean> {
  const token = request.headers.get('cookie')?.match(/admin_token=([^;]+)/)?.[1];
  if (!token) return false;
  return verifyAdminJwt(token);
}

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await requireAdmin(request))) {
      return NextResponse.json({ error: '未授权的管理员会话' }, { status: 401 });
    }

    const productId = parseId((await params).id);
    if (productId === null) {
      return NextResponse.json({ error: '商品 ID 无效' }, { status: 400 });
    }

    const body = await request.json();
    const parsed = ProductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || '参数无效' },
        { status: 400 }
      );
    }

    const { name, description, category, mileage_cost, stock, icon_type } = parsed.data;
    const result = db.prepare(
      'UPDATE products SET name = ?, description = ?, category = ?, mileage_cost = ?, stock = ?, icon_type = ? WHERE id = ?'
    ).run(name, description || null, category, mileage_cost, stock, icon_type || null, productId);

    if (result.changes === 0) {
      return NextResponse.json({ error: '商品不存在' }, { status: 404 });
    }

    const updated = db.prepare(`${PRODUCT_SELECT} WHERE id = ?`).get(productId);
    return NextResponse.json({ data: updated });
  } catch {
    return NextResponse.json({ error: '更新商品失败' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await requireAdmin(request))) {
      return NextResponse.json({ error: '未授权的管理员会话' }, { status: 401 });
    }

    const productId = parseId((await params).id);
    if (productId === null) {
      return NextResponse.json({ error: '商品 ID 无效' }, { status: 400 });
    }

    // Orders reference products; block deletion once redemptions exist
    const usage = db.prepare('SELECT COUNT(*) AS count FROM orders WHERE product_id = ?').get(productId) as { count: number };
    if (usage.count > 0) {
      return NextResponse.json(
        { error: '该商品已有兑换订单，无法删除；可将库存调整为 0 以下架' },
        { status: 409 }
      );
    }

    const result = db.prepare('DELETE FROM products WHERE id = ?').run(productId);
    if (result.changes === 0) {
      return NextResponse.json({ error: '商品不存在' }, { status: 404 });
    }

    return NextResponse.json({ data: { success: true } });
  } catch {
    return NextResponse.json({ error: '删除商品失败' }, { status: 500 });
  }
}
