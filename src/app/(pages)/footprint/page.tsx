'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CalendarRange, FileBarChart, Leaf, Plane, RefreshCw, TreePine } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SharePoster } from '@/components/SharePoster';
import { AIRCRAFT_TYPES, CABIN_CLASSES, projectedOffsetKg } from '@/lib/carbon';
import type { AircraftType, CabinClass } from '@/lib/carbon';
import { groupByMonth, groupByQuarter, type FootprintRecord } from '@/lib/footprint';
import { cn } from '@/lib/utils';

interface CarbonStats {
  flightCount: number;
  totalCo2Kg: number;
  myTrees: number;
  records: FootprintRecord[];
}

function aircraftLabel(type: string): string {
  return AIRCRAFT_TYPES[type as AircraftType]?.label || type;
}

function cabinLabel(cabinClass: string): string {
  return CABIN_CLASSES[cabinClass as CabinClass]?.label || cabinClass;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isFootprintRecord(value: unknown): value is FootprintRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<FootprintRecord>;
  return Number.isInteger(record.id) && (record.id ?? 0) > 0
    && isFiniteNumber(record.distance) && record.distance >= 0
    && typeof record.aircraft_type === 'string'
    && typeof record.cabin_class === 'string'
    && isFiniteNumber(record.co2_kg) && record.co2_kg >= 0
    && (record.route === null || typeof record.route === 'string')
    && typeof record.created_at === 'string';
}

function isCarbonStats(value: unknown): value is CarbonStats {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<CarbonStats>;
  return Number.isInteger(candidate.flightCount) && (candidate.flightCount ?? -1) >= 0
    && isFiniteNumber(candidate.totalCo2Kg) && candidate.totalCo2Kg >= 0
    && Number.isInteger(candidate.myTrees) && (candidate.myTrees ?? -1) >= 0
    && Array.isArray(candidate.records)
    && candidate.records.every(isFootprintRecord);
}

