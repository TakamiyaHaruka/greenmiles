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
import { useUserStore } from '@/stores/userStore';

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
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const balance = useUserStore((state) => state.user?.miles_balance ?? null);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 10_000);
    fetch('/api/products', { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error('商品加载失败');
        return res.json();
      })
      .then((data: { data?: unknown }) => {
        if (!Array.isArray(data?.data)) throw new Error('商品响应无效');
        if (active) setProducts(data.data as Product[]);
      })
      .catch(() => { if (active) setLoadError(true); })
      .finally(() => {
        window.clearTimeout(timeoutId);
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [reloadKey]);

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
    <div className="journey-page">
      <div className="relative mx-auto max-w-[1280px] px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-primary">绿色商城</h1>
          <p className="text-muted-foreground mt-2">
            用里程兑换环保商品，为地球减碳
          </p>
        </div>

        <ContextBanner />

        {/* Toolbar */}
        <div className="journey-surface-heavy mb-6 flex flex-col gap-4 border p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <Tabs value={category} onValueChange={setCategory} className="min-w-0">
            <TabsList className="grid h-auto w-full grid-cols-4 sm:flex sm:w-auto">
              {CATEGORIES.map((cat) => (
                <TabsTrigger key={cat.value} value={cat.value} className="min-w-0 px-1.5 text-xs sm:px-3 sm:text-sm">
                  {cat.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <Select value={sort} onValueChange={(v) => v && setSort(v)}>
            <SelectTrigger aria-label="商品排序" className="h-9 w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent surface="journey">
              <SelectItem value="low-to-high">里程从低到高</SelectItem>
              <SelectItem value="high-to-low">里程从高到低</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="journey-surface-light border py-16 text-center text-muted-foreground" role="status">
            加载中...
          </div>
        ) : loadError ? (
          <div className="journey-surface-light border py-16 text-center" role="alert">
            <p className="text-muted-foreground">商品暂时无法加载</p>
            <button type="button" className="mt-3 text-sm font-medium text-primary underline underline-offset-4" onClick={() => { setLoading(true); setLoadError(false); setReloadKey((key) => key + 1); }}>
              重试
            </button>
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filtered.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                balance={balance}
                variant="journey"
                onClick={() => handleProductClick(product)}
              />
            ))}
          </div>
        ) : (
          <div className="journey-surface-light border py-16 text-center">
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
        balance={balance}
        variant="journey"
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
}
