'use client';

import { useUserStore } from '@/stores/userStore';
import { Badge } from '@/components/ui/badge';
import { Plane } from 'lucide-react';

export function MilesBalance() {
  const user = useUserStore((state) => state.user);

  if (!user) return null;

  const formattedBalance = user.miles_balance.toLocaleString();

  return (
    <Badge variant="secondary" className="gap-1.5 px-3 py-1.5">
      <Plane className="h-3.5 w-3.5" />
      <span className="font-semibold">{formattedBalance}</span>
    </Badge>
  );
}
