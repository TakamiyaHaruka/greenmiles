'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useUserStore } from '@/stores/userStore';
import { useCartStore } from '@/stores/cartStore';
import { MilesBalance } from '@/components/MilesBalance';
import { CartDialog } from '@/components/CartDialog';
import { GlassModeToggle } from '@/components/GlassModeToggle';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Leaf, Search, ShoppingCart, LogOut, Menu, RefreshCw, X } from 'lucide-react';

const navLinks = [
  { href: '/', label: '首页' },
  { href: '/mall', label: '商城' },
  { href: '/orders', label: '订单' },
  { href: '/footprint', label: '碳足迹' },
  { href: '/impact', label: '我的成果' },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, initializationStatus, clearUser, fetchUser } = useUserStore();
  const { itemCount, clearCart } = useCartStore();
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const count = itemCount();
  const isHome = pathname === '/';
  const hasGlassAppearance = isHome
    || pathname === '/mall'
    || pathname === '/calculator'
    || pathname === '/orders'
    || pathname === '/footprint'
    || pathname === '/impact';
  const isInitializing = initializationStatus === 'idle' || initializationStatus === 'loading';

  useEffect(() => {
    if (!menuOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        requestAnimationFrame(() => menuButtonRef.current?.focus());
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [menuOpen]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Clear local state even if the request fails
    }
    clearUser();
    clearCart();
    setMenuOpen(false);
    router.push('/login');
  };

  return (
    <>
      <nav
        className={cn(
          'sticky top-0 z-50 w-full border-b',
          hasGlassAppearance
            ? isHome ? 'home-nav border-white/50' : 'journey-nav border-white/50'
            : 'border-[#E2E8F0] bg-background/80 backdrop-blur-md'
        )}
      >
        <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-2 px-3 sm:px-4">
          <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="GreenMiles 首页">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent">
              <Leaf className="h-5 w-5 text-white" aria-hidden="true" />
            </span>
            <span className={cn('text-lg font-bold text-primary', hasGlassAppearance && 'hidden min-[390px]:inline')}>
              GreenMiles
            </span>
          </Link>

          <div className={cn('items-center gap-4 xl:gap-6', hasGlassAppearance ? 'hidden lg:flex' : 'flex')}>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  'relative text-sm font-medium transition-colors hover:text-primary',
                  pathname === link.href ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {link.label}
                {pathname === link.href && (
                  <span className="absolute -bottom-[17px] right-0 left-0 h-0.5 bg-accent" />
                )}
              </Link>
            ))}
          </div>

          <div className="flex min-w-0 items-center gap-1.5 sm:gap-3">
            {!hasGlassAppearance && (
              <div className="relative">
                <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
                <Input disabled placeholder="Coming Soon" className="h-9 w-40 pl-8" />
              </div>
            )}

            {hasGlassAppearance && <GlassModeToggle compact />}

            {(isAuthenticated || (isHome && count > 0)) && (
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={() => setCartOpen(true)}
                aria-label="打开购物车"
              >
                <ShoppingCart className="h-5 w-5" aria-hidden="true" />
                {count > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-xs text-white">
                    {count}
                  </span>
                )}
              </Button>
            )}

            {isInitializing ? (
              <span className="h-8 w-20 animate-pulse rounded-lg bg-primary/10" aria-hidden="true" />
            ) : initializationStatus === 'error' ? (
              <Button variant="ghost" size="icon" aria-label="重试登录状态" onClick={() => void fetchUser()}>
                <RefreshCw aria-hidden="true" />
              </Button>
            ) : isAuthenticated ? (
              <>
                <MilesBalance compact={hasGlassAppearance} />
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(hasGlassAppearance && 'hidden lg:inline-flex')}
                  aria-label="退出登录"
                  title="退出登录"
                  onClick={handleLogout}
                >
                  <LogOut className="h-5 w-5" aria-hidden="true" />
                </Button>
              </>
            ) : (
              <div className={cn('flex items-center gap-1', hasGlassAppearance && 'hidden md:flex')}>
                <Link href="/login" className={cn(buttonVariants({ variant: 'ghost' }))}>
                  登录
                </Link>
                <Link href="/register" className={cn(buttonVariants())}>
                  注册
                </Link>
              </div>
            )}

            {hasGlassAppearance && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="lg:hidden"
                aria-label={menuOpen ? '关闭导航菜单' : '打开导航菜单'}
                aria-expanded={menuOpen}
                aria-controls="appearance-mobile-menu"
                ref={menuButtonRef}
                onClick={() => setMenuOpen((open) => !open)}
              >
                {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
              </Button>
            )}
          </div>
        </div>

        {hasGlassAppearance && menuOpen && (
          <div
            id="appearance-mobile-menu"
            className={cn(
              'absolute inset-x-3 top-[calc(100%+0.5rem)] grid gap-1 border p-3 lg:hidden',
              isHome ? 'home-surface-heavy' : 'journey-surface-heavy'
            )}
          >
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  'rounded-lg px-3 py-2 text-sm font-medium hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  pathname === link.href ? 'bg-primary/8 text-primary' : 'text-muted-foreground'
                )}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 border-t border-primary/10 pt-2">
              {initializationStatus === 'error' ? (
                <Button variant="ghost" className="w-full justify-start" onClick={() => void fetchUser()}>
                  <RefreshCw aria-hidden="true" />
                  重试登录状态
                </Button>
              ) : isAuthenticated ? (
                <>
                  <p className="truncate px-3 py-1 text-xs text-muted-foreground">{user?.email}</p>
                  <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
                    <LogOut aria-hidden="true" />
                    退出登录
                  </Button>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link href="/login" className={cn(buttonVariants({ variant: 'outline' }))}>
                    登录
                  </Link>
                  <Link href="/register" className={cn(buttonVariants())}>
                    注册
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      <CartDialog
        open={cartOpen}
        onOpenChange={setCartOpen}
        variant={isHome ? 'home' : hasGlassAppearance ? 'journey' : 'default'}
      />
    </>
  );
}
