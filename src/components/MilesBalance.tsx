'use client';

import { useUserStore } from '@/stores/userStore';
import { Badge } from '@/components/ui/badge';
import { Plane } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MilesBalance({ compact = false }: { compact?: boolean }) {
  const user = useUserStore((state) => state.user);

  if (!user) return null;

  const formattedBalance = user.miles_balance.toLocaleString();

  return (
    <Badge
      variant="secondary"
      className={cn('min-w-0 gap-1.5 px-3 py-1.5', compact && 'max-w-24 px-2')}
      aria-label={`可用里程 ${formattedBalance}`}
      title={`${formattedBalance} 里程`}
    >
      <Plane className="h-3.5 w-3.5" />
      <span className="truncate font-semibold">{formattedBalance}</span>
    </Badge>
  );
}
