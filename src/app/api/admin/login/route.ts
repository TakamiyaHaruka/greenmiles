import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { signAdminJwt } from '@/lib/auth';

const AdminLoginSchema = z.object({
  password: z.string().min(1, '请输入管理员密码'),
});

// Compare sha256 digests so timingSafeEqual always receives equal-length buffers
function passwordMatches(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD || '';
  const a = crypto.createHash('sha256').update(input).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  try {
    if (!process.env.ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: '未配置 ADMIN_PASSWORD，管理后台不可用' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const parsed = AdminLoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || '参数无效' },
        { status: 400 }
      );
    }

    if (!passwordMatches(parsed.data.password)) {
      return NextResponse.json({ error: '管理员密码错误' }, { status: 401 });
    }

    const token = await signAdminJwt();
    const response = NextResponse.json({ data: { success: true } });
    response.cookies.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });
    return response;
  } catch {
    return NextResponse.json({ error: '登录失败，请稍后重试' }, { status: 500 });
  }
}
