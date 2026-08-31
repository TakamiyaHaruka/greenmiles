'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bike, Hotel, TreePine, ShoppingBag } from 'lucide-react';
import type { Product } from '@/lib/types';

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

export function ProductCard({ product, onClick }: { product: Product; onClick?: () => void }) {
  const category = CATEGORY_MAP[product.category] || { label: product.category, color: 'bg-gray-100 text-gray-700' };
  const Icon = ICON_MAP[product.icon_type] || ShoppingBag;
  const gradient = GRADIENT_MAP[product.icon_type] || 'from-gray-400 to-gray-500';

  return (
    <Card className="border border-[#E2E8F0] rounded-2xl shadow-sm hover:shadow-md transition-shadow cursor-pointer group" onClick={onClick}>
      <CardHeader className="p-0">
        <div className={`h-32 rounded-t-2xl bg-gradient-to-br ${gradient} flex items-center justify-center`}>
          <Icon className="h-12 w-12 text-white/90 group-hover:scale-110 transition-transform" />
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-2">
        <Badge className={`text-xs ${category.color} border-0`}>
          {category.label}
        </Badge>
        <h3 className="font-semibold text-primary">{product.name}</h3>
        <p className="text-xs text-muted-foreground line-clamp-2">
          {product.description}
        </p>
        <div className="flex items-center justify-between pt-2">
          <span className="text-lg font-bold text-accent">
            {product.mileage_cost.toLocaleString()} 里程
          </span>
          <Button size="sm" className="rounded-full">
            立即兑换
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
