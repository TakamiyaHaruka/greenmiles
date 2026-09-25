'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Award,
  Bike,
  CheckCircle2,
  Circle,
  Leaf,
  Plane,
  RefreshCw,
  ShoppingBag,
  TicketCheck,
  TreePine,
  WalletCards,
} from 'lucide-react';
import { ImpactShareDialog } from '@/components/ImpactShareDialog';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCartStore } from '@/stores/cartStore';
import { useUserStore } from '@/stores/userStore';

type CertificateSourceType = 'tree' | 'bike' | 'hotel';

interface ImpactData {
  flightCount: number;
  totalCo2Kg: number;
  redeemedMiles: number;
  treeCount: number;
  projectedOffsetKg: number;
  certificateCount: number;
  milestones: {
    firstFlightAt: string | null;
    firstTreeAt: string | null;
    firstRideAt: string | null;
  };
  certificateSources: Array<{
    sourceType: CertificateSourceType;
    productName: string;
    quantity: number;
    createdAt: string;
  }>;
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function parseRecordDate(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const datePrefix = /^(\d{4}-\d{2}-\d{2})(?:$|[ T])/.exec(trimmed)?.[1];
  if (!datePrefix) return null;
  const iso = trimmed.includes('T')
    ? /(?:Z|[+-]\d{2}:\d{2})$/i.test(trimmed) ? trimmed : `${trimmed}Z`
    : trimmed.includes(' ')
      ? `${trimmed.replace(' ', 'T')}Z`
      : `${trimmed}T00:00:00Z`;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== datePrefix) return null;
  return date;
}

function isRecordDate(value: unknown): value is string {
  return typeof value === 'string' && parseRecordDate(value) !== null;
}

function isNullableDate(value: unknown): value is string | null {
  return value === null || isRecordDate(value);
}

function isImpactData(value: unknown): value is ImpactData {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ImpactData>;
  const milestones = candidate.milestones;
  return Number.isInteger(candidate.flightCount) && isNonNegativeNumber(candidate.flightCount)
    && isNonNegativeNumber(candidate.totalCo2Kg)
    && Number.isInteger(candidate.redeemedMiles) && isNonNegativeNumber(candidate.redeemedMiles)
    && Number.isInteger(candidate.treeCount) && isNonNegativeNumber(candidate.treeCount)
    && Number.isInteger(candidate.projectedOffsetKg) && isNonNegativeNumber(candidate.projectedOffsetKg)
    && Number.isInteger(candidate.certificateCount) && isNonNegativeNumber(candidate.certificateCount)
    && !!milestones
    && isNullableDate(milestones.firstFlightAt)
    && isNullableDate(milestones.firstTreeAt)
    && isNullableDate(milestones.firstRideAt)
    && Array.isArray(candidate.certificateSources)
    && candidate.certificateSources.every((source) => (
      !!source
      && ['tree', 'bike', 'hotel'].includes(source.sourceType)
      && typeof source.productName === 'string'
      && Number.isInteger(source.quantity) && source.quantity > 0
      && isRecordDate(source.createdAt)
    ));
}

class SessionExpiredError extends Error {}

async function requestImpact(): Promise<ImpactData> {
  const response = await fetch('/api/impact');
  if (response.status === 401) throw new SessionExpiredError('session expired');
  if (!response.ok) throw new Error('impact request failed');
  const payload = await response.json() as { data?: unknown };
  if (!isImpactData(payload.data)) throw new Error('impact response invalid');
  return payload.data;
}

function formatRecordDate(value: string): string {
  return parseRecordDate(value)?.toLocaleDateString('zh-CN') ?? '日期未知';
}

const SOURCE_PRESENTATION = {
  tree: { label: '植树证书', Icon: TreePine },
  bike: { label: '骑行卡凭证', Icon: Bike },
  hotel: { label: '酒店券凭证', Icon: TicketCheck },
} satisfies Record<CertificateSourceType, { label: string; Icon: typeof TreePine }>;

