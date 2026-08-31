'use client';

import { useState, useMemo, useEffect } from 'react';
import { ContextBanner } from '@/components/ContextBanner';
import { ProductCard } from '@/components/ProductCard';
import { ProductDetailSheet } from '@/components/ProductDetailSheet';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Package } from 'lucide-react';
import type { Product } from '@/lib/types';

const CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'virtual', label: '虚拟卡券' },
  { value: 'carbon', label: '碳抵消' },
  { value: 'physical', label: '实体' },
];

export default function MallPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('low-to-high');
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    fetch('/api/products')
      .then((res) => res.json())
      .then((data) => setProducts(data.data || []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = category === 'all'
      ? products
      : products.filter((p) => p.category === category);

    list = [...list].sort((a, b) =>
      sort === 'low-to-high'
        ? a.mileage_cost - b.mileage_cost
        : b.mileage_cost - a.mileage_cost
    );

    return list;
  }, [products, category, sort]);

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setSheetOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1280px] px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-primary">绿色商城</h1>
          <p className="text-muted-foreground mt-2">
            用里程兑换环保商品，为地球减碳
          </p>
        </div>

        <ContextBanner />

        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6 gap-4">
          <Tabs value={category} onValueChange={setCategory}>
            <TabsList>
              {CATEGORIES.map((cat) => (
                <TabsTrigger key={cat.value} value={cat.value}>
                  {cat.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <Select value={sort} onValueChange={(v) => v && setSort(v)}>
            <SelectTrigger className="w-40 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low-to-high">里程从低到高</SelectItem>
              <SelectItem value="high-to-low">里程从高到低</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="text-center py-16 text-muted-foreground">
            加载中...
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filtered.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onClick={() => handleProductClick(product)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">暂无商品</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              该分类下暂无商品，请查看其他分类
            </p>
          </div>
        )}
      </div>

      <ProductDetailSheet
        product={selectedProduct}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
}
