'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlertCircle, PackageCheck, RefreshCw, Truck } from 'lucide-react';

export interface AdminOrder {
  id: number;
  user_id: number;
  email: string;
  product_name: string;
  category: string;
  icon_type: string | null;
  status: string;
  quantity: number;
  mileage_cost: number;
  voucher_code: string | null;
  address: string | null;
  created_at: string;
}

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  pending: { label: '待发货', variant: 'secondary' },
  shipped: { label: '已发货', variant: 'outline' },
  completed: { label: '已完成', variant: 'default' },
  cancelled: { label: '已取消', variant: 'destructive' },
};

/** The single admin action each state allows: pending → shipped → completed */
const NEXT_ACTION: Record<string, { to: string; label: string }> = {
  pending: { to: 'shipped', label: '标记发货' },
  shipped: { to: 'completed', label: '标记完成' },
};

interface AdminOrdersTableProps {
  onUnauthorized: () => void;
}

type LoadState = 'loading' | 'success' | 'error';

function isAdminOrder(value: unknown): value is AdminOrder {
  if (!value || typeof value !== 'object') return false;
  const order = value as Record<string, unknown>;

  return Number.isSafeInteger(order.id)
    && Number.isSafeInteger(order.user_id)
    && typeof order.email === 'string'
    && typeof order.product_name === 'string'
    && typeof order.category === 'string'
    && (typeof order.icon_type === 'string' || order.icon_type === null)
    && typeof order.status === 'string'
    && Number.isSafeInteger(order.quantity)
    && typeof order.mileage_cost === 'number'
    && Number.isFinite(order.mileage_cost)
    && (typeof order.voucher_code === 'string' || order.voucher_code === null)
    && (typeof order.address === 'string' || order.address === null)
    && typeof order.created_at === 'string'
    && Number.isFinite(Date.parse(order.created_at));
}

function parseOrderList(payload: unknown): AdminOrder[] | null {
  if (!payload || typeof payload !== 'object') return null;
  const data = (payload as { data?: unknown }).data;
  return Array.isArray(data) && data.every(isAdminOrder) ? data : null;
}

export function AdminOrdersTable({ onUnauthorized }: AdminOrdersTableProps) {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [loadError, setLoadError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);

  const loadOrders = async ({ preserveCurrent = false }: { preserveCurrent?: boolean } = {}) => {
    if (!preserveCurrent) setLoadState('loading');
    setLoadError('');

    try {
      const res = await fetch('/api/admin/orders');
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      if (!res.ok) throw new Error('订单加载失败');

      const data = parseOrderList(await res.json());
      if (!data) throw new Error('订单响应格式异常');

      setOrders(data);
      setLoadState('success');
    } catch {
      const message = '订单暂时无法加载，请重试';
      if (preserveCurrent) {
        setLoadError(message);
      } else {
        setLoadState('error');
        setLoadError(message);
      }
    }
  };

  useEffect(() => {
    fetch('/api/admin/orders')
      .then((res) => {
        if (res.status === 401) {
          onUnauthorized();
          return null;
        }
        if (!res.ok) throw new Error('订单加载失败');
        return res.json();
      })
      .then((payload) => {
        if (!payload) return;
        const data = parseOrderList(payload);
        if (!data) throw new Error('订单响应格式异常');
        setOrders(data);
        setLoadState('success');
      })
      .catch(() => {
        setLoadError('订单暂时无法加载，请重试');
        setLoadState('error');
      });
  }, [onUnauthorized]);

  const handleTransition = async (order: AdminOrder, to: string) => {
    setBusyId(order.id);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: to }),
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || '操作失败');
        return;
      }
      setOrders((current) => current.map((item) => item.id === order.id ? { ...item, status: to } : item));
      toast.success(`订单 #${order.id} 已更新`);
      await loadOrders({ preserveCurrent: true });
    } catch {
      toast.error('操作失败，请稍后重试');
    } finally {
      setBusyId(null);
    }
  };

  if (loadState === 'loading') {
    return (
      <Card className="journey-data-panel border py-8 text-center" role="status" aria-live="polite">
        <p className="text-muted-foreground">正在加载订单...</p>
      </Card>
    );
  }

  if (loadState === 'error') {
    return (
      <Card className="journey-data-panel items-center border px-4 py-8 text-center">
        <AlertCircle className="h-8 w-8 text-destructive" aria-hidden="true" />
        <p className="text-sm text-destructive" role="alert">{loadError}</p>
        <Button variant="outline" onClick={() => void loadOrders()}>
          <RefreshCw aria-hidden="true" />
          重试订单加载
        </Button>
      </Card>
    );
  }

  if (orders.length === 0) {
    return (
      <Card className="journey-data-panel border px-4 py-8 text-center">
        <p className="text-muted-foreground">暂无订单</p>
        <p className="text-xs text-muted-foreground">会员产生实体商品订单后会显示在这里。</p>
      </Card>
    );
  }

  return (
    <>
      {loadError && (
        <div className="journey-surface-light mb-3 flex flex-wrap items-center justify-between gap-2 border px-4 py-3" role="alert">
          <p className="text-sm text-destructive">{loadError}</p>
          <Button variant="outline" size="sm" onClick={() => void loadOrders({ preserveCurrent: true })}>
            <RefreshCw aria-hidden="true" />
            重试刷新
          </Button>
        </div>
      )}
      <Card className="journey-data-panel border">
        <Table>
        <TableHeader>
          <TableRow>
            <TableHead>订单号</TableHead>
            <TableHead>用户</TableHead>
            <TableHead>商品</TableHead>
            <TableHead className="text-right">里程</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>下单时间</TableHead>
            <TableHead className="w-28 text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => {
            const status = STATUS_MAP[order.status] || { label: order.status, variant: 'outline' as const };
            const action = NEXT_ACTION[order.status];
            return (
              <TableRow key={order.id}>
                <TableCell className="font-mono">#{order.id}</TableCell>
                <TableCell className="text-muted-foreground">{order.email}</TableCell>
                <TableCell className="font-medium text-primary">
                  {order.product_name}
                  {order.quantity > 1 && (
                    <span className="text-muted-foreground"> × {order.quantity}</span>
                  )}
                </TableCell>
                <TableCell className="text-right">{order.mileage_cost.toLocaleString()}</TableCell>
                <TableCell>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {new Date(order.created_at).toLocaleString('zh-CN')}
                </TableCell>
                <TableCell className="text-right">
                  {action ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busyId === order.id}
                      aria-label={`${action.label} #${order.id}`}
                      onClick={() => handleTransition(order, action.to)}
                    >
                      {action.to === 'shipped' ? (
                        <Truck className="h-4 w-4 mr-1" />
                      ) : (
                        <PackageCheck className="h-4 w-4 mr-1" />
                      )}
                      {action.label}
                    </Button>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
        </Table>
      </Card>
    </>
  );
}
