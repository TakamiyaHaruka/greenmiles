'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Bike, Hotel, TreePine, ShoppingBag, FolderOpen, Copy, Check, Leaf } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

interface Order {
  id: number;
  product_name: string;
  icon_type: string;
  category: string;
  mileage_cost: number;
  status: string;
  voucher_code: string;
  created_at: string;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  bike: Bike,
  hotel: Hotel,
  tree: TreePine,
  bag: ShoppingBag,
};

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  completed: { label: '已完成', variant: 'default' },
  pending: { label: '待发货', variant: 'secondary' },
};

const TIPS = [
  '选择直飞航班可减少约 20% 碳排放',
  '经济舱的碳足迹仅为头等舱的 1/4',
  '轻装出行，每减少 1kg 行李可降低飞行碳排放',
];

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/orders')
      .then((res) => res.json())
      .then((data) => setOrders(data.data || []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  const handleCopy = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderVoucherDetail = (order: Order) => {
    switch (order.icon_type) {
      case 'bike':
      case 'hotel':
        return (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {order.icon_type === 'bike' ? '骑行卡券码' : '酒店优惠券码'}
            </p>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <code className="text-lg font-mono font-bold text-primary flex-1">
                {order.voucher_code}
              </code>
              <Button variant="ghost" size="icon-sm" onClick={() => handleCopy(order.voucher_code)}>
                {copied ? <Check className="h-4 w-4 text-accent" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            {order.icon_type === 'hotel' && (
              <div className="flex justify-center pt-2">
                <QRCodeSVG value={order.voucher_code} size={128} />
              </div>
            )}
          </div>
        );

      case 'tree':
        return (
          <div className="space-y-3">
            <div className="p-4 bg-accent/10 rounded-lg text-center">
              <TreePine className="h-8 w-8 text-accent mx-auto mb-2" />
              <p className="text-sm font-medium text-primary">碳抵消证书</p>
              <p className="text-xs text-muted-foreground mt-1">
                您已在阿拉善荒漠种下一棵树
              </p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Leaf className="h-4 w-4 text-accent" />
                <span className="text-xs font-medium">绿色出行小贴士</span>
              </div>
              <p className="text-xs text-muted-foreground">{TIPS[0]}</p>
            </div>
          </div>
        );

      case 'bag':
        return (
          <div className="p-4 bg-muted rounded-lg text-center">
            <ShoppingBag className="h-8 w-8 text-accent mx-auto mb-2" />
            <p className="text-sm font-medium text-primary">订单状态</p>
            <Badge variant="secondary" className="mt-2">待发货</Badge>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1280px] px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary">我的订单</h1>
          <p className="text-muted-foreground mt-2">
            查看兑换记录和凭证
          </p>
        </div>

        {loading ? (
          <div className="text-center py-16 text-muted-foreground">
            加载中...
          </div>
        ) : orders.length > 0 ? (
          <div className="space-y-4">
            {orders.map((order) => {
              const Icon = ICON_MAP[order.icon_type] || ShoppingBag;
              const status = STATUS_MAP[order.status] || { label: order.status, variant: 'outline' as const };

              return (
                <Card
                  key={order.id}
                  className="border border-[#E2E8F0] cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedOrder(order)}
                >
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center">
                        <Icon className="h-5 w-5 text-accent" />
                      </div>
                      <div>
                        <p className="font-medium text-primary">{order.product_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.created_at).toLocaleString('zh-CN')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-bold text-accent">
                        -{order.mileage_cost.toLocaleString()} 里程
                      </span>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <FolderOpen className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">暂无兑换记录</p>
            <Link
              href="/mall"
              className={cn(buttonVariants({ variant: 'outline' }), 'mt-4')}
            >
              去商城看看
            </Link>
          </div>
        )}
      </div>

      {/* Voucher Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>凭证详情</DialogTitle>
          </DialogHeader>
          {selectedOrder && renderVoucherDetail(selectedOrder)}
        </DialogContent>
      </Dialog>
    </div>
  );
}
