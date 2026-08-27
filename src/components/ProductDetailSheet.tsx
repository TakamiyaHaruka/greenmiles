'use client';

import { useForm } from 'react-hook-form';
import { useCartStore } from '@/stores/cartStore';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ShoppingCart, Bike, Hotel, TreePine, ShoppingBag } from 'lucide-react';

interface Product {
  id: number;
  name: string;
  description: string;
  category: string;
  mileage_cost: number;
  stock: number;
  icon_type: string;
}

interface ProductDetailSheetProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AddressForm {
  name: string;
  phone: string;
  address: string;
}

const CATEGORY_MAP: Record<string, string> = {
  virtual: '虚拟卡券',
  carbon: '碳抵消',
  physical: '实体商品',
};

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  bike: Bike,
  hotel: Hotel,
  tree: TreePine,
  bag: ShoppingBag,
};

const TERMS_MAP: Record<string, string> = {
  bike: '骑行卡自兑换之日起 30 天内有效，可在支持的城市使用。兑换后不可退款。',
  hotel: '酒店优惠券自兑换之日起 60 天内有效，全国合作酒店通用。不可与其他优惠叠加。',
  tree: '兑换后将在阿拉善荒漠种下一棵树，您将获得碳抵消证书。树苗种植周期约 3-6 个月。',
};

export function ProductDetailSheet({
  product,
  open,
  onOpenChange,
}: ProductDetailSheetProps) {
  const { addItem } = useCartStore();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AddressForm>({ mode: 'onBlur' });

  if (!product) return null;

  const Icon = ICON_MAP[product.icon_type] || ShoppingBag;
  const isPhysical = product.category === 'physical';
  const terms = TERMS_MAP[product.icon_type];

  const onSubmit = () => {
    addItem({
      id: product.id,
      name: product.name,
      mileage_cost: product.mileage_cost,
      icon_type: product.icon_type,
    });
    onOpenChange(false);
    reset();
  };

  const handleAddToCart = () => {
    if (isPhysical) {
      handleSubmit(onSubmit)();
    } else {
      addItem({
        id: product.id,
        name: product.name,
        mileage_cost: product.mileage_cost,
        icon_type: product.icon_type,
      });
      onOpenChange(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center">
              <Icon className="h-5 w-5 text-accent" />
            </div>
            <div>
              <SheetTitle>{product.name}</SheetTitle>
              <Badge className="text-xs mt-1">
                {CATEGORY_MAP[product.category] || product.category}
              </Badge>
            </div>
          </div>
          <SheetDescription className="mt-2">
            {product.description}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 space-y-4">
          {/* Price and Stock */}
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-accent">
              {product.mileage_cost.toLocaleString()} 里程
            </span>
            <span className="text-sm text-muted-foreground">
              库存: {product.stock}
            </span>
          </div>

          <Separator />

          {/* Terms for virtual/carbon products */}
          {!isPhysical && terms && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-primary">兑换条款</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {terms}
              </p>
            </div>
          )}

          {/* Address form for physical products */}
          {isPhysical && (
            <form className="space-y-3">
              <h4 className="text-sm font-medium text-primary">收货地址</h4>
              <div>
                <label htmlFor="name" className="text-xs text-muted-foreground mb-1 block">
                  姓名 <span className="text-destructive">*</span>
                </label>
                <Input
                  id="name"
                  placeholder="收件人姓名"
                  {...register('name', { required: '请输入姓名' })}
                  className="h-8"
                />
                {errors.name && (
                  <p className="text-xs text-destructive mt-1">{errors.name.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="phone" className="text-xs text-muted-foreground mb-1 block">
                  手机号 <span className="text-destructive">*</span>
                </label>
                <Input
                  id="phone"
                  placeholder="手机号码"
                  {...register('phone', {
                    required: '请输入手机号',
                    pattern: {
                      value: /^1[3-9]\d{9}$/,
                      message: '请输入有效的手机号',
                    },
                  })}
                  className="h-8"
                />
                {errors.phone && (
                  <p className="text-xs text-destructive mt-1">{errors.phone.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="address" className="text-xs text-muted-foreground mb-1 block">
                  详细地址 <span className="text-destructive">*</span>
                </label>
                <Input
                  id="address"
                  placeholder="省/市/区/街道门牌号"
                  {...register('address', { required: '请输入详细地址' })}
                  className="h-8"
                />
                {errors.address && (
                  <p className="text-xs text-destructive mt-1">{errors.address.message}</p>
                )}
              </div>
            </form>
          )}
        </div>

        <SheetFooter>
          <Button className="w-full" onClick={handleAddToCart}>
            <ShoppingCart className="h-4 w-4 mr-2" />
            加入购物车
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
