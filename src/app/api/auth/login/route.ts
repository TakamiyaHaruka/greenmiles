import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import db from '@/lib/db';
import { LoginSchema } from '@/lib/schemas';
import { signJwt } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate request body
    const result = LoginSchema.safeParse(body);
    if (!result.success) {
      const errorMessage = result.error.issues[0]?.message || '请求参数无效';
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }

    const { email, password } = result.data;

    // Find user by email
    const user = db.prepare('SELECT id, email, password_hash, miles_balance FROM users WHERE email = ?').get(email) as {
      id: number;
      email: string;
      password_hash: string;
      miles_balance: number;
    } | undefined;

    if (!user) {
      return NextResponse.json(
        { error: '邮箱或密码错误' },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: '邮箱或密码错误' },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = await signJwt({
      userId: user.id,
      email: user.email,
    });

    // Set httpOnly cookie
    const response = NextResponse.json(
      {
        data: {
          user: {
            id: user.id,
            email: user.email,
            miles_balance: user.miles_balance,
          },
        },
      },
      { status: 200 }
    );

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: '登录失败，请稍后重试' },
      { status: 500 }
    );
  }
}
