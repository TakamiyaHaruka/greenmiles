'use client';

import type { UseFormRegisterReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface FormFieldProps {
  id: string;
  label: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  error?: string;
  registration: UseFormRegisterReturn;
}

/** A required-field group: label + input + inline validation error */
export function FormField({ id, label, type = 'text', placeholder, autoComplete, error, registration }: FormFieldProps) {
  const errorId = `${id}-error`;

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium">
        {label} <span className="text-destructive">*</span>
      </label>
      <Input
        id={id}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        aria-errormessage={error ? errorId : undefined}
        {...registration}
        className={cn(error && 'border-destructive')}
      />
      {error && <p id={errorId} className="text-sm text-destructive" role="alert">{error}</p>}
    </div>
  );
}

/** A form-level error / success banner */
export function FormAlert({ variant, children }: { variant: 'error' | 'success'; children: React.ReactNode }) {
  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      aria-live={variant === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
      className={cn(
        'p-3 rounded-md border',
        variant === 'error' ? 'bg-destructive/10 border-destructive/20' : 'bg-accent/10 border-accent/20'
      )}
    >
      <p className={cn('text-sm', variant === 'error' ? 'text-destructive' : 'text-primary')}>{children}</p>
    </div>
  );
}
