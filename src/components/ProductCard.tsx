'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bike, Hotel, TreePine, ShoppingBag } from 'lucide-react';
import type { Product } from '@/lib/types';
import { cn } from '@/lib/utils';

const CATEGORY_MAP: Record<string, { label: string; color: string }> = {
  virtual: { label: '虚拟卡券', color: 'bg-blue-100 text-blue-700' },
  carbon: { label: '碳抵消', color: 'bg-green-100 text-green-700' },
  physical: { label: '实体商品', color: 'bg-amber-100 text-amber-700' },
};

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  bike: Bike,
  hotel: Hotel,
  tree: TreePine,
  bag: ShoppingBag,
};

const GRADIENT_MAP: Record<string, string> = {
  bike: 'from-blue-400 to-cyan-400',
  hotel: 'from-purple-400 to-pink-400',
  tree: 'from-green-400 to-emerald-400',
  bag: 'from-amber-400 to-orange-400',
};

interface ProductCardProps {
  product: Product;
  onClick?: () => void;
  balance?: number | null;
  variant?: 'default' | 'home' | 'journey';
}

export function ProductCard({
  product,
  onClick,
  balance,
  variant = 'default',
}: ProductCardProps) {
  const category = CATEGORY_MAP[product.category] || { label: product.category, color: 'bg-gray-100 text-gray-700' };
  const Icon = ICON_MAP[product.icon_type] || ShoppingBag;
  const gradient = GRADIENT_MAP[product.icon_type] || 'from-gray-400 to-gray-500';
  const journeyPalette = variant === 'home' || variant === 'journey';
  const outOfStock = product.stock <= 0;
  const missingMiles = balance == null ? null : Math.max(product.mileage_cost - balance, 0);
  const availability = outOfStock
    ? '暂时无货'
    : missingMiles === null
      ? `库存 ${product.stock}`
      : missingMiles === 0
        ? '当前可兑换'
        : `还差 ${missingMiles.toLocaleString()} 里程`;

  return (
    <Card
      className={cn(
        'group gap-0 rounded-2xl border py-0 transition-shadow hover:shadow-md',
        variant === 'home' ? 'home-surface-light' : variant === 'journey' ? 'journey-surface-light' : 'border-[#E2E8F0] shadow-sm'
      )}
    >
      <button
        type="button"
        className="cursor-pointer text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        onClick={onClick}
        aria-label={variant !== 'default' ? `${product.name}，${availability}，查看详情` : `${product.name}，立即兑换`}
      >
        <CardHeader className="p-0">
          <div className={cn('flex h-32 items-center justify-center rounded-t-2xl', journeyPalette ? 'product-illustration' : `bg-gradient-to-br ${gradient}`)}>
            <Icon className={cn('h-12 w-12 transition-transform group-hover:scale-110', !journeyPalette && 'text-white/90')} />
          </div>
        </CardHeader>
        <CardContent className="space-y-2 p-4">
          <div className="flex items-center justify-between gap-2">
            <Badge variant={journeyPalette ? 'outline' : 'default'} className={cn('border-0 text-xs', journeyPalette ? 'product-category-badge' : category.color)}>
              {category.label}
            </Badge>
            {variant !== 'default' && (
              <span className={cn('text-xs font-medium', outOfStock || (missingMiles ?? 0) > 0 ? 'text-destructive' : 'product-accent-text')}>
                {availability}
              </span>
            )}
          </div>
          <h3 className="font-semibold text-primary">{product.name}</h3>
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {product.description}
          </p>
          <div className="flex items-center justify-between gap-2 pt-2">
            <span className={cn('text-lg font-bold', journeyPalette ? 'product-accent-text' : 'text-accent')}>
              {product.mileage_cost.toLocaleString()} 里程
            </span>
            <span className={cn('inline-flex h-7 items-center rounded-full bg-primary px-2.5 text-[0.8rem] font-medium text-primary-foreground', variant !== 'default' && outOfStock && 'opacity-50')}>
              {variant !== 'default' ? (outOfStock ? '暂时无货' : '查看详情') : '立即兑换'}
            </span>
          </div>
        </CardContent>
      </button>
    </Card>
  );
}
