'use client';

import { Share2, TreePine } from 'lucide-react';
import { SharePoster, type PosterRow } from '@/components/SharePoster';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface ImpactShareDialogProps {
  redeemedMiles: number;
  treeCount: number;
  flightCount: number;
  projectedOffsetKg: number;
}

export function ImpactShareDialog({
  redeemedMiles,
  treeCount,
  flightCount,
  projectedOffsetKg,
}: ImpactShareDialogProps) {
  const rows: PosterRow[] = [
    { label: '绿色兑换净额', value: `${redeemedMiles.toLocaleString()} 里程` },
    { label: '支持植树', value: `${treeCount.toLocaleString()} 棵` },
    { label: '保存航班', value: `${flightCount.toLocaleString()} 段` },
    { label: '十年预计固碳', value: `${projectedOffsetKg.toLocaleString()} kg CO₂` },
  ];

  return (
    <Dialog>
      <DialogTrigger render={<Button type="button" size="lg" />}>
        <Share2 aria-hidden="true" />
        预览分享卡
      </DialogTrigger>
      <DialogContent className="journey-portal-surface max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>成果分享预览</DialogTitle>
          <DialogDescription>
            导出的 PNG 只包含以下汇总，不含邮箱、航线、券码、订单号或地址。
          </DialogDescription>
        </DialogHeader>

        <div className="impact-share-card" data-testid="impact-share-preview">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-600 text-white">
              <TreePine aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-bold tracking-[0.2em] text-emerald-700 uppercase">GreenMiles</p>
              <p className="font-semibold text-primary">绿色旅行者 · 全部时间</p>
            </div>
          </div>
          <h2 className="mt-6 text-2xl font-bold text-primary">我的绿色成果</h2>
          <dl className="mt-5 grid gap-3 sm:grid-cols-2">
            {rows.map((row) => (
              <div key={row.label} className="rounded-xl border border-emerald-950/10 bg-white/90 p-3">
                <dt className="text-xs text-slate-600">{row.label}</dt>
                <dd className="mt-1 break-words font-bold text-slate-950">{row.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-5 text-xs leading-5 text-muted-foreground">
            十年预计固碳按每棵树每年 22 kg CO₂ 计算，为演示模型，不代表真实核销或碳中和。
          </p>
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" type="button" />}>
            返回
          </DialogClose>
          <SharePoster
            title="我的绿色成果"
            subtitle="GreenMiles 绿色旅行者 · 全部时间"
            rows={rows}
            footnote="演示模型：22 kg CO₂/棵/年 × 10 年"
            fileName="greenmiles-impact"
            buttonLabel="下载成果 PNG"
            buttonSize="default"
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
