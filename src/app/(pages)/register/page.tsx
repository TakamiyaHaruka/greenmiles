import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RegisterForm } from '@/components/RegisterForm';

export const metadata: Metadata = {
  title: '注册 | GreenMiles',
};

export default function RegisterPage() {
  return (
    <div className="journey-page flex min-h-[calc(100svh-4rem)] items-center justify-center p-4">
      <Card className="journey-surface-heavy w-full max-w-md border">
        <CardHeader className="space-y-1">
          <CardTitle className="text-center">
            <h1 className="text-2xl font-bold">创建账号</h1>
          </CardTitle>
          <CardDescription className="text-center">
            注册 GreenMiles，开启绿色旅程
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RegisterForm />
          <div className="mt-4 text-center text-sm">
            已有账号？{' '}
            <Link href="/login" className="text-primary hover:underline">
              立即登录
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
