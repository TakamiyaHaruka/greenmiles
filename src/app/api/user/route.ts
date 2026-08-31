import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const payload = await getAuthUser(request);
    if (!payload) {
      return NextResponse.json(
        { error: '未登录' },
        { status: 401 }
      );
    }

    // Get user from database
    const user = db.prepare('SELECT id, email, miles_balance FROM users WHERE id = ?').get(payload.userId) as {
      id: number;
      email: string;
      miles_balance: number;
    } | undefined;

    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { data: { user } },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: '获取用户信息失败' },
      { status: 500 }
    );
  }
}
