'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/stores/cartStore';
import { useUserStore } from '@/stores/userStore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { VoucherDisplay } from '@/components/VoucherDisplay';
import { ShoppingCart, Trash2, Bike, Hotel, TreePine, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { toast } from 'sonner';

interface CartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface VoucherData {
  id: number;
  voucher_code: string;
  product_name: string;
  icon_type: string;
  category: string;
  mileage_cost: number;
  quantity?: number;
  new_balance: number;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  bike: Bike,
  hotel: Hotel,
  tree: TreePine,
  bag: ShoppingBag,
};

export function CartDialog({ open, onOpenChange }: CartDialogProps) {
  const { items, removeItem, totalMiles } = useCartStore();
  const { user, updateMilesBalance } = useUserStore();
  const router = useRouter();
  const balance = user?.miles_balance ?? 0;
  const total = totalMiles();

  const [confirmItem, setConfirmItem] = useState<typeof items[0] | null>(null);
  const [voucher, setVoucher] = useState<VoucherData | null>(null);
  const [settling, setSettling] = useState(false);

  const handleSettle = async (item: typeof items[0]) => {
    setSettling(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: item.id,
          quantity: item.quantity,
          address: item.address,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || '兑换失败');
        return;
      }

      // Update user balance
      updateMilesBalance(data.data.new_balance);
      // Remove from cart
      removeItem(item.id);
      // Show voucher
      setConfirmItem(null);
      setVoucher(data.data);
    } catch {
      toast.error('兑换失败，请稍后重试');
    } finally {
      setSettling(false);
    }
  };

  const handleContinueShopping = () => {
    setVoucher(null);
    onOpenChange(false);
    router.push('/mall');
  };

  const handleViewOrders = () => {
    setVoucher(null);
    onOpenChange(false);
    router.push('/orders');
  };

  // Voucher display dialog
  if (voucher) {
    return (
      <Dialog open={true} onOpenChange={() => setVoucher(null)}>
        <DialogContent className="sm:max-w-sm">
          <VoucherDisplay
            voucher={voucher}
            onContinueShopping={handleContinueShopping}
            onViewOrders={handleViewOrders}
          />
        </DialogContent>
      </Dialog>
    );
  }

  // Confirm dialog
  if (confirmItem) {
    return (
      <Dialog open={true} onOpenChange={() => setConfirmItem(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>确认兑换</DialogTitle>
            <DialogDescription>
              确认用 {(confirmItem.mileage_cost * confirmItem.quantity).toLocaleString()} 里程兑换{' '}
              {confirmItem.name}
              {confirmItem.quantity > 1 ? ` × ${confirmItem.quantity}` : ''}？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmItem(null)}>
              取消
            </Button>
            <Button onClick={() => handleSettle(confirmItem)} disabled={settling}>
              {settling ? '兑换中...' : '确认兑换'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-accent" />
            购物车
          </DialogTitle>
          <DialogDescription>
            {items.length > 0
              ? `共 ${items.length} 件商品`
              : '查看您选购的绿色商品'}
          </DialogDescription>
        </DialogHeader>

        {items.length > 0 ? (
          <>
            <div className="max-h-64 overflow-y-auto space-y-3">
              {items.map((item) => {
                const Icon = ICON_MAP[item.icon_type] || ShoppingBag;
                const itemTotal = item.mileage_cost * item.quantity;
                const canAfford = balance >= itemTotal;

                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 p-2 rounded-lg border border-[#E2E8F0]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-accent/10 flex items-center justify-center">
                        <Icon className="h-4 w-4 text-accent" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {item.name}
                          {item.quantity > 1 && (
                            <span className="text-muted-foreground"> × {item.quantity}</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.mileage_cost.toLocaleString()} 里程
                          {item.quantity > 1 && ` × ${item.quantity}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Button
                        size="sm"
                        disabled={!canAfford}
                        onClick={() => setConfirmItem(item)}
                      >
                        结算
                      </Button>
                      {!canAfford && (
                        <p className="text-xs text-destructive">
                          里程不足（还差 {(itemTotal - balance).toLocaleString()} 里程）
                        </p>
                      )}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeItem(item.id)}
                        aria-label={`移除 ${item.name}`}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">总计</span>
              <span className="text-lg font-bold text-accent">
                {total.toLocaleString()} 里程
              </span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <ShoppingCart className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">购物车空空如也</p>
            <Link
              href="/mall"
              className={cn(buttonVariants({ variant: 'outline' }), 'mt-4')}
              onClick={() => onOpenChange(false)}
            >
              去商城逛逛
            </Link>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
