import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminJwt } from '@/lib/auth';
import db, { PRODUCT_SELECT } from '@/lib/db';
import { ProductSchema } from '@/lib/schemas';

async function requireAdmin(request: NextRequest): Promise<boolean> {
  const token = request.headers.get('cookie')?.match(/admin_token=([^;]+)/)?.[1];
  if (!token) return false;
  return verifyAdminJwt(token);
}

export async function GET(request: NextRequest) {
  try {
    if (!(await requireAdmin(request))) {
      return NextResponse.json({ error: '未授权的管理员会话' }, { status: 401 });
    }

    const products = db.prepare(`${PRODUCT_SELECT} ORDER BY id`).all();
    return NextResponse.json({ data: products });
  } catch {
    return NextResponse.json({ error: '获取商品列表失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!(await requireAdmin(request))) {
      return NextResponse.json({ error: '未授权的管理员会话' }, { status: 401 });
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
      'INSERT INTO products (name, description, category, mileage_cost, stock, icon_type) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(name, description || null, category, mileage_cost, stock, icon_type || null);

    const created = db.prepare(`${PRODUCT_SELECT} WHERE id = ?`).get(result.lastInsertRowid);
    return NextResponse.json({ data: created }, { status: 201 });
  } catch {
    return NextResponse.json({ error: '创建商品失败' }, { status: 500 });
  }
}
