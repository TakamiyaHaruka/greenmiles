'use client';

import type { UseFormRegisterReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface FormFieldProps {
  id: string;
  label: string;
  type?: string;
  placeholder?: string;
  error?: string;
  registration: UseFormRegisterReturn;
}

/** A required-field group: label + input + inline validation error */
export function FormField({ id, label, type = 'text', placeholder, error, registration }: FormFieldProps) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium">
        {label} <span className="text-destructive">*</span>
      </label>
      <Input
        id={id}
        type={type}
        placeholder={placeholder}
        {...registration}
        className={cn(error && 'border-destructive')}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

/** A form-level error / success banner */
export function FormAlert({ variant, children }: { variant: 'error' | 'success'; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        'p-3 rounded-md border',
        variant === 'error' ? 'bg-destructive/10 border-destructive/20' : 'bg-accent/10 border-accent/20'
      )}
    >
      <p className={cn('text-sm', variant === 'error' ? 'text-destructive' : 'text-accent-foreground')}>{children}</p>
    </div>
  );
}
