'use client';

import { useEffect } from 'react';
import { Layers3, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppearanceStore } from '@/stores/appearanceStore';
import { cn } from '@/lib/utils';

export function GlassModeToggle({ compact = false }: { compact?: boolean }) {
  const { mode, isInitialized, initialize, toggleMode } = useAppearanceStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (!isInitialized) {
    return (
      <span
        aria-hidden="true"
        className={cn(
          'inline-flex h-8 animate-pulse rounded-lg bg-primary/10',
          compact ? 'w-8' : 'w-[5.5rem]'
        )}
      />
    );
  }

  const glassEnabled = mode === 'glass';

  return (
    <Button
      type="button"
      variant="ghost"
      size={compact ? 'icon' : 'default'}
      className="home-appearance-toggle"
      aria-label="玻璃外观"
      aria-pressed={glassEnabled}
      title={glassEnabled ? '当前：玻璃外观' : '当前：标准外观'}
      onClick={toggleMode}
    >
      {glassEnabled ? <Sparkles aria-hidden="true" /> : <Layers3 aria-hidden="true" />}
      {!compact && <span>{glassEnabled ? '玻璃' : '标准'}</span>}
    </Button>
  );
}
