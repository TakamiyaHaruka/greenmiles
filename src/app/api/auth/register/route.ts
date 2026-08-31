import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import db from '@/lib/db';
import { RegisterSchema } from '@/lib/schemas';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate request body
    const result = RegisterSchema.safeParse(body);
    if (!result.success) {
      const errorMessage = result.error.issues[0]?.message || '请求参数无效';
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }

    const { email, password } = result.data;

    // Check if email already exists
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return NextResponse.json(
        { error: '该邮箱已注册' },
        { status: 409 }
      );
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert new user with default 10000 miles, plus the matching ledger entry
    // — one transaction so the ledger can never miss the welcome grant
    db.transaction(() => {
      const result = db.prepare(
        'INSERT INTO users (email, password_hash, miles_balance) VALUES (?, ?, 10000)'
      ).run(email, passwordHash);

      db.prepare(
        "INSERT INTO miles_transactions (user_id, amount, type, description) VALUES (?, 10000, 'grant', '注册赠礼')"
      ).run(result.lastInsertRowid);
    })();

    return NextResponse.json(
      { data: { message: '注册成功，请登录' } },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Registration error:', error);
    const message = error instanceof Error ? error.message : '';
    if (message.includes('UNIQUE constraint failed')) {
      return NextResponse.json(
        { error: '该邮箱已注册' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: '注册失败，请稍后重试' },
      { status: 500 }
    );
  }
}
