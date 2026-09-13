'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Calculator,
  Gauge,
  Leaf,
  Plane,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  TreePine,
  Users,
} from 'lucide-react';
import { useUserStore } from '@/stores/userStore';
import { useCartStore } from '@/stores/cartStore';
import { ProductCard } from '@/components/ProductCard';
import { ProductDetailSheet } from '@/components/ProductDetailSheet';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Product } from '@/lib/types';

type LoadState = 'loading' | 'success' | 'error';

interface PersonalImpact {
  flightCount: number;
  totalCo2Kg: number;
  myTrees: number;
}

interface PlatformStats {
  orderCount: number;
  greenMilesSpent: number;
  totalCo2OffsetKg: number;
}

async function fetchProducts(): Promise<Product[]> {
  const response = await fetch('/api/products');
  if (!response.ok) throw new Error('products request failed');
  const payload = await response.json();
  return Array.isArray(payload.data) ? payload.data : [];
}

class SessionExpiredError extends Error {}

async function fetchPersonalImpact(): Promise<PersonalImpact> {
  const response = await fetch('/api/carbon');
  if (response.status === 401) throw new SessionExpiredError('session expired');
  if (!response.ok) throw new Error('personal request failed');
  const payload = await response.json();
  return payload.data as PersonalImpact;
}

async function fetchPlatformStats(): Promise<PlatformStats> {
  const response = await fetch('/api/stats');
  if (response.status === 401) throw new SessionExpiredError('session expired');
  if (!response.ok) throw new Error('platform request failed');
  const payload = await response.json();
  return payload.data as PlatformStats;
}

function SectionHeading({
  id,
  eyebrow,
  title,
  description,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="max-w-2xl">
      <p className="mb-2 text-xs font-bold tracking-[0.22em] text-emerald-700 uppercase">{eyebrow}</p>
      <h2 id={id} className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">{description}</p>
    </div>
  );
}

function SurfaceSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('home-surface-light h-44 animate-pulse border', className)}
      aria-hidden="true"
    />
  );
}

