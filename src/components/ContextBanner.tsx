'use client';

import { useCarbonStore } from '@/stores/carbonStore';
import { Button } from '@/components/ui/button';
import { Leaf, X } from 'lucide-react';
import { useState } from 'react';

export function ContextBanner() {
  const { co2Kg, analogy, clearCarbonResult } = useCarbonStore();
  const [dismissed, setDismissed] = useState(false);

  if (co2Kg === null || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    clearCarbonResult();
  };

  return (
    <div className="bg-accent/10 border border-accent/20 rounded-lg px-4 py-3 mb-6 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
          <Leaf className="h-5 w-5 text-accent" />
        </div>
        <div>
          <p className="text-sm font-medium text-primary">
            抵消您本次飞行的 <span className="text-accent font-bold">{co2Kg} kg</span> 碳排
          </p>
          <p className="text-xs text-muted-foreground">{analogy}</p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 h-8 w-8"
        onClick={handleDismiss}
        aria-label="关闭推荐"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
