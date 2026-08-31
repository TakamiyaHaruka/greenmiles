'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoginSchema, type LoginInput } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import { FormField, FormAlert } from '@/components/form-fields';
import { useUserStore } from '@/stores/userStore';

export function LoginForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setUser = useUserStore((state) => state.setUser);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || '登录失败');
        return;
      }

      // Update user store
      setUser(result.data.user);

      // Redirect to dashboard
      router.push('/');
      router.refresh();
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormField
        id="email"
        label="邮箱"
        type="email"
        placeholder="your@email.com"
        error={errors.email?.message}
        registration={register('email')}
      />

      <FormField
        id="password"
        label="密码"
        type="password"
        placeholder="至少 6 位"
        error={errors.password?.message}
        registration={register('password')}
      />

      {error && <FormAlert variant="error">{error}</FormAlert>}

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? '登录中...' : '登录'}
      </Button>
    </form>
  );
}
