'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Bike,
  Check,
  Copy,
  FolderOpen,
  Hotel,
  Leaf,
  RefreshCw,
  ShoppingBag,
  TreePine,
  Wallet,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SharePoster } from '@/components/SharePoster';
import { projectedOffsetKg } from '@/lib/carbon';
import { cn } from '@/lib/utils';
import { useUserStore } from '@/stores/userStore';

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

const TIP = '选择直飞航班可减少约 20% 碳排放';

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isOptionalString(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || typeof value === 'string';
}

function isOrder(value: unknown): value is Order {
  if (!value || typeof value !== 'object') return false;
  const order = value as Partial<Order>;
  return Number.isInteger(order.id) && (order.id ?? 0) > 0
    && typeof order.product_name === 'string'
    && typeof order.icon_type === 'string'
    && typeof order.category === 'string'
    && isFiniteNumber(order.mileage_cost) && order.mileage_cost >= 0
    && Number.isInteger(order.quantity) && (order.quantity ?? 0) > 0
    && typeof order.status === 'string'
    && typeof order.voucher_code === 'string'
    && typeof order.created_at === 'string'
    && isOptionalString(order.address)
    && isOptionalString(order.project_name)
    && isOptionalString(order.project_standard)
    && isOptionalString(order.project_vintage);
}

function isMilesTransaction(value: unknown): value is MilesTransaction {
  if (!value || typeof value !== 'object') return false;
  const transaction = value as Partial<MilesTransaction>;
  return Number.isInteger(transaction.id) && (transaction.id ?? 0) > 0
    && isFiniteNumber(transaction.amount)
    && (transaction.type === 'grant' || transaction.type === 'redeem' || transaction.type === 'refund')
    && (transaction.order_id === null || (Number.isInteger(transaction.order_id) && (transaction.order_id ?? 0) > 0))
    && (transaction.description === null || typeof transaction.description === 'string')
    && typeof transaction.created_at === 'string';
}

async function fetchOrdersData(signal: AbortSignal): Promise<Order[]> {
  const response = await fetch('/api/orders', { signal });
  if (!response.ok) throw new Error('订单暂时无法加载');
  const payload = await response.json() as { data?: unknown };
  if (!Array.isArray(payload.data) || !payload.data.every(isOrder)) {
    throw new Error('订单响应无效');
  }
  return payload.data;
}

