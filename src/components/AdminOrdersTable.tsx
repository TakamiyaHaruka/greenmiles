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
import { Truck, PackageCheck } from 'lucide-react';

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

export function AdminOrdersTable() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const loadOrders = async () => {
    const res = await fetch('/api/admin/orders');
    const data = await res.json();
    setOrders(data.data || []);
  };

  useEffect(() => {
    fetch('/api/admin/orders')
      .then((res) => res.json())
      .then((data) => setOrders(data.data || []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  const handleTransition = async (order: AdminOrder, to: string) => {
    setBusyId(order.id);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: to }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || '操作失败');
        return;
      }
      toast.success(`订单 #${order.id} 已更新`);
      await loadOrders();
    } catch {
      toast.error('操作失败，请稍后重试');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return <p className="text-center py-8 text-muted-foreground">加载中...</p>;
  }

  if (orders.length === 0) {
    return <p className="text-center py-8 text-muted-foreground">暂无订单</p>;
  }

  return (
    <Card className="border border-[#E2E8F0]">
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
  );
}
