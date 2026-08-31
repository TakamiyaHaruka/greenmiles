'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bike, Hotel, TreePine, ShoppingBag, Copy, Check, Leaf } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';
import { SharePoster } from '@/components/SharePoster';
import { projectedOffsetKg } from '@/lib/carbon';

interface VoucherData {
  id: number;
  voucher_code: string;
  product_name: string;
  icon_type: string;
  category: string;
  mileage_cost: number;
  quantity?: number;
  status?: string;
  new_balance: number;
  project_name?: string;
  project_standard?: string;
  project_vintage?: string;
}

interface VoucherDisplayProps {
  voucher: VoucherData;
  onContinueShopping: () => void;
  onViewOrders: () => void;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  bike: Bike,
  hotel: Hotel,
  tree: TreePine,
  bag: ShoppingBag,
};

const TIPS = [
  '选择直飞航班可减少约 20% 碳排放',
  '经济舱的碳足迹仅为头等舱的 1/4',
  '轻装出行，每减少 1kg 行李可降低飞行碳排放',
  '选择新型飞机（如 A320neo）可显著降低碳排放',
];

export function VoucherDisplay({ voucher, onContinueShopping, onViewOrders }: VoucherDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [tip] = useState(() => TIPS[Math.floor(Math.random() * TIPS.length)]);
  const Icon = ICON_MAP[voucher.icon_type] || ShoppingBag;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(voucher.voucher_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable
    }
  };

  const renderVoucherContent = () => {
    switch (voucher.icon_type) {
      case 'bike':
      case 'hotel':
        return (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {voucher.icon_type === 'bike' ? '骑行卡券码' : '酒店优惠券码'}
            </p>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <code className="text-lg font-mono font-bold text-primary flex-1">
                {voucher.voucher_code}
              </code>
              <Button variant="ghost" size="icon-sm" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4 text-accent" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            {voucher.icon_type === 'hotel' && (
              <div className="flex justify-center pt-2">
                <QRCodeSVG value={voucher.voucher_code} size={128} />
              </div>
            )}
            <div className="flex justify-center pt-1">
              <SharePoster
                title={voucher.product_name}
                subtitle="GreenMiles 兑换券"
                rows={[
                  { label: '券码', value: voucher.voucher_code },
                  { label: '消耗里程', value: `${voucher.mileage_cost.toLocaleString()} 里程` },
                ]}
                serial={voucher.voucher_code}
                qrValue={voucher.voucher_code}
                fileName={`greenmiles-voucher-${voucher.voucher_code}`}
                buttonLabel="下载券码海报"
              />
            </div>
          </div>
        );

      case 'tree':
        return (
          <div className="space-y-3">
            <div className="p-4 bg-accent/10 rounded-lg text-center">
              <TreePine className="h-8 w-8 text-accent mx-auto mb-2" />
              <p className="text-sm font-medium text-primary">碳抵消证书</p>
              <p className="text-xs text-muted-foreground mt-1">
                您已通过「{voucher.project_name || '阿拉善荒漠植树造林'}」项目种下
                {(voucher.quantity ?? 1) > 1 ? `${voucher.quantity} 棵树` : '一棵树'}
              </p>
            </div>
            <div className="flex justify-center">
              <SharePoster
                title="植树公益证书"
                subtitle={voucher.project_name || '阿拉善荒漠植树造林'}
                rows={[
                  { label: '种树', value: `${voucher.quantity ?? 1} 棵` },
                  { label: '项目标准', value: voucher.project_standard || 'CCER（演示口径）' },
                  { label: '项目年份', value: voucher.project_vintage || '—' },
                  { label: '十年预计固定', value: `${projectedOffsetKg(voucher.quantity ?? 1).toLocaleString()} kg CO₂` },
                ]}
                serial={voucher.voucher_code}
                fileName={`greenmiles-tree-${voucher.voucher_code}`}
                buttonLabel="下载证书海报"
              />
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Leaf className="h-4 w-4 text-accent" />
                <span className="text-xs font-medium">绿色出行小贴士</span>
              </div>
              <p className="text-xs text-muted-foreground">{tip}</p>
            </div>
          </div>
        );

      case 'bag':
        return (
          <div className="space-y-3">
            <div className="p-4 bg-muted rounded-lg text-center">
              <ShoppingBag className="h-8 w-8 text-accent mx-auto mb-2" />
              <p className="text-sm font-medium text-primary">订单状态</p>
              <Badge variant="secondary" className="mt-2">待发货</Badge>
              <p className="text-xs text-muted-foreground mt-2">
                我们将在 3-5 个工作日内发货
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-3">
          <Icon className="h-6 w-6 text-accent" />
        </div>
        <h3 className="text-lg font-bold text-primary">兑换成功</h3>
        <p className="text-sm text-muted-foreground">
          {voucher.product_name}
          {(voucher.quantity ?? 1) > 1 && ` × ${voucher.quantity}`}
        </p>
      </div>

      {renderVoucherContent()}

      <div className="flex gap-3 pt-2">
        <Button variant="outline" className="flex-1" onClick={onContinueShopping}>
          继续购物
        </Button>
        <Button className="flex-1" onClick={onViewOrders}>
          查看订单
        </Button>
      </div>
    </div>
  );
}