export default function ImpactPage() {
  const router = useRouter();
  const clearUser = useUserStore((state) => state.clearUser);
  const clearCart = useCartStore((state) => state.clearCart);
  const [impact, setImpact] = useState<ImpactData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const handleLoadError = useCallback((error: unknown) => {
    if (error instanceof SessionExpiredError) {
      clearCart();
      clearUser();
      router.replace('/login');
      return;
    }
    setImpact(null);
    setLoadError(true);
  }, [clearCart, clearUser, router]);

  const loadImpact = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      setImpact(await requestImpact());
    } catch (error: unknown) {
      handleLoadError(error);
    } finally {
      setLoading(false);
    }
  }, [handleLoadError]);

  useEffect(() => {
    let active = true;
    void requestImpact()
      .then((data) => { if (active) setImpact(data); })
      .catch((error: unknown) => { if (active) handleLoadError(error); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [handleLoadError]);

  const representativeTrees = useMemo(
    () => Array.from({ length: Math.min(impact?.treeCount || 0, 5) }),
    [impact?.treeCount]
  );

  if (loading) {
    return (
      <div className="journey-page">
        <main className="relative mx-auto max-w-[1280px] px-4 py-8">
          <div className="journey-surface-light min-h-72 animate-pulse border" aria-label="个人成果加载中" />
        </main>
      </div>
    );
  }

  if (loadError || !impact) {
    return (
      <div className="journey-page">
        <main className="relative mx-auto max-w-[1280px] px-4 py-8">
          <div className="journey-surface-light border px-6 py-16 text-center" role="alert">
            <p className="font-semibold text-primary">个人成果暂时无法加载</p>
            <p className="mt-2 text-sm text-muted-foreground">失败没有被显示成零，稍后可重新读取。</p>
            <Button variant="outline" className="mt-5" onClick={() => void loadImpact()}>
              <RefreshCw aria-hidden="true" />
              重试
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const hasImpact = impact.flightCount > 0
    || impact.redeemedMiles > 0
    || impact.treeCount > 0
    || impact.certificateCount > 0;
  const milestones = [
    {
      key: 'flight',
      title: '第一段绿色旅程',
      description: '保存第一段飞行碳足迹',
      unlockedAt: impact.milestones.firstFlightAt,
      Icon: Plane,
    },
    {
      key: 'tree',
      title: '第一份植树支持',
      description: '完成首次有效植树兑换',
      unlockedAt: impact.milestones.firstTreeAt,
      Icon: TreePine,
    },
    {
      key: 'ride',
      title: '第一次绿色接驳',
      description: '完成首次骑行卡兑换',
      unlockedAt: impact.milestones.firstRideAt,
      Icon: Bike,
    },
  ];

  return (
    <div className="journey-page">
      <main className="relative mx-auto max-w-[1280px] px-4 py-8 sm:py-12">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold tracking-[0.22em] text-emerald-700 uppercase">All-time impact</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-primary sm:text-4xl">我的成果</h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              GreenMiles 绿色旅行者的全部时间记录。汇总来自真实账本、订单凭证与已保存航班。
            </p>
          </div>
          {hasImpact && (
            <ImpactShareDialog
              redeemedMiles={impact.redeemedMiles}
              treeCount={impact.treeCount}
              flightCount={impact.flightCount}
              projectedOffsetKg={impact.projectedOffsetKg}
            />
          )}
        </header>

        {!hasImpact && (
          <section className="journey-surface-heavy mt-8 border p-6 sm:p-8" aria-labelledby="impact-empty-title">
            <Leaf className="h-8 w-8 text-emerald-700" aria-hidden="true" />
            <h2 id="impact-empty-title" className="mt-5 text-2xl font-bold text-primary">第一份绿意，从一次选择开始</h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              保存一段航班，或在商城完成一次绿色兑换；这里会只展示真实发生的成果。
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/calculator" className={cn(buttonVariants({ size: 'lg' }), 'h-10')}>
                记录一段航班
              </Link>
              <Link href="/mall" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'h-10')}>
                探索绿色商城
              </Link>
            </div>
          </section>
        )}

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]" aria-label="成果总览">
          <div className="impact-grove journey-surface-heavy border p-6 sm:p-8">
            <div className="relative z-10 flex min-h-64 flex-col justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">我的植树收藏</p>
                <p className="mt-2 text-5xl font-bold tracking-tight text-primary">
                  {impact.treeCount.toLocaleString()}
                  <span className="ml-2 text-lg font-medium text-muted-foreground">棵</span>
                </p>
                <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
                  仅计未取消的 TREE- 凭证订单。这里是演示项目兑换收藏，不代表第三方登记或真实核销。
                </p>
              </div>
              <div className="mt-8 flex min-h-20 items-end gap-2" aria-hidden="true">
                {representativeTrees.length > 0 ? representativeTrees.map((_, index) => (
                  <TreePine
                    key={index}
                    className={cn('text-emerald-700/80', index % 2 === 0 ? 'h-14 w-14' : 'h-10 w-10')}
                  />
                )) : (
                  <TreePine className="h-14 w-14 text-emerald-700/30" />
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <div className="journey-surface-light border p-5 sm:p-6">
              <WalletCards className="h-5 w-5 text-emerald-700" aria-hidden="true" />
              <p className="mt-5 text-sm text-muted-foreground">已用于绿色兑换</p>
              <p className="mt-1 break-words text-3xl font-bold text-primary">
                {impact.redeemedMiles.toLocaleString()}
                <span className="ml-2 text-sm font-medium text-muted-foreground">里程净额</span>
              </p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">按全量兑换与退款账本计算，不按商品现价回算。</p>
            </div>
            <div className="journey-surface-light border p-5 sm:p-6">
              <Leaf className="h-5 w-5 text-emerald-700" aria-hidden="true" />
              <p className="mt-5 text-sm text-muted-foreground">未来十年预计固碳</p>
              <p className="mt-1 break-words text-3xl font-bold text-primary">
                {impact.projectedOffsetKg.toLocaleString()}
                <span className="ml-2 text-sm font-medium text-muted-foreground">kg CO₂</span>
              </p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">演示模型：22 kg/棵/年 × 10 年；不抵扣已发生排放。</p>
            </div>
          </div>
        </section>

        <section className="mt-8" aria-labelledby="milestones-title">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold tracking-[0.2em] text-emerald-700 uppercase">Milestones</p>
              <h2 id="milestones-title" className="mt-2 text-2xl font-bold text-primary">行动里程碑</h2>
            </div>
            <Award className="h-7 w-7 text-emerald-700" aria-hidden="true" />
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {milestones.map(({ key, title, description, unlockedAt, Icon }) => (
              <div key={key} className="journey-surface-light border p-5">
                <div className="flex items-start justify-between gap-3">
                  <span className={cn(
                    'flex h-11 w-11 items-center justify-center rounded-full',
                    unlockedAt ? 'bg-emerald-600 text-white' : 'bg-muted text-muted-foreground'
                  )}>
                    <Icon aria-hidden="true" />
                  </span>
                  {unlockedAt
                    ? <CheckCircle2 className="h-5 w-5 text-emerald-700" aria-label="已解锁" />
                    : <Circle className="h-5 w-5 text-muted-foreground" aria-label="待开启" />}
                </div>
                <h3 className="mt-5 font-semibold text-primary">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                <p className="mt-4 text-xs font-medium text-emerald-800 dark:text-emerald-200">
                  {unlockedAt ? `${formatRecordDate(unlockedAt)} 解锁` : '待开启'}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.72fr]" aria-label="凭证与足迹">
          <div className="journey-data-panel border p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-bold text-primary">凭证收藏</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  最近 {impact.certificateSources.length} 笔安全来源摘要 · 共 {impact.certificateCount.toLocaleString()} 份
                </p>
              </div>
              <Link href="/orders" className={cn(buttonVariants({ variant: 'outline' }))}>
                查看完整凭证 <ArrowRight aria-hidden="true" />
              </Link>
            </div>
            {impact.certificateSources.length > 0 ? (
              <div className="mt-5 divide-y divide-border">
                {impact.certificateSources.map((source, index) => {
                  const { label, Icon } = SOURCE_PRESENTATION[source.sourceType];
                  return (
                    <div key={`${source.sourceType}-${source.createdAt}-${index}`} className="journey-data-row flex items-start gap-3 py-4">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600/10 text-emerald-700">
                        <Icon aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="break-words font-medium text-primary">{source.productName}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {label} · {source.quantity.toLocaleString()} 份 · {formatRecordDate(source.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-6 rounded-xl bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground">
                暂无可收藏凭证，完成一次骑行卡、酒店券或植树兑换后会出现在这里。
              </p>
            )}
          </div>

          <div className="journey-surface-light border p-5 sm:p-6">
            <Plane className="h-6 w-6 text-emerald-700" aria-hidden="true" />
            <h2 className="mt-5 text-xl font-bold text-primary">足迹摘要</h2>
            <dl className="mt-5 grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs text-muted-foreground">保存航班</dt>
                <dd className="mt-1 text-2xl font-bold text-primary">{impact.flightCount.toLocaleString()} 段</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">已发生排放</dt>
                <dd className="mt-1 break-words text-2xl font-bold text-primary">{impact.totalCo2Kg.toLocaleString()} kg</dd>
              </div>
            </dl>
            <p className="mt-5 text-xs leading-5 text-muted-foreground">排放记录与未来固碳投影分开呈现，不计算碳中和百分比。</p>
            <div className="mt-6 grid gap-3">
              <Link href="/footprint" className={cn(buttonVariants(), 'justify-between')}>
                查看碳足迹趋势 <ArrowRight aria-hidden="true" />
              </Link>
              <Link href="/mall" className={cn(buttonVariants({ variant: 'outline' }), 'justify-between')}>
                继续绿色兑换 <ShoppingBag aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
