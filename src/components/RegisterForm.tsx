'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RegisterSchema, type RegisterInput } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import { FormField, FormAlert } from '@/components/form-fields';

interface RegisterFormProps {
  onSuccess?: () => void;
}

export function RegisterForm({ onSuccess }: RegisterFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(RegisterSchema),
  });

  const onSubmit = async (data: RegisterInput) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || '注册失败');
        return;
      }

      setSuccess(result.data.message);
      onSuccess?.();
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

      <FormField
        id="confirmPassword"
        label="确认密码"
        type="password"
        placeholder="再次输入密码"
        error={errors.confirmPassword?.message}
        registration={register('confirmPassword')}
      />

      {error && <FormAlert variant="error">{error}</FormAlert>}
      {success && <FormAlert variant="success">{success}</FormAlert>}

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? '注册中...' : '注册'}
      </Button>
    </form>
  );
}
