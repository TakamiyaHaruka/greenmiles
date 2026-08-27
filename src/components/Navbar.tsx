'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUserStore } from '@/stores/userStore';
import { useCartStore } from '@/stores/cartStore';
import { MilesBalance } from '@/components/MilesBalance';
import { CartDialog } from '@/components/CartDialog';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Leaf, Search, ShoppingCart } from 'lucide-react';

const navLinks = [
  { href: '/', label: '首页' },
  { href: '/mall', label: '商城' },
  { href: '/orders', label: '订单' },
];

export function Navbar() {
  const pathname = usePathname();
  const { isAuthenticated } = useUserStore();
  const { itemCount } = useCartStore();
  const [cartOpen, setCartOpen] = useState(false);
  const count = itemCount();

  return (
    <>
      <nav className="sticky top-0 z-50 w-full border-b border-[#E2E8F0] bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent">
              <Leaf className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-primary">GreenMiles</span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'relative text-sm font-medium transition-colors hover:text-primary',
                  pathname === link.href
                    ? 'text-primary'
                    : 'text-muted-foreground'
                )}
              >
                {link.label}
                {pathname === link.href && (
                  <span className="absolute -bottom-[17px] left-0 right-0 h-0.5 bg-accent" />
                )}
              </Link>
            ))}
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-3">
            {/* Search Box (disabled) */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                disabled
                placeholder="Coming Soon"
                className="w-40 pl-8 h-9"
              />
            </div>

            {isAuthenticated ? (
              <>
                {/* Cart Icon */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative"
                  onClick={() => setCartOpen(true)}
                >
                  <ShoppingCart className="h-5 w-5" />
                  {count > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-accent text-white text-xs flex items-center justify-center">
                      {count}
                    </span>
                  )}
                </Button>

                {/* Miles Balance */}
                <MilesBalance />
              </>
            ) : (
              <>
                {/* Login/Register Links */}
                <Link href="/login" className={cn(buttonVariants({ variant: 'ghost' }))}>
                  登录
                </Link>
                <Link href="/register" className={cn(buttonVariants())}>
                  注册
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <CartDialog open={cartOpen} onOpenChange={setCartOpen} />
    </>
  );
}