async function fetchMilesData(signal: AbortSignal): Promise<{ transactions: MilesTransaction[]; balance: number }> {
  const response = await fetch('/api/miles', { signal });
  if (!response.ok) throw new Error('里程明细暂时无法加载');
  const payload = await response.json() as {
    data?: { transactions?: unknown; balance?: unknown };
  };
  if (!Array.isArray(payload.data?.transactions)
    || !payload.data.transactions.every(isMilesTransaction)
    || !isFiniteNumber(payload.data.balance)) {
    throw new Error('里程响应无效');
  }
  return { transactions: payload.data.transactions, balance: payload.data.balance };
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [transactions, setTransactions] = useState<MilesTransaction[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ledgerLoading, setLedgerLoading] = useState(true);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [ledgerError, setLedgerError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [cancelOrder, setCancelOrder] = useState<Order | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const ordersRequestSequence = useRef(0);
  const milesRequestSequence = useRef(0);
  const ordersController = useRef<AbortController | null>(null);
  const milesController = useRef<AbortController | null>(null);
  const orderFocusRefs = useRef(new Map<number, HTMLDivElement>());
  const focusOrderAnchorOnClose = useRef(false);
  const lastCancelOrderId = useRef<number | null>(null);
  const updateMilesBalance = useUserStore((state) => state.updateMilesBalance);

  const loadOrders = useCallback(async () => {
    const requestSequence = ++ordersRequestSequence.current;
    ordersController.current?.abort();
    const controller = new AbortController();
    ordersController.current = controller;
    setOrdersLoading(true);
    setOrdersError(null);
    try {
      const nextOrders = await fetchOrdersData(controller.signal);
      if (requestSequence !== ordersRequestSequence.current) return;
      setOrders(nextOrders);
      setOrdersError(null);
    } catch (error) {
      if (requestSequence === ordersRequestSequence.current && !isAbortError(error)) {
        setOrdersError('订单暂时无法加载');
      }
    } finally {
      if (requestSequence === ordersRequestSequence.current) {
        setOrdersLoading(false);
        if (ordersController.current === controller) ordersController.current = null;
      }
    }
  }, []);

  const loadMiles = useCallback(async () => {
    const requestSequence = ++milesRequestSequence.current;
    milesController.current?.abort();
    const controller = new AbortController();
    milesController.current = controller;
    setLedgerLoading(true);
    setLedgerError(null);
    try {
      const nextMiles = await fetchMilesData(controller.signal);
      if (requestSequence !== milesRequestSequence.current) return;
      setTransactions(nextMiles.transactions);
      setBalance(nextMiles.balance);
      setLedgerError(null);
    } catch (error) {
      if (requestSequence === milesRequestSequence.current && !isAbortError(error)) {
        setLedgerError('里程明细暂时无法加载');
      }
    } finally {
      if (requestSequence === milesRequestSequence.current) {
        setLedgerLoading(false);
        if (milesController.current === controller) milesController.current = null;
      }
    }
  }, []);

  useEffect(() => {
    const initialOrdersSequence = ++ordersRequestSequence.current;
    const initialMilesSequence = ++milesRequestSequence.current;
    const initialOrdersController = new AbortController();
    const initialMilesController = new AbortController();
    ordersController.current = initialOrdersController;
    milesController.current = initialMilesController;

    fetchOrdersData(initialOrdersController.signal)
      .then((nextOrders) => {
        if (initialOrdersSequence !== ordersRequestSequence.current) return;
        setOrders(nextOrders);
        setOrdersError(null);
      })
      .catch((error) => {
        if (initialOrdersSequence === ordersRequestSequence.current && !isAbortError(error)) {
          setOrdersError('订单暂时无法加载');
        }
      })
      .finally(() => {
        if (initialOrdersSequence === ordersRequestSequence.current) setOrdersLoading(false);
      });

    fetchMilesData(initialMilesController.signal)
      .then((nextMiles) => {
        if (initialMilesSequence !== milesRequestSequence.current) return;
        setTransactions(nextMiles.transactions);
        setBalance(nextMiles.balance);
        setLedgerError(null);
      })
      .catch((error) => {
        if (initialMilesSequence === milesRequestSequence.current && !isAbortError(error)) {
          setLedgerError('里程明细暂时无法加载');
        }
      })
      .finally(() => {
        if (initialMilesSequence === milesRequestSequence.current) setLedgerLoading(false);
      });

    return () => {
      initialOrdersController.abort();
      initialMilesController.abort();
      ordersRequestSequence.current += 1;
      milesRequestSequence.current += 1;
    };
  }, []);

  const retryOrders = () => {
    void loadOrders();
  };

  const retryMiles = () => {
    void loadMiles();
  };

  const requestCancellation = (order: Order) => {
    focusOrderAnchorOnClose.current = false;
    lastCancelOrderId.current = order.id;
    setCancelError(null);
    setCancelOrder(order);
  };

  const handleCancel = async () => {
    if (!cancelOrder) return;
    setCancellingId(cancelOrder.id);
    setCancelError(null);
    try {
      const response = await fetch(`/api/orders/${cancelOrder.id}/cancel`, { method: 'POST' });
      const payload = await response.json() as { data?: { new_balance?: number }; error?: string };
      if (!response.ok || typeof payload.data?.new_balance !== 'number') {
        throw new Error(payload.error || '取消失败');
      }
      const newBalance = payload.data.new_balance;
      updateMilesBalance(newBalance);
      setBalance(newBalance);
      setOrders((current) => current.map((order) => (
        order.id === cancelOrder.id ? { ...order, status: 'cancelled' } : order
      )));
      focusOrderAnchorOnClose.current = true;
      setCancelOrder(null);
      toast.success(`订单已取消，余额已更新为 ${newBalance.toLocaleString()} 里程`);
      setLedgerLoading(true);
      void loadMiles();
    } catch (error) {
      setCancelError(error instanceof Error ? error.message : '取消失败，请稍后重试');
    } finally {
      setCancellingId(null);
    }
  };

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      window.setTimeout(() => setCopiedCode((current) => current === code ? null : current), 2000);
    } catch {
      setCopiedCode(null);
      toast.error('券码复制失败，请手动选择复制');
    }
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
            <div className="journey-voucher-panel flex min-w-0 items-center gap-2 rounded-lg p-3">
              <code className="min-w-0 flex-1 break-all font-mono text-lg font-bold text-primary">
                {order.voucher_code}
              </code>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`复制券码 ${order.voucher_code}`}
                onClick={() => void handleCopy(order.voucher_code)}
              >
                {copiedCode === order.voucher_code
                  ? <Check className="h-4 w-4 text-accent" aria-hidden="true" />
                  : <Copy className="h-4 w-4" aria-hidden="true" />}
              </Button>
            </div>
            <p className="sr-only" aria-live="polite">
              {copiedCode === order.voucher_code ? '券码已复制' : ''}
            </p>
            {order.icon_type === 'hotel' && (
              <div className="flex justify-center rounded-lg bg-white p-2">
                <QRCodeSVG value={order.voucher_code} size={128} title="酒店优惠券二维码" />
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
            <div className="journey-voucher-panel rounded-lg p-4 text-center">
              <TreePine className="mx-auto mb-2 h-8 w-8 text-accent" aria-hidden="true" />
              <p className="text-sm font-medium text-primary">碳抵消证书</p>
              <p className="mt-1 text-xs text-muted-foreground">
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
            <div className="journey-voucher-panel rounded-lg p-3">
              <div className="mb-2 flex items-center gap-2">
                <Leaf className="h-4 w-4 text-accent" aria-hidden="true" />
                <span className="text-xs font-medium">绿色出行小贴士</span>
              </div>
              <p className="text-xs text-muted-foreground">{TIP}</p>
            </div>
          </div>
        );

      case 'bag':
        return (
          <div className="space-y-3">
            <div className="journey-voucher-panel rounded-lg p-4 text-center">
              <ShoppingBag className="mx-auto mb-2 h-8 w-8 text-accent" aria-hidden="true" />
              <p className="text-sm font-medium text-primary">订单状态</p>
              <Badge variant="secondary" className="mt-2">
                {(STATUS_MAP[order.status] || { label: order.status }).label}
              </Badge>
              <p className="mt-2 text-xs text-muted-foreground">我们将在 3-5 个工作日内发货</p>
            </div>
            {order.address && (
              <div className="journey-voucher-panel rounded-lg p-3">
                <p className="mb-1 text-xs font-medium">收货信息</p>
                <p className="break-words text-xs leading-relaxed text-muted-foreground">{order.address}</p>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="journey-page">
      <div className="relative mx-auto max-w-[1280px] px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary">我的订单</h1>
          <p className="mt-2 text-muted-foreground">查看兑换记录、里程明细和兑换凭证</p>
        </div>

        <Tabs defaultValue="orders">
          <TabsList className="mb-4 grid h-auto w-full grid-cols-2 sm:w-fit">
            <TabsTrigger value="orders">订单历史</TabsTrigger>
            <TabsTrigger value="miles">余额明细</TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            {ordersLoading ? (
              <div className="journey-surface-light border py-16 text-center text-muted-foreground" role="status">
                加载订单中...
              </div>
            ) : ordersError ? (
              <div className="journey-surface-light border py-16 text-center" role="alert">
                <p className="text-muted-foreground">{ordersError}</p>
                <Button variant="outline" className="mt-4" onClick={retryOrders}>
                  <RefreshCw aria-hidden="true" />
                  重试订单
                </Button>
              </div>
            ) : orders.length > 0 ? (
              <div className="space-y-4">
                {orders.map((order) => {
                  const Icon = ICON_MAP[order.icon_type] || ShoppingBag;
                  const status = STATUS_MAP[order.status] || { label: order.status, variant: 'outline' as const };
                  const cancellable = order.status === 'pending';

                  return (
                    <Card
                      key={order.id}
                      ref={(element) => {
                        if (element) orderFocusRefs.current.set(order.id, element);
                        else orderFocusRefs.current.delete(order.id);
                      }}
                      tabIndex={-1}
                      aria-label={`订单 ${order.product_name} 状态区`}
                      className="journey-surface-light border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-center gap-4">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10">
                            <Icon className="h-5 w-5 text-accent" aria-hidden="true" />
                          </div>
                          <div className="min-w-0">
                            <p className={cn('break-words font-medium text-primary', order.status === 'cancelled' && 'line-through opacity-70')}>
                              {order.product_name}
                              {order.quantity > 1 && <span className="text-muted-foreground"> × {order.quantity}</span>}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(order.created_at).toLocaleString('zh-CN')}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                          <span className="mr-auto whitespace-nowrap text-sm font-bold text-accent sm:mr-1">
                            -{order.mileage_cost.toLocaleString()} 里程
                          </span>
                          {order.status !== 'cancelled' && (
                            <Button variant="outline" size="sm" onClick={() => setSelectedOrder(order)}>
                              查看凭证
                            </Button>
                          )}
                          {cancellable && (
                            <Button
                              variant="outline"
                              size="sm"
                              aria-label={`取消订单 ${order.product_name}`}
                              onClick={() => requestCancellation(order)}
                            >
                              取消订单
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
              <div className="journey-surface-light border py-16 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <FolderOpen className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
                </div>
                <p className="text-muted-foreground">暂无兑换记录</p>
                <Link href="/mall" className={cn(buttonVariants({ variant: 'outline' }), 'mt-4')}>
                  去商城看看
                </Link>
              </div>
            )}
          </TabsContent>

          <TabsContent value="miles">
            <Card className="journey-data-panel border">
              <CardContent className="p-4">
                {ledgerLoading ? (
                  <p className="py-12 text-center text-muted-foreground" role="status">加载里程明细中...</p>
                ) : ledgerError ? (
                  <div className="py-12 text-center" role="alert">
                    <p className="text-muted-foreground">{ledgerError}</p>
                    <Button variant="outline" className="mt-4" onClick={retryMiles}>
                      <RefreshCw aria-hidden="true" />
                      重试明细
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="mb-2 flex items-center gap-2 border-b border-border pb-4">
                      <Wallet className="h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
                      <span className="text-sm text-muted-foreground">当前余额</span>
                      <span className="ml-auto break-all text-right text-xl font-bold text-primary">
                        {(balance ?? 0).toLocaleString()}
                      </span>
                    </div>
                    {transactions.length > 0 ? (
                      <div className="divide-y divide-border">
                        {transactions.map((transaction) => (
                          <div key={transaction.id} className="journey-data-row flex items-start justify-between gap-3 py-3">
                            <div className="min-w-0">
                              <p className="break-words text-sm text-primary">
                                {transaction.description || (transaction.type === 'grant' ? '发放' : transaction.type === 'refund' ? '退款' : '兑换')}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(transaction.created_at).toLocaleString('zh-CN')}
                              </p>
                            </div>
                            <span className={cn('shrink-0 font-mono text-sm font-bold', transaction.amount > 0 ? 'text-accent' : 'text-destructive')}>
                              {transaction.amount > 0 ? '+' : ''}{transaction.amount.toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="py-8 text-center text-muted-foreground">暂无里程记录</p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog
        open={cancelOrder !== null}
        onOpenChange={(open) => {
          if (!open && cancellingId === null) {
            setCancelOrder(null);
            setCancelError(null);
          }
        }}
        onOpenChangeComplete={(open) => {
          if (!open && focusOrderAnchorOnClose.current && lastCancelOrderId.current !== null) {
            orderFocusRefs.current.get(lastCancelOrderId.current)?.focus({ preventScroll: true });
            focusOrderAnchorOnClose.current = false;
          }
        }}
      >
        <DialogContent
          className="journey-portal-surface sm:max-w-sm"
          finalFocus={() => focusOrderAnchorOnClose.current ? false : true}
        >
          <DialogHeader>
            <DialogTitle>确认取消订单</DialogTitle>
            <DialogDescription>
              {cancelOrder && `确认取消「${cancelOrder.product_name}」？${cancelOrder.mileage_cost.toLocaleString()} 里程将退回余额。`}
            </DialogDescription>
          </DialogHeader>
          {cancelError && <p className="text-sm text-destructive" role="alert">{cancelError}，可重试。</p>}
          <DialogFooter>
            <Button variant="outline" disabled={cancellingId !== null} onClick={() => setCancelOrder(null)}>
              暂不取消
            </Button>
            <Button variant="destructive" disabled={cancellingId !== null} onClick={() => void handleCancel()}>
              {cancellingId !== null ? '取消中...' : cancelError ? '重试取消' : '确认取消'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={selectedOrder !== null} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="journey-portal-surface sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>凭证详情</DialogTitle>
            <DialogDescription>{selectedOrder?.product_name}</DialogDescription>
          </DialogHeader>
          {selectedOrder && renderVoucherDetail(selectedOrder)}
        </DialogContent>
      </Dialog>
    </div>
  );
}
