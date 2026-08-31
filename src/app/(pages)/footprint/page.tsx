'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Plane, TreePine, Leaf, CalendarRange, FileBarChart } from 'lucide-react';
import { SharePoster } from '@/components/SharePoster';
import { groupByMonth, groupByQuarter, type FootprintRecord } from '@/lib/footprint';
import { projectedOffsetKg, AIRCRAFT_TYPES, CABIN_CLASSES } from '@/lib/carbon';
import type { AircraftType, CabinClass } from '@/lib/carbon';

interface CarbonStats {
  flightCount: number;
  totalCo2Kg: number;
  myTrees: number;
  records: FootprintRecord[];
}

function aircraftLabel(type: string): string {
  return AIRCRAFT_TYPES[type as AircraftType]?.label || type;
}

function cabinLabel(cls: string): string {
  return CABIN_CLASSES[cls as CabinClass]?.label || cls;
}

export default function FootprintPage() {
  const [stats, setStats] = useState<CarbonStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/carbon')
      .then((res) => res.json())
      .then((data) => setStats(data.data || null))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-[1280px] px-4 py-8 text-center py-16 text-muted-foreground">
          加载中...
        </div>
      </div>
    );
  }

  const records = stats?.records || [];
  const myTrees = stats?.myTrees || 0;
  const projection = projectedOffsetKg(myTrees);
  const monthly = groupByMonth(records).slice(-6);
  const quarterly = groupByQuarter(records);
  const latestQuarter = quarterly[quarterly.length - 1];

  const kpis = [
    { label: '航班次数', value: `${stats?.flightCount ?? 0}`, icon: Plane },
    { label: '累计碳排放', value: `${(stats?.totalCo2Kg ?? 0).toLocaleString()} kg`, icon: Leaf },
    { label: '我的树', value: `${myTrees} 棵`, icon: TreePine },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1280px] px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary">碳足迹</h1>
          <p className="text-muted-foreground mt-2">你的飞行记录、抵消进度与时间维度的投影</p>
        </div>

        {/* Projection hero */}
        <Card className="border border-[#E2E8F0] mb-6 bg-accent/5">
          <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
              <TreePine className="h-7 w-7 text-accent" />
            </div>
            <div className="flex-1">
              <p className="text-lg font-bold text-primary">
                {myTrees} 棵树 · 十年累计固定 {projection.toLocaleString()} kg CO₂
              </p>
              <p className="text-sm text-muted-foreground mt-1">
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
                footnote={`按每棵树每年 22 kg CO₂ 计`}
                fileName="greenmiles-certificate"
                buttonLabel="下载证书海报"
              />
            )}
          </CardContent>
        </Card>

        {/* KPI row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <Card key={kpi.label} className="border border-[#E2E8F0]">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{kpi.label}</p>
                    <p className="text-xl font-bold text-primary">{kpi.value}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly trend */}
          <Card className="border border-[#E2E8F0]">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarRange className="h-4 w-4 text-accent" />
                月度碳排放趋势
              </CardTitle>
            </CardHeader>
            <CardContent>
              {monthly.length > 0 ? (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthly}>
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="co2Kg" name="CO₂ (kg)" fill="#10B981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-center py-10 text-muted-foreground">还没有飞行记录，去计算器记一笔吧</p>
              )}
            </CardContent>
          </Card>

          {/* Quarterly report */}
          <Card className="border border-[#E2E8F0]">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileBarChart className="h-4 w-4 text-accent" />
                季度报告
              </CardTitle>
            </CardHeader>
            <CardContent>
              {latestQuarter ? (
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium text-primary">{latestQuarter.label}</p>
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div>
                        <p className="text-xs text-muted-foreground">航班</p>
                        <p className="text-lg font-bold text-primary">{latestQuarter.count} 次</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">碳排放</p>
                        <p className="text-lg font-bold text-primary">{latestQuarter.co2Kg.toLocaleString()} kg</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">我的树</p>
                        <p className="text-lg font-bold text-primary">{myTrees} 棵</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">十年固定</p>
                        <p className="text-lg font-bold text-accent">{projection.toLocaleString()} kg</p>
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
                <p className="text-center py-10 text-muted-foreground">暂无季度数据</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Flight records */}
        <Card className="border border-[#E2E8F0] mt-6">
          <CardHeader>
            <CardTitle className="text-base">飞行记录（最近 50 条）</CardTitle>
          </CardHeader>
          <CardContent>
            {records.length > 0 ? (
              <div className="divide-y divide-[#E2E8F0]">
                {records.map((record) => (
                  <div key={record.id} className="flex items-center justify-between gap-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-accent/10 flex items-center justify-center">
                        <Plane className="h-4 w-4 text-accent" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-primary">
                          {record.route || `${record.distance} km`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {aircraftLabel(record.aircraft_type)} · {cabinLabel(record.cabin_class)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary">{record.co2_kg} kg</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(record.created_at.replace(' ', 'T') + 'Z').toLocaleDateString('zh-CN')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-10 text-muted-foreground">还没有飞行记录</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