export default function HomePage() {
  const { user, isAuthenticated, initializationStatus, clearUser, fetchUser } = useUserStore();
  const clearCart = useCartStore((state) => state.clearCart);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsState, setProductsState] = useState<LoadState>('loading');
  const [personalImpact, setPersonalImpact] = useState<PersonalImpact | null>(null);
  const [personalState, setPersonalState] = useState<LoadState>('loading');
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
  const [platformState, setPlatformState] = useState<LoadState>('loading');
  const [personalMemberId, setPersonalMemberId] = useState<number | null>(null);
  const [platformMemberId, setPlatformMemberId] = useState<number | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const memberRequestId = useRef(0);

  const isInitializing = initializationStatus === 'idle' || initializationStatus === 'loading';
  const authenticationFailed = initializationStatus === 'error';
  const activeMemberId = user?.id;

  useEffect(() => {
    let active = true;
    void fetchProducts()
      .then((data) => {
        if (!active) return;
        setProducts(data);
        setProductsState('success');
      })
      .catch(() => {
        if (!active) return;
        setProducts([]);
        setProductsState('error');
      });
    return () => { active = false; };
  }, []);

  const startMemberDataRequest = useCallback((memberId: number) => {
    const requestId = ++memberRequestId.current;
    const isCurrentRequest = () => (
      requestId === memberRequestId.current
      && useUserStore.getState().initializationStatus === 'authenticated'
      && useUserStore.getState().user?.id === memberId
    );
    const expireSession = (error: unknown) => {
      if (!(error instanceof SessionExpiredError) || !isCurrentRequest()) return false;
      memberRequestId.current += 1;
      clearCart();
      clearUser();
      return true;
    };

    void fetchPersonalImpact()
      .then((data) => {
        if (!isCurrentRequest()) return;
        setPersonalImpact(data);
        setPersonalState('success');
        setPersonalMemberId(memberId);
      })
      .catch((error: unknown) => {
        if (expireSession(error) || !isCurrentRequest()) return;
        setPersonalImpact(null);
        setPersonalState('error');
        setPersonalMemberId(memberId);
      });

    void fetchPlatformStats()
      .then((data) => {
        if (!isCurrentRequest()) return;
        setPlatformStats(data);
        setPlatformState('success');
        setPlatformMemberId(memberId);
      })
      .catch((error: unknown) => {
        if (expireSession(error) || !isCurrentRequest()) return;
        setPlatformStats(null);
        setPlatformState('error');
        setPlatformMemberId(memberId);
      });
  }, [clearCart, clearUser]);

  useEffect(() => {
    if (initializationStatus !== 'authenticated' || activeMemberId == null) return;
    startMemberDataRequest(activeMemberId);
    return () => { memberRequestId.current += 1; };
  }, [activeMemberId, initializationStatus, startMemberDataRequest]);

  const retryProducts = async () => {
    setProductsState('loading');
    try {
      setProducts(await fetchProducts());
      setProductsState('success');
    } catch {
      setProducts([]);
      setProductsState('error');
    }
  };

  const retryMemberData = () => {
    if (!user || initializationStatus !== 'authenticated') return;
    setPersonalMemberId(null);
    setPlatformMemberId(null);
    setPersonalState('loading');
    setPlatformState('loading');
    startMemberDataRequest(user.id);
  };

  const personalDataPending = isAuthenticated && user?.id !== personalMemberId;
  const platformDataPending = isAuthenticated && user?.id !== platformMemberId;

  const featuredProducts = useMemo(() => {
    const balance = initializationStatus === 'authenticated' ? user?.miles_balance : null;
    return [...products]
      .sort((left, right) => {
        const leftRank = left.stock <= 0 ? 2 : balance != null && left.mileage_cost > balance ? 1 : 0;
        const rightRank = right.stock <= 0 ? 2 : balance != null && right.mileage_cost > balance ? 1 : 0;
        return leftRank - rightRank || left.mileage_cost - right.mileage_cost || left.id - right.id;
      })
      .slice(0, 4);
  }, [initializationStatus, products, user?.miles_balance]);

  const openProduct = (product: Product) => {
    setSelectedProduct(product);
    setSheetOpen(true);
  };

  return (
    <div className="home-page">
      <section className="px-4 pt-10 pb-14 sm:pt-16 sm:pb-20">
        <div className="mx-auto grid max-w-[1280px] items-stretch gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="flex flex-col justify-center py-4">
            <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-emerald-700/15 bg-white/60 px-3 py-1.5 text-xs font-semibold text-emerald-800">
              <Leaf className="h-3.5 w-3.5" aria-hidden="true" />
              绿色里程，真实选择
            </div>
            <h1 className="max-w-3xl text-4xl leading-tight font-bold tracking-[-0.04em] text-primary sm:text-5xl lg:text-6xl">
              让飞过的里程，
              <span className="block text-emerald-700">长出新的风景。</span>
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              用现有里程发现绿色好物，也可以先记录一段航程，了解自己的飞行碳足迹。
            </p>
            <div className="mt-8 flex flex-col gap-3 min-[420px]:flex-row">
              <Link href="/mall" className={cn(buttonVariants({ size: 'lg' }), 'h-11 px-5')}>
                <ShoppingBag aria-hidden="true" />
                探索绿色好物
                <ArrowRight aria-hidden="true" />
              </Link>
              <Link
                href="/calculator"
                className={cn(buttonVariants({ size: 'lg', variant: 'outline' }), 'h-11 bg-background/55 px-5')}
              >
                <Calculator aria-hidden="true" />
                计算飞行碳排放
              </Link>
            </div>
          </div>

          <div className="home-member-card flex min-h-72 flex-col justify-between rounded-[1.75rem] border p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold tracking-[0.2em] text-white/90 uppercase">GreenMiles Member</p>
                <p className="mt-2 text-sm text-white/90">每一笔绿色兑换，都从可用里程开始</p>
              </div>
              <Sparkles className="h-6 w-6 text-emerald-300" aria-hidden="true" />
            </div>

            {isInitializing ? (
              <div className="space-y-3" aria-label="正在确认会员状态">
                <div className="h-4 w-24 animate-pulse rounded bg-white/20" />
                <div className="h-12 w-48 animate-pulse rounded bg-white/20" />
                <div className="h-4 w-36 animate-pulse rounded bg-white/20" />
              </div>
            ) : authenticationFailed ? (
              <div>
                <p className="text-xl font-semibold">暂时无法确认会员状态</p>
                <p className="mt-2 text-sm text-white/90">没有把连接失败误显示为游客；请重试。</p>
                <Button variant="secondary" className="mt-5" onClick={() => void fetchUser()}>
                  <RefreshCw aria-hidden="true" /> 重试
                </Button>
              </div>
            ) : isAuthenticated && user ? (
              <div>
                <p className="text-sm text-white/90">可用里程</p>
                <p className="mt-1 break-all text-4xl font-bold tracking-tight sm:text-5xl">
                  {user.miles_balance.toLocaleString()}
                </p>
                <p className="mt-4 truncate text-sm text-white/90" title={user.email}>{user.email}</p>
              </div>
            ) : (
              <div>
                <p className="text-2xl font-semibold">从 10,000 演示里程开始</p>
                <p className="mt-2 text-sm leading-6 text-white/90">注册后即可体验完整兑换流程；首页精选商品无需登录即可浏览。</p>
                <Link href="/register" className={cn(buttonVariants({ variant: 'secondary' }), 'mt-5')}>
                  注册领取 10,000 演示里程
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:py-18" aria-labelledby="featured-products-title">
        <div className="mx-auto max-w-[1280px]">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="mb-2 text-xs font-bold tracking-[0.22em] text-emerald-700 uppercase">Marketplace</p>
              <h2 id="featured-products-title" className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">
                精选绿色好物
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">有货商品优先；登录后会优先展示当前余额可兑换的选择。</p>
            </div>
            <Link href="/mall" className={cn(buttonVariants({ variant: 'ghost' }))}>
                  {isAuthenticated ? '查看全部商品' : '登录后查看全部商品'} <ArrowRight aria-hidden="true" />
            </Link>
          </div>

          {productsState === 'loading' ? (
            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4" aria-label="商品加载中">
              {[0, 1, 2, 3].map((item) => <SurfaceSkeleton key={item} className="h-72" />)}
            </div>
          ) : productsState === 'error' ? (
            <div className="home-surface-heavy mt-8 flex min-h-48 flex-col items-center justify-center border p-6 text-center">
              <p className="font-medium text-primary">商品暂时没有加载成功</p>
              <p className="mt-1 text-sm text-muted-foreground">请检查连接后重试，页面不会用示例商品代替真实库存。</p>
              <Button variant="outline" className="mt-4" onClick={retryProducts}>
                <RefreshCw aria-hidden="true" /> 重试
              </Button>
            </div>
          ) : featuredProducts.length === 0 ? (
            <div className="home-surface-heavy mt-8 flex min-h-48 items-center justify-center border p-6 text-muted-foreground">
              暂无可展示商品，请稍后再来。
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {featuredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  balance={initializationStatus === 'authenticated' ? user?.miles_balance : null}
                  variant="home"
                  onClick={() => openProduct(product)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="px-4 py-14 sm:py-18" aria-labelledby="personal-summary-title">
        <div className="mx-auto max-w-[1280px]">
          <SectionHeading
            id="personal-summary-title"
            eyebrow="My journey"
            title="我的绿色旅程"
            description="这里只展示当前账户的余额、已保存航班与有效碳抵消商品记录，不混入平台数据。"
          />

          {isInitializing ? (
            <div className="mt-8 grid gap-4 md:grid-cols-3" aria-label="个人数据加载中">
              {[0, 1, 2].map((item) => <SurfaceSkeleton key={item} />)}
            </div>
          ) : authenticationFailed ? (
            <div className="home-surface-heavy mt-8 flex flex-col items-start justify-between gap-5 border p-6 sm:flex-row sm:items-center">
              <div>
                <h3 className="text-lg font-semibold text-primary">会员状态暂时无法确认</h3>
                <p className="mt-1 text-sm text-muted-foreground">连接失败不会被当作退出登录。</p>
              </div>
              <Button variant="outline" onClick={() => void fetchUser()}>
                <RefreshCw aria-hidden="true" /> 重试
              </Button>
            </div>
          ) : !isAuthenticated ? (
            <div className="home-surface-heavy mt-8 flex flex-col items-start justify-between gap-5 border p-6 sm:flex-row sm:items-center">
              <div>
                <h3 className="text-lg font-semibold text-primary">登录后回看你的真实记录</h3>
                <p className="mt-1 text-sm text-muted-foreground">游客状态不会显示虚构的个人成果。</p>
              </div>
              <Link href="/login" className={cn(buttonVariants({ variant: 'outline' }))}>登录查看</Link>
            </div>
          ) : personalDataPending || personalState === 'loading' ? (
            <div className="mt-8 grid gap-4 md:grid-cols-3" aria-label="个人数据加载中">
              {[0, 1, 2].map((item) => <SurfaceSkeleton key={item} />)}
            </div>
          ) : personalState === 'error' ? (
            <div className="home-surface-heavy mt-8 flex flex-col items-start justify-between gap-5 border p-6 sm:flex-row sm:items-center">
              <div>
                <h3 className="font-semibold text-primary">个人数据暂时无法读取</h3>
                <p className="mt-1 text-sm text-muted-foreground">没有把失败误显示为零；你可以单独重试。</p>
              </div>
              <Button variant="outline" onClick={retryMemberData}>
                <RefreshCw aria-hidden="true" /> 重试
              </Button>
            </div>
          ) : personalImpact ? (
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {[
                { icon: Plane, label: '已保存航班', value: personalImpact.flightCount.toLocaleString(), unit: '段' },
                { icon: Gauge, label: '飞行碳足迹', value: personalImpact.totalCo2Kg.toLocaleString(), unit: 'kg CO₂' },
                { icon: TreePine, label: '支持树量', value: personalImpact.myTrees.toLocaleString(), unit: '棵*' },
              ].map((item) => (
                <div key={item.label} className="home-surface-light border p-5 sm:p-6">
                  <item.icon className="h-5 w-5 text-emerald-700" aria-hidden="true" />
                  <p className="mt-5 text-sm text-muted-foreground">{item.label}</p>
                  <p className="mt-1 text-3xl font-bold text-primary">
                    {item.value} <span className="text-sm font-medium text-muted-foreground">{item.unit}</span>
                  </p>
                </div>
              ))}
              <p className="text-xs text-muted-foreground md:col-span-3">* 支持树量沿用现有演示口径：有效碳抵消商品订单数量。</p>
            </div>
          ) : null}
        </div>
      </section>

      <section className="px-4 py-14 sm:py-18" aria-labelledby="platform-title">
        <div className="mx-auto max-w-[1280px]">
          <SectionHeading
            id="platform-title"
            eyebrow="Platform overview"
            title="GreenMiles 平台概览"
            description="以下指标均为全平台口径，与上方个人记录分开；数据来自现有平台统计服务。"
          />

          {authenticationFailed ? (
            <div className="home-surface-light mt-8 border p-6 text-sm text-muted-foreground">
              会员状态确认失败，平台统计暂不加载；可在上方重试。
            </div>
          ) : !isAuthenticated && !isInitializing ? (
            <div className="home-surface-light mt-8 border p-6 text-sm text-muted-foreground">
              平台实时统计需要登录后读取；这里不使用硬编码示例数值。
            </div>
          ) : isInitializing || platformDataPending || platformState === 'loading' ? (
            <div className="mt-8 grid gap-4 sm:grid-cols-3" aria-label="平台数据加载中">
              {[0, 1, 2].map((item) => <SurfaceSkeleton key={item} className="h-36" />)}
            </div>
          ) : platformState === 'error' ? (
            <div className="home-surface-light mt-8 flex flex-col items-start justify-between gap-4 border p-6 sm:flex-row sm:items-center">
              <p className="text-sm text-muted-foreground">平台统计暂时不可用，个人数据不受影响。</p>
              <Button variant="outline" onClick={retryMemberData}>
                <RefreshCw aria-hidden="true" /> 重试
              </Button>
            </div>
          ) : platformStats ? (
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                { icon: Users, label: '全平台有效兑换', value: platformStats.orderCount.toLocaleString(), unit: '笔' },
                { icon: ShoppingBag, label: '全平台绿色兑换', value: platformStats.greenMilesSpent.toLocaleString(), unit: '里程' },
                { icon: TreePine, label: '全平台年度估算减排', value: platformStats.totalCo2OffsetKg.toLocaleString(), unit: 'kg CO₂' },
              ].map((item) => (
                <div key={item.label} className="home-surface-light border p-5">
                  <item.icon className="h-5 w-5 text-emerald-700" aria-hidden="true" />
                  <p className="mt-4 text-sm text-muted-foreground">{item.label}</p>
                  <p className="mt-1 text-2xl font-bold text-primary">{item.value} <span className="text-xs font-medium text-muted-foreground">{item.unit}</span></p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="px-4 pt-8 pb-20">
        <div className="home-surface-heavy mx-auto flex max-w-[1280px] flex-col justify-between gap-6 border p-6 sm:p-8 lg:flex-row lg:items-center">
          <div>
            <p className="text-xs font-bold tracking-[0.2em] text-emerald-700 uppercase">Next step</p>
            <h2 className="mt-2 text-2xl font-bold text-primary">回看每一段飞行留下的足迹</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              查看已保存的航班、月度趋势与季度分析；“我的成果”将在后续阶段接入完整汇总。
            </p>
          </div>
          <Link href="/footprint" className={cn(buttonVariants({ size: 'lg' }), 'h-11 px-5')}>
            查看我的碳足迹 <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </section>

      <ProductDetailSheet
        product={selectedProduct}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        balance={initializationStatus === 'authenticated' ? user?.miles_balance : null}
        variant="home"
      />
    </div>
  );
}
