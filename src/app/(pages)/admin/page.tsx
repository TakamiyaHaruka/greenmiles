'use client';

import { useCallback, useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Bike, Hotel, Leaf, LogOut, Pencil, Plus, RefreshCw, ShoppingBag, Trash2, TreePine } from 'lucide-react';
import { AdminOrdersTable } from '@/components/AdminOrdersTable';
import type { Product } from '@/lib/types';

const CATEGORY_LABELS: Record<string, string> = {
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

const FormSchema = z.object({
  name: z.string().min(1, '请输入商品名称'),
  description: z.string().optional(),
  category: z.enum(['virtual', 'carbon', 'physical'], { message: '请选择商品类别' }),
  mileage_cost: z.coerce.number().positive('里程必须大于 0'),
  stock: z.coerce.number().int('库存必须为整数').min(0, '库存不能为负'),
  icon_type: z.string().optional(),
  project_name: z.string().optional(),
  project_standard: z.string().optional(),
  project_vintage: z.string().optional(),
});

type ProductForm = z.infer<typeof FormSchema>;

function isProduct(value: unknown): value is Product {
  if (!value || typeof value !== 'object') return false;
  const product = value as Record<string, unknown>;

  return Number.isSafeInteger(product.id)
    && typeof product.name === 'string'
    && typeof product.description === 'string'
    && (product.category === 'virtual' || product.category === 'carbon' || product.category === 'physical')
    && typeof product.mileage_cost === 'number'
    && Number.isFinite(product.mileage_cost)
    && Number.isSafeInteger(product.stock)
    && typeof product.icon_type === 'string'
    && typeof product.project_name === 'string'
    && typeof product.project_standard === 'string'
    && typeof product.project_vintage === 'string';
}

function parseProductList(payload: unknown): Product[] | null {
  if (!payload || typeof payload !== 'object') return null;
  const data = (payload as { data?: unknown }).data;
  return Array.isArray(data) && data.every(isProduct) ? data : null;
}

export default function AdminPage() {
  const [session, setSession] = useState<'checking' | 'login' | 'ready' | 'error'>('checking');
  const [sessionError, setSessionError] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<z.input<typeof FormSchema>, unknown, ProductForm>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: '',
      description: '',
      category: undefined,
      mileage_cost: 0,
      stock: 0,
      icon_type: undefined,
      project_name: '',
      project_standard: '',
      project_vintage: '',
    },
  });

  const loadProducts = async ({ showChecking = false, preserveCurrent = false }: { showChecking?: boolean; preserveCurrent?: boolean } = {}) => {
    if (showChecking) setSession('checking');
    setSessionError('');

    try {
      const res = await fetch('/api/admin/products');
      if (res.status === 401) {
        setSession('login');
        return;
      }
      if (!res.ok) throw new Error('商品加载失败');

      const data = parseProductList(await res.json());
      if (!data) throw new Error('商品响应格式异常');

      setProducts(data);
      setSession('ready');
    } catch {
      if (preserveCurrent) {
        toast.error('商品列表刷新失败，请稍后重试');
      } else {
        setSessionError('管理数据暂时无法加载，请重试');
        setSession('error');
      }
    }
  };

  useEffect(() => {
    fetch('/api/admin/products')
      .then((res) => {
        if (res.status === 401) {
          setSession('login');
          return null;
        }
        if (!res.ok) throw new Error('商品加载失败');
        return res.json();
      })
      .then((payload) => {
        if (!payload) return;
        const data = parseProductList(payload);
        if (!data) throw new Error('商品响应格式异常');
        setProducts(data);
        setSession('ready');
      })
      .catch(() => {
        setSessionError('管理数据暂时无法加载，请重试');
        setSession('error');
      });
  }, []);

  const handleAdminUnauthorized = useCallback(() => {
    setProducts([]);
    setSession('login');
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setLoggingIn(true);
    setLoginError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json();
        setLoginError(data.error || '登录失败');
        return;
      }
      setPassword('');
      await loadProducts({ showChecking: true });
    } catch {
      setLoginError('登录失败，请稍后重试');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' }).catch(() => {});
    setProducts([]);
    setSession('login');
  };

  const openCreate = () => {
    setEditing(null);
    setFormError('');
    reset({
      name: '',
      description: '',
      category: undefined,
      mileage_cost: 0,
      stock: 0,
      icon_type: undefined,
      project_name: '',
      project_standard: '',
      project_vintage: '',
    });
    setDialogOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    setFormError('');
    reset({
      name: product.name,
      description: product.description || '',
      category: product.category as ProductForm['category'],
      mileage_cost: product.mileage_cost,
      stock: product.stock,
      icon_type: product.icon_type || undefined,
      project_name: product.project_name || '',
      project_standard: product.project_standard || '',
      project_vintage: product.project_vintage || '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values: ProductForm) => {
    setSaving(true);
    setFormError('');
    try {
      const res = await fetch(
        editing ? `/api/admin/products/${editing.id}` : '/api/admin/products',
        {
          method: editing ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        }
      );
      if (res.status === 401) {
        setDialogOpen(false);
        handleAdminUnauthorized();
        return;
      }
      if (!res.ok) {
        const data = await res.json();
        setFormError(data.error || '保存失败');
        return;
      }

      const payload = await res.json();
      if (!isProduct(payload?.data)) {
        setFormError('保存响应格式异常，请刷新后确认结果');
        return;
      }

      const savedProduct = payload.data;
      setProducts((current) => editing
        ? current.map((product) => product.id === savedProduct.id ? savedProduct : product)
        : [...current, savedProduct].sort((a, b) => a.id - b.id));
      setDialogOpen(false);
    } catch {
      setFormError('保存失败，请稍后重试');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleting(true);
    setDeleteError('');
    try {
      const res = await fetch(`/api/admin/products/${target.id}`, { method: 'DELETE' });
      if (res.status === 401) {
        setDeleteTarget(null);
        handleAdminUnauthorized();
        return;
      }
      if (!res.ok) {
        const data = await res.json();
        setDeleteError(data.error || '删除失败');
        return;
      }
      setProducts((current) => current.filter((product) => product.id !== target.id));
      setDeleteTarget(null);
      toast.success(`已删除「${target.name}」`);
    } catch {
      setDeleteError('删除失败，请稍后重试');
    } finally {
      setDeleting(false);
    }
  };

  if (session !== 'ready') {
    return (
      <div className="journey-page flex min-h-[calc(100svh-4rem)] items-center justify-center px-4 py-8">
        <Card className="journey-surface-heavy w-full max-w-sm border">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-accent">
              <Leaf className="h-6 w-6 text-white" aria-hidden="true" />
            </div>
            <CardTitle className="text-primary">
              <h1>GreenMiles 管理后台</h1>
            </CardTitle>
            <CardDescription>请输入管理员密码以管理绿色商品</CardDescription>
          </CardHeader>
          <CardContent>
            {session === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4" aria-busy={loggingIn}>
                <div>
                  <label htmlFor="admin-password" className="text-xs text-muted-foreground mb-1 block">
                    管理员密码
                  </label>
                  <Input
                    id="admin-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="ADMIN_PASSWORD"
                    autoComplete="current-password"
                    required
                    aria-invalid={Boolean(loginError)}
                    aria-describedby={loginError ? 'admin-login-error' : undefined}
                  />
                  {loginError && <p id="admin-login-error" className="text-xs text-destructive mt-1" role="alert">{loginError}</p>}
                </div>
                <Button className="w-full" type="submit" disabled={loggingIn}>
                  {loggingIn ? '登录中...' : '进入管理后台'}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  在 .env.local 中配置 ADMIN_PASSWORD 后可用
                </p>
              </form>
            ) : session === 'error' ? (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <AlertCircle className="h-8 w-8 text-destructive" aria-hidden="true" />
                <p className="text-sm text-destructive" role="alert">{sessionError}</p>
                <Button variant="outline" onClick={() => void loadProducts({ showChecking: true })}>
                  <RefreshCw aria-hidden="true" />
                  重试加载
                </Button>
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground py-4" role="status" aria-live="polite">
                正在检查管理员会话...
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="journey-page min-h-[calc(100svh-4rem)]">
      <div className="mx-auto max-w-[1280px] px-4 py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-primary sm:text-3xl">管理后台</h1>
            <Badge>Admin</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              退出管理
            </Button>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              新增商品
            </Button>
          </div>
        </div>

        <Tabs defaultValue="products">
          <TabsList className="grid h-auto w-full grid-cols-2 sm:w-fit">
            <TabsTrigger value="products">商品管理</TabsTrigger>
            <TabsTrigger value="orders">订单管理</TabsTrigger>
          </TabsList>
          <TabsContent value="products">
            {products.length === 0 ? (
              <Card className="journey-data-panel items-center border px-4 py-8 text-center">
                <p className="text-muted-foreground">暂无商品</p>
                <p className="text-xs text-muted-foreground">使用“新增商品”创建第一件绿色商品。</p>
              </Card>
            ) : (
              <Card className="journey-data-panel border">
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">图标</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>名称</TableHead>
                    <TableHead>类别</TableHead>
                    <TableHead className="text-right">里程</TableHead>
                    <TableHead className="text-right">库存</TableHead>
                    <TableHead className="w-24 text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => {
                    const Icon = ICON_MAP[product.icon_type || ''] || ShoppingBag;
                    return (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div className="h-8 w-8 rounded-full bg-accent/10 flex items-center justify-center">
                            <Icon className="h-4 w-4 text-accent" />
                          </div>
                        </TableCell>
                        <TableCell>{product.id}</TableCell>
                        <TableCell className="font-medium text-primary">{product.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {CATEGORY_LABELS[product.category] || product.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{product.mileage_cost.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{product.stock}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon-sm" aria-label={`编辑 ${product.name}`} onClick={() => openEdit(product)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`删除 ${product.name}`}
                            onClick={() => {
                              setDeleteError('');
                              setDeleteTarget(product);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>
          <TabsContent value="orders">
            <AdminOrdersTable onUnauthorized={handleAdminUnauthorized} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="journey-portal-surface max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? '编辑商品' : '新增商品'}</DialogTitle>
            <DialogDescription>
              {editing ? `修改「${editing.name}」的信息` : '录入新的绿色商品或服务'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" aria-busy={saving}>
            <div>
              <label htmlFor="product-name" className="text-xs text-muted-foreground mb-1 block">
                商品名称 <span className="text-destructive">*</span>
              </label>
              <Input
                id="product-name"
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? 'product-name-error' : undefined}
                {...register('name')}
              />
              {errors.name && <p id="product-name-error" className="text-xs text-destructive mt-1" role="alert">{errors.name.message}</p>}
            </div>
            <div>
              <label htmlFor="product-description" className="text-xs text-muted-foreground mb-1 block">
                商品描述
              </label>
              <Input id="product-description" {...register('description')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="product-category" className="text-xs text-muted-foreground mb-1 block">
                  类别 <span className="text-destructive">*</span>
                </label>
                <Controller
                  name="category"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger
                        id="product-category"
                        ref={field.ref}
                        name={field.name}
                        onBlur={field.onBlur}
                        className="w-full"
                        aria-invalid={Boolean(errors.category)}
                        aria-describedby={errors.category ? 'product-category-error' : undefined}
                      >
                        <SelectValue placeholder="选择类别" />
                      </SelectTrigger>
                      <SelectContent surface="journey">
                        <SelectItem value="virtual">虚拟卡券</SelectItem>
                        <SelectItem value="carbon">碳抵消</SelectItem>
                        <SelectItem value="physical">实体商品</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.category && <p id="product-category-error" className="text-xs text-destructive mt-1" role="alert">{errors.category.message}</p>}
              </div>
              <div>
                <label htmlFor="product-icon" className="text-xs text-muted-foreground mb-1 block">
                  图标
                </label>
                <Controller
                  name="icon_type"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="product-icon" className="w-full">
                        <SelectValue placeholder="选择图标" />
                      </SelectTrigger>
                      <SelectContent surface="journey">
                        <SelectItem value="bike">骑行卡</SelectItem>
                        <SelectItem value="hotel">酒店券</SelectItem>
                        <SelectItem value="tree">植树</SelectItem>
                        <SelectItem value="bag">帆布袋</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="product-cost" className="text-xs text-muted-foreground mb-1 block">
                  所需里程 <span className="text-destructive">*</span>
                </label>
                <Input
                  id="product-cost"
                  type="number"
                  aria-invalid={Boolean(errors.mileage_cost)}
                  aria-describedby={errors.mileage_cost ? 'product-cost-error' : undefined}
                  {...register('mileage_cost')}
                />
                {errors.mileage_cost && <p id="product-cost-error" className="text-xs text-destructive mt-1" role="alert">{errors.mileage_cost.message}</p>}
              </div>
              <div>
                <label htmlFor="product-stock" className="text-xs text-muted-foreground mb-1 block">
                  库存 <span className="text-destructive">*</span>
                </label>
                <Input
                  id="product-stock"
                  type="number"
                  aria-invalid={Boolean(errors.stock)}
                  aria-describedby={errors.stock ? 'product-stock-error' : undefined}
                  {...register('stock')}
                />
                {errors.stock && <p id="product-stock-error" className="text-xs text-destructive mt-1" role="alert">{errors.stock.message}</p>}
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                抵消项目归属 <span className="text-normal">(碳抵消类商品显示在证书上)</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  id="project-name"
                  placeholder="项目名称，如 阿拉善荒漠植树造林"
                  {...register('project_name')}
                />
                <Input
                  id="project-standard"
                  placeholder="项目标准，如 CCER"
                  {...register('project_standard')}
                />
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <Input
                  id="project-vintage"
                  placeholder="项目年份，如 2026"
                  {...register('project_vintage')}
                />
              </div>
            </div>
            {formError && <p className="text-xs text-destructive" role="alert">{formError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                取消
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? '保存中...' : '保存'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => {
        if (!open && !deleting) setDeleteTarget(null);
      }}>
        <DialogContent className="journey-portal-surface sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>确认删除商品</DialogTitle>
            <DialogDescription>
              {deleteTarget ? `确认删除「${deleteTarget.name}」？已有订单的商品仍会由服务端拒绝删除。` : ''}
            </DialogDescription>
          </DialogHeader>
          {deleteError && <p className="text-sm text-destructive" role="alert">{deleteError}</p>}
          <DialogFooter>
            <Button variant="outline" disabled={deleting} onClick={() => setDeleteTarget(null)}>
              取消
            </Button>
            <Button variant="destructive" disabled={deleting} onClick={() => void handleDelete()}>
              {deleting ? '删除中...' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