export default function FootprintPage() {
  const [stats, setStats] = useState<CarbonStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const loadFootprint = useCallback(async () => {
    try {
      const response = await fetch('/api/carbon');
      if (!response.ok) throw new Error('碳足迹暂时无法加载');
      const payload = await response.json() as { data?: unknown };
      if (!isCarbonStats(payload.data)) throw new Error('碳足迹响应无效');
      setStats(payload.data);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetch('/api/carbon')
      .then((response) => {
        if (!response.ok) throw new Error('碳足迹暂时无法加载');
        return response.json();
      })
      .then((payload: { data?: unknown }) => {
        if (!isCarbonStats(payload.data)) throw new Error('碳足迹响应无效');
        if (active) setStats(payload.data);
      })
      .catch(() => { if (active) setLoadError(true); })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, []);

  const retryFootprint = () => {
    setLoading(true);
    setLoadError(false);
    void loadFootprint();
  };

  if (loading) {
    return (
      <div className="journey-page">
        <div className="relative mx-auto max-w-[1280px] px-4 py-8">
          <div className="journey-surface-light border py-16 text-center text-muted-foreground" role="status">
            加载碳足迹中...
          </div>
        </div>
      </div>
    );
  }

  if (loadError || !stats) {
    return (
      <div className="journey-page">
        <div className="relative mx-auto max-w-[1280px] px-4 py-8">
          <div className="journey-surface-light border py-16 text-center" role="alert">
            <p className="text-muted-foreground">碳足迹暂时无法加载</p>
            <Button variant="outline" className="mt-4" onClick={retryFootprint}>
              <RefreshCw aria-hidden="true" />
              重试
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const records = stats.records;
  const myTrees = stats.myTrees;
  const projection = projectedOffsetKg(myTrees);
  const monthly = groupByMonth(records).slice(-6);
  const monthlySummary = monthly.map((bucket) => `${bucket.label} ${bucket.co2Kg.toLocaleString()} kg`).join('；');
  const quarterly = groupByQuarter(records);
  const latestQuarter = quarterly[quarterly.length - 1];
  const kpis = [
    { label: '航班次数', value: `${stats.flightCount}`, icon: Plane },
    { label: '累计碳排放', value: `${stats.totalCo2Kg.toLocaleString()} kg`, icon: Leaf },
    { label: '我的树', value: `${myTrees} 棵`, icon: TreePine },
  ];

  return (
    <div className="journey-page">
      <div className="relative mx-auto max-w-[1280px] px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary">碳足迹</h1>
          <p className="mt-2 text-muted-foreground">你的飞行记录、抵消进度与时间维度的投影</p>
        </div>

        <Card className="journey-surface-heavy mb-6 border">
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent/10">
              <TreePine className="h-7 w-7 text-accent" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="break-words text-lg font-bold text-primary">
                {myTrees} 棵树 · 十年累计固定 {projection.toLocaleString()} kg CO₂
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                每棵树每年吸收约 22 kg CO₂，十年是一段看得见的时间
              </p>
            </div>
            {myTrees > 0 && (
              <SharePoster
                title="我的绿色抵消证书"
                subtitle="GreenMiles 碳抵消记录"
                rows={[
                  { label: '累计种树', value: `${myTrees} 棵` },
                  { label: '十年预计固定', value: `${projection.toLocaleString()} kg CO₂` },
                ]}
                footnote="按每棵树每年 22 kg CO₂ 计"
                fileName="greenmiles-certificate"
                buttonLabel="下载证书海报"
              />
            )}
          </CardContent>
        </Card>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <Card key={kpi.label} className="journey-surface-light border">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10">
                    <Icon className="h-5 w-5 text-accent" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{kpi.label}</p>
                    <p className="break-words text-xl font-bold text-primary">{kpi.value}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="journey-surface-light border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarRange className="h-4 w-4 text-accent" aria-hidden="true" />
                月度碳排放趋势
              </CardTitle>
            </CardHeader>
            <CardContent>
              {monthly.length > 0 ? (
                <>
                  <p id="monthly-chart-summary" className="sr-only">
                    月度碳排放趋势：{monthlySummary}
                  </p>
                  <div
                    className="journey-chart-panel h-64 min-w-0 p-2 sm:p-4"
                    role="img"
                    aria-label="月度碳排放柱状图"
                    aria-describedby="monthly-chart-summary"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthly} accessibilityLayer margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} width={52} />
                        <Tooltip
                          cursor={{ fill: 'var(--journey-control-hover)', opacity: 0.45 }}
                          contentStyle={{
                            background: 'var(--home-solid-heavy)',
                            border: '1px solid var(--journey-control-border)',
                            borderRadius: '0.75rem',
                            color: 'var(--foreground)',
                            boxShadow: 'var(--home-shadow-light)',
                          }}
                          labelStyle={{ color: 'var(--foreground)', fontWeight: 600 }}
                          itemStyle={{ color: 'var(--journey-control-ink)' }}
                        />
                        <Bar dataKey="co2Kg" name="CO₂ (kg)" fill="#10B981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              ) : (
                <div className="py-10 text-center">
                  <p className="text-muted-foreground">还没有飞行记录，去计算器记一笔吧</p>
                  <Link href="/calculator" className={cn(buttonVariants({ variant: 'outline' }), 'mt-4')}>
                    计算一次飞行碳排放
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="journey-surface-light border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileBarChart className="h-4 w-4 text-accent" aria-hidden="true" />
                季度报告
              </CardTitle>
            </CardHeader>
            <CardContent>
              {latestQuarter ? (
                <div className="space-y-4">
                  <div className="journey-data-panel p-4">
                    <p className="text-sm font-medium text-primary">{latestQuarter.label}</p>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">航班</p>
                        <p className="text-lg font-bold text-primary">{latestQuarter.count} 次</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">碳排放</p>
                        <p className="break-words text-lg font-bold text-primary">{latestQuarter.co2Kg.toLocaleString()} kg</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">我的树</p>
                        <p className="text-lg font-bold text-primary">{myTrees} 棵</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">十年固定</p>
                        <p className="break-words text-lg font-bold text-accent">{projection.toLocaleString()} kg</p>
                      </div>
                    </div>
                  </div>
                  <SharePoster
                    title={`${latestQuarter.label} 飞行碳足迹季报`}
                    subtitle="GreenMiles 季度报告"
                    rows={[
                      { label: '航班次数', value: `${latestQuarter.count} 次` },
                      { label: '碳排放', value: `${latestQuarter.co2Kg.toLocaleString()} kg` },
                      { label: '累计种树', value: `${myTrees} 棵` },
                      { label: '十年预计固定', value: `${projection.toLocaleString()} kg CO₂` },
                    ]}
                    fileName={`greenmiles-report-${latestQuarter.key}`}
                    buttonLabel="下载季报海报"
                  />
                </div>
              ) : (
                <p className="py-10 text-center text-muted-foreground">暂无季度数据</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="journey-data-panel mt-6 border">
          <CardHeader>
            <CardTitle className="text-base">飞行记录（最近 50 条）</CardTitle>
          </CardHeader>
          <CardContent>
            {records.length > 0 ? (
              <div className="divide-y divide-border">
                {records.map((record) => (
                  <div key={record.id} className="journey-data-row flex items-start justify-between gap-3 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10">
                        <Plane className="h-4 w-4 text-accent" aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <p className="break-words text-sm font-medium text-primary">
                          {record.route || `${record.distance} km`}
                        </p>
                        <p className="break-words text-xs text-muted-foreground">
                          {aircraftLabel(record.aircraft_type)} · {cabinLabel(record.cabin_class)}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold text-primary">{record.co2_kg} kg</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(`${record.created_at.replace(' ', 'T')}Z`).toLocaleDateString('zh-CN')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center">
                <p className="text-muted-foreground">还没有飞行记录</p>
                <Link href="/calculator" className={cn(buttonVariants({ variant: 'outline' }), 'mt-4')}>
                  前往计算器
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
