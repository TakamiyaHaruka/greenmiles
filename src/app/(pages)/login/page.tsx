import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoginForm } from '@/components/LoginForm';

export const metadata: Metadata = {
  title: '登录 | GreenMiles',
};

export default function LoginPage() {
  return (
    <div className="journey-page flex min-h-[calc(100svh-4rem)] items-center justify-center p-4">
      <Card className="journey-surface-heavy w-full max-w-md border">
        <CardHeader className="space-y-1">
          <CardTitle className="text-center">
            <h1 className="text-2xl font-bold">登录</h1>
          </CardTitle>
          <CardDescription className="text-center">
            登录 GreenMiles，继续您的绿色旅程
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
          <div className="mt-4 text-center text-sm">
            还没有账号？{' '}
            <Link href="/register" className="text-primary hover:underline">
              立即注册
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
