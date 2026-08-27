import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyJwt } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    // Get token from cookies
    const cookieHeader = request.headers.get('cookie') || '';
    const tokenMatch = cookieHeader.match(/token=([^;]+)/);
    const token = tokenMatch?.[1];

    if (!token) {
      return NextResponse.json(
        { error: '未登录' },
        { status: 401 }
      );
    }

    // Verify token
    const payload = await verifyJwt(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'token 无效' },
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
