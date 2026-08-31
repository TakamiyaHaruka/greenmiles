'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Bike, Hotel, TreePine, ShoppingBag, FolderOpen, Copy, Check, Leaf, Wallet } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { useUserStore } from '@/stores/userStore';
import { SharePoster } from '@/components/SharePoster';
import { projectedOffsetKg } from '@/lib/carbon';

interface Order {
  id: number;
  product_name: string;
  icon_type: string;
  category: string;
  mileage_cost: number;
  quantity: number;
  status: string;
  voucher_code: string;
  address?: string | null;
  created_at: string;
  project_name?: string;
  project_standard?: string;
  project_vintage?: string;
}

interface MilesTransaction {
  id: number;
  amount: number;
  type: 'grant' | 'redeem' | 'refund';
  order_id: number | null;
  description: string | null;
  created_at: string;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  bike: Bike,
  hotel: Hotel,
  tree: TreePine,
  bag: ShoppingBag,
};

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  completed: { label: '已完成', variant: 'default' },
  pending: { label: '待发货', variant: 'secondary' },
  shipped: { label: '已发货', variant: 'outline' },
  cancelled: { label: '已取消', variant: 'destructive' },
};

const TIPS = [
  '选择直飞航班可减少约 20% 碳排放',
  '经济舱的碳足迹仅为头等舱的 1/4',
  '轻装出行，每减少 1kg 行李可降低飞行碳排放',
];

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [transactions, setTransactions] = useState<MilesTransaction[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [copied, setCopied] = useState(false);
  const updateMilesBalance = useUserStore((state) => state.updateMilesBalance);

  const loadMiles = () => {
    fetch('/api/miles')
      .then((res) => res.json())
      .then((data) => {
        setTransactions(data.data?.transactions || []);
        setBalance(data.data?.balance ?? null);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetch('/api/orders')
      .then((res) => res.json())
      .then((data) => setOrders(data.data || []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
    loadMiles();
  }, []);

  const handleCancel = async (order: Order) => {
    if (!window.confirm(`确认取消订单「${order.product_name}」？${order.mileage_cost.toLocaleString()} 里程将退回余额。`)) return;
    setCancellingId(order.id);
    try {
      const res = await fetch(`/api/orders/${order.id}/cancel`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || '取消失败');
        return;
      }
      toast.success(`订单已取消，${data.data.new_balance.toLocaleString()} 里程已退回`);
      updateMilesBalance(data.data.new_balance);
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: 'cancelled' } : o)));
      loadMiles();
    } catch {
      toast.error('取消失败，请稍后重试');
    } finally {
      setCancellingId(null);
    }
  };

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
            <div className="flex justify-center pt-1">
              <SharePoster
                title={order.product_name}
                subtitle="GreenMiles 兑换券"
                rows={[
                  { label: '券码', value: order.voucher_code },
                  { label: '消耗里程', value: `${order.mileage_cost.toLocaleString()} 里程` },
                ]}
                serial={order.voucher_code}
                qrValue={order.voucher_code}
                fileName={`greenmiles-voucher-${order.voucher_code}`}
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
                您已通过「{order.project_name || '阿拉善荒漠植树造林'}」项目种下
                {order.quantity > 1 ? `${order.quantity} 棵树` : '一棵树'}
              </p>
            </div>
            <div className="flex justify-center">
              <SharePoster
                title="植树公益证书"
                subtitle={order.project_name || '阿拉善荒漠植树造林'}
                rows={[
                  { label: '种树', value: `${order.quantity} 棵` },
                  { label: '项目标准', value: order.project_standard || 'CCER（演示口径）' },
                  { label: '项目年份', value: order.project_vintage || '—' },
                  { label: '十年预计固定', value: `${projectedOffsetKg(order.quantity).toLocaleString()} kg CO₂` },
                ]}
                serial={order.voucher_code}
                fileName={`greenmiles-tree-${order.voucher_code}`}
                buttonLabel="下载证书海报"
              />
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
          <div className="space-y-3">
            <div className="p-4 bg-muted rounded-lg text-center">
              <ShoppingBag className="h-8 w-8 text-accent mx-auto mb-2" />
              <p className="text-sm font-medium text-primary">订单状态</p>
              <Badge variant="secondary" className="mt-2">
                {(STATUS_MAP[order.status] || { label: order.status }).label}
              </Badge>
              <p className="text-xs text-muted-foreground mt-2">
                我们将在 3-5 个工作日内发货
              </p>
            </div>
            {order.address && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs font-medium mb-1">收货信息</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{order.address}</p>
              </div>
            )}
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
        ) : (
          <Tabs defaultValue="orders">
            <TabsList className="mb-4">
              <TabsTrigger value="orders">订单历史</TabsTrigger>
              <TabsTrigger value="miles">余额明细</TabsTrigger>
            </TabsList>

            <TabsContent value="orders">
              {orders.length > 0 ? (
                <div className="space-y-4">
                  {orders.map((order) => {
                    const Icon = ICON_MAP[order.icon_type] || ShoppingBag;
                    const status = STATUS_MAP[order.status] || { label: order.status, variant: 'outline' as const };
                    const cancellable = order.status === 'pending';

                    return (
                      <Card
                        key={order.id}
                        className={cn(
                          'border border-[#E2E8F0] transition-shadow',
                          order.status !== 'cancelled' && 'cursor-pointer hover:shadow-md'
                        )}
                        onClick={() => order.status !== 'cancelled' && setSelectedOrder(order)}
                      >
                        <CardContent className="p-4 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center">
                              <Icon className="h-5 w-5 text-accent" />
                            </div>
                            <div>
                              <p className={cn('font-medium text-primary', order.status === 'cancelled' && 'line-through opacity-70')}>
                                {order.product_name}
                                {order.quantity > 1 && (
                                  <span className="text-muted-foreground"> × {order.quantity}</span>
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(order.created_at).toLocaleString('zh-CN')}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-accent whitespace-nowrap">
                              -{order.mileage_cost.toLocaleString()} 里程
                            </span>
                            {cancellable && (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={cancellingId === order.id}
                                aria-label={`取消订单 ${order.product_name}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCancel(order);
                                }}
                              >
                                {cancellingId === order.id ? '取消中...' : '取消订单'}
                              </Button>
                            )}
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
            </TabsContent>

            <TabsContent value="miles">
              <Card className="border border-[#E2E8F0]">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 pb-4 mb-2 border-b border-[#E2E8F0]">
                    <Wallet className="h-5 w-5 text-accent" />
                    <span className="text-sm text-muted-foreground">当前余额</span>
                    <span className="ml-auto text-xl font-bold text-primary">
                      {(balance ?? 0).toLocaleString()}
                    </span>
                  </div>
                  {transactions.length > 0 ? (
                    <div className="divide-y divide-[#E2E8F0]">
                      {transactions.map((tx) => (
                        <div key={tx.id} className="flex items-center justify-between gap-4 py-3">
                          <div>
                            <p className="text-sm text-primary">{tx.description || (tx.type === 'grant' ? '发放' : tx.type === 'refund' ? '退款' : '兑换')}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(tx.created_at).toLocaleString('zh-CN')}
                            </p>
                          </div>
                          <span
                            className={cn(
                              'text-sm font-bold font-mono',
                              tx.amount > 0 ? 'text-accent' : 'text-destructive'
                            )}
                          >
                            {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-8 text-muted-foreground">暂无里程记录</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
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
