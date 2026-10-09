'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getCartItemQuantityLimit,
  MAX_CART_ITEM_QUANTITY,
  useCartStore,
} from '@/stores/cartStore';
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
import { ShoppingCart, Trash2, Bike, Hotel, TreePine, ShoppingBag, Minus, Plus } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { toast } from 'sonner';
import { publishProductCatalogChanged } from '@/lib/productCatalogSync';
import { useProductCatalog } from '@/hooks/useProductCatalog';

interface CartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant?: 'default' | 'home' | 'journey';
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

export function CartDialog({ open, onOpenChange, variant = 'default' }: CartDialogProps) {
  const {
    items,
    reconciliationNotices,
    incrementItem,
    decrementItem,
    removeItem,
    dismissReconciliationNotice,
    totalMiles,
    itemCount,
  } = useCartStore();
  const {
    loading: catalogLoading,
    validating: catalogValidating,
    validationError: catalogValidationError,
    validated: catalogValidated,
    retry: retryCatalog,
  } = useProductCatalog({ enabled: open });
  const { user, isAuthenticated, updateMilesBalance } = useUserStore();
  const router = useRouter();
  const balance = user?.miles_balance ?? 0;
  const total = totalMiles();
  const count = itemCount();

  const [confirmItemId, setConfirmItemId] = useState<number | null>(null);
  const [voucher, setVoucher] = useState<VoucherData | null>(null);
  const [settling, setSettling] = useState(false);
  const confirmItem = items.find((item) => item.id === confirmItemId) ?? null;
  const confirmPriceNotice = confirmItem
    ? reconciliationNotices.findLast(
        (notice) => notice.productId === confirmItem.id && notice.kind === 'price',
      )
    : undefined;
  const catalogChecking = catalogLoading || catalogValidating;
  const catalogReady = open && catalogValidated && !catalogChecking && !catalogValidationError;
  const confirmTotal = confirmItem ? confirmItem.mileage_cost * confirmItem.quantity : 0;
  const confirmCanAfford = Boolean(confirmItem && isAuthenticated && balance >= confirmTotal);
  const confirmNeedsAddress = Boolean(
    confirmItem?.category === 'physical' && !confirmItem.address?.trim(),
  );

  const handleCartOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setConfirmItemId(null);
      setSettling(false);
    }
    onOpenChange(nextOpen);
  };

  const handleSettle = async (itemId: number) => {
    const item = useCartStore.getState().items.find((candidate) => candidate.id === itemId);
    if (!item) {
      setConfirmItemId(null);
      toast.error('商品已不在购物车中');
      return;
    }
    if (!catalogReady) {
      toast.error('请先完成商品价格与库存验证');
      return;
    }
    if (item.category === 'physical' && !item.address?.trim()) {
      toast.error('实体商品需要填写收货地址，请移除后重新加入');
      return;
    }
    if (!isAuthenticated || balance < item.mileage_cost * item.quantity) {
      toast.error('里程余额不足');
      return;
    }

    setSettling(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: item.id,
          expectedUnitCost: item.mileage_cost,
          quantity: item.quantity,
          address: item.address,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        const errorMessage = typeof data?.error === 'string' ? data.error : '兑换失败';
        const errorCode = typeof data?.code === 'string' ? data.code : '';
        if (
          errorCode === 'PRODUCT_PRICE_CHANGED'
          || errorCode === 'OUT_OF_STOCK'
          || errorCode === 'PRODUCT_NOT_FOUND'
        ) {
          setConfirmItemId(null);
          publishProductCatalogChanged();
        }
        toast.error(errorMessage);
        return;
      }

      publishProductCatalogChanged();
      // Update user balance
      updateMilesBalance(data.data.new_balance);
      // Remove from cart
      removeItem(item.id);
      // Show voucher
      setConfirmItemId(null);
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

  const handleSignIn = () => {
    onOpenChange(false);
    router.push('/login?from=/');
  };

  // Voucher display dialog
  if (voucher) {
    return (
      <Dialog open={true} onOpenChange={() => setVoucher(null)}>
        <DialogContent className={cn('sm:max-w-sm', variant === 'home' && 'home-portal-surface', variant === 'journey' && 'journey-portal-surface')}>
          <VoucherDisplay
            voucher={voucher}
            variant={variant}
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
      <Dialog open={true} onOpenChange={() => setConfirmItemId(null)}>
        <DialogContent className={cn('sm:max-w-sm', variant === 'home' && 'home-portal-surface', variant === 'journey' && 'journey-portal-surface')}>
          <DialogHeader>
            <DialogTitle>确认兑换</DialogTitle>
            <DialogDescription>
              确认用 {(confirmItem.mileage_cost * confirmItem.quantity).toLocaleString()} 里程兑换{' '}
              {confirmItem.name}
              {confirmItem.quantity > 1 ? ` × ${confirmItem.quantity}` : ''}？
            </DialogDescription>
            {confirmPriceNotice && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900" role="status">
                单价已从 {confirmPriceNotice.previousUnitCost?.toLocaleString()} 调整为{' '}
                {confirmItem.mileage_cost.toLocaleString()} 里程，本次将按新价格兑换。
              </p>
            )}
            {!confirmCanAfford && (
              <p className="rounded-lg bg-destructive/8 px-3 py-2 text-xs text-destructive" role="alert">
                当前里程不足，还差 {Math.max(confirmTotal - balance, 0).toLocaleString()} 里程。
              </p>
            )}
            {confirmNeedsAddress && (
              <p className="rounded-lg bg-destructive/8 px-3 py-2 text-xs text-destructive" role="alert">
                商品已变为实体商品，请返回购物车移除后重新加入并填写收货地址。
              </p>
            )}
            {catalogValidationError && (
              <div className="flex items-center justify-between gap-3 rounded-lg bg-destructive/8 px-3 py-2" role="alert">
                <p className="text-xs text-destructive">商品信息验证失败，验证成功前不能结算。</p>
                <Button type="button" variant="outline" size="sm" onClick={retryCatalog}>
                  重试
                </Button>
              </div>
            )}
            {catalogChecking && (
              <p className="text-xs text-muted-foreground" role="status">正在验证最新价格与库存…</p>
            )}
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmItemId(null)}>
              取消
            </Button>
            <Button
              onClick={() => handleSettle(confirmItem.id)}
              disabled={settling || !catalogReady || !confirmCanAfford || confirmNeedsAddress}
            >
              {settling
                ? '兑换中...'
                : catalogChecking
                  ? '验证商品中...'
                  : catalogValidationError
                    ? '等待重试'
                    : '按当前价格确认兑换'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleCartOpenChange}>
      <DialogContent className={cn('sm:max-w-md', variant === 'home' && 'home-portal-surface', variant === 'journey' && 'journey-portal-surface')}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-accent" />
            购物车
          </DialogTitle>
          <DialogDescription>
            {items.length > 0
              ? `共 ${count} 件商品`
              : '查看您选购的绿色商品'}
          </DialogDescription>
        </DialogHeader>

        {reconciliationNotices.length > 0 && (
          <div className="max-h-32 space-y-2 overflow-y-auto" aria-label="购物车更新通知">
            {reconciliationNotices.map((notice) => (
              <div
                key={notice.id}
                className="flex items-start justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950"
                role="status"
              >
                <span>{notice.message}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto shrink-0 px-2 py-0.5"
                  onClick={() => dismissReconciliationNotice(notice.id)}
                >
                  知道了
                </Button>
              </div>
            ))}
          </div>
        )}

        {catalogValidationError && (
          <div className="flex items-center justify-between gap-3 rounded-lg bg-destructive/8 px-3 py-2" role="alert">
            <p className="text-xs text-destructive">商品信息验证失败，购物车已保留；验证成功前不能结算。</p>
            <Button type="button" variant="outline" size="sm" onClick={retryCatalog}>
              重试
            </Button>
          </div>
        )}

        {catalogChecking && (
          <p className="text-xs text-muted-foreground" role="status">正在验证最新价格与库存…</p>
        )}

        {items.length > 0 ? (
          <>
            <div className="max-h-64 overflow-y-auto space-y-3">
              {items.map((item) => {
                const Icon = ICON_MAP[item.icon_type] || ShoppingBag;
                const itemTotal = item.mileage_cost * item.quantity;
                const canAfford = isAuthenticated && balance >= itemTotal;
                const needsAddress = item.category === 'physical' && !item.address?.trim();
                const quantityLimit = getCartItemQuantityLimit(item.stock);
                const atQuantityLimit = item.quantity >= quantityLimit;
                const limitMessage = item.stock <= MAX_CART_ITEM_QUANTITY
                  ? '已达库存上限'
                  : `单笔最多 ${MAX_CART_ITEM_QUANTITY} 件`;
                const limitDescriptionId = `cart-item-${item.id}-limit`;

                return (
                  <div
                    key={item.id}
                    className={cn('grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-2 rounded-lg border border-[#E2E8F0] p-2', variant === 'journey' && 'journey-inset-surface')}
                  >
                    <div className="flex min-w-0 items-start gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10">
                        <Icon className="h-4 w-4 text-accent" />
                      </div>
                      <div className="min-w-0 space-y-1.5">
                        <p className="break-words text-sm font-medium">
                          {item.name}
                          {item.quantity > 1 && (
                            <span className="text-muted-foreground"> × {item.quantity}</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.mileage_cost.toLocaleString()} 里程
                          {item.quantity > 1 && ` × ${item.quantity}`}
                        </p>
                        <div className="flex flex-wrap items-center gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            onClick={() => decrementItem(item.id)}
                            disabled={item.quantity <= 1}
                            aria-label={`减少 ${item.name} 数量`}
                          >
                            <Minus aria-hidden="true" />
                          </Button>
                          <span
                            className="min-w-6 text-center text-sm font-medium tabular-nums"
                            role="status"
                            aria-label={`${item.name} 当前数量 ${item.quantity}`}
                            aria-live="polite"
                          >
                            {item.quantity}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            onClick={() => incrementItem(item.id)}
                            disabled={atQuantityLimit}
                            aria-label={`增加 ${item.name} 数量`}
                            aria-describedby={atQuantityLimit ? limitDescriptionId : undefined}
                          >
                            <Plus aria-hidden="true" />
                          </Button>
                          {atQuantityLimit && (
                            <span id={limitDescriptionId} className="text-[11px] leading-tight text-muted-foreground">
                              {limitMessage}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Button
                        size="sm"
                        disabled={isAuthenticated && (!canAfford || !catalogReady || needsAddress)}
                        onClick={() => isAuthenticated ? setConfirmItemId(item.id) : handleSignIn()}
                      >
                        {isAuthenticated
                          ? catalogChecking
                            ? '验证中...'
                            : catalogValidationError
                              ? '等待重试'
                              : needsAddress
                                ? '需填写地址'
                                : '结算'
                          : '登录后兑换'}
                      </Button>
                      {!isAuthenticated ? (
                        <p className="max-w-32 text-right text-xs text-muted-foreground">
                          登录后查看余额
                        </p>
                      ) : needsAddress ? (
                        <p className="max-w-32 text-right text-xs text-destructive">
                          请移除后重新加入并填写地址
                        </p>
                      ) : !canAfford && (
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
