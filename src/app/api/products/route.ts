import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const products = db.prepare('SELECT * FROM products ORDER BY id').all();
    return NextResponse.json({ data: products });
  } catch {
    return NextResponse.json(
      { error: '获取商品列表失败' },
      { status: 500 }
    );
  }
}
