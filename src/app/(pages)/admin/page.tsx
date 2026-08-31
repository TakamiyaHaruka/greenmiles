'use client';

import { useEffect, useState } from 'react';
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
import { Leaf, Bike, Hotel, TreePine, ShoppingBag, Plus, Pencil, Trash2, LogOut } from 'lucide-react';
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
});

type ProductForm = z.infer<typeof FormSchema>;

export default function AdminPage() {
  const [session, setSession] = useState<'checking' | 'login' | 'ready'>('checking');
  const [products, setProducts] = useState<Product[]>([]);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<z.input<typeof FormSchema>, unknown, ProductForm>({
    resolver: zodResolver(FormSchema),
    defaultValues: { name: '', description: '', category: undefined, mileage_cost: 0, stock: 0, icon_type: undefined },
  });

  const loadProducts = async () => {
    const res = await fetch('/api/admin/products');
    if (res.status === 401) {
      setSession('login');
      return;
    }
    const data = await res.json();
    setProducts(data.data || []);
    setSession('ready');
  };

  useEffect(() => {
    fetch('/api/admin/products')
      .then((res) => {
        if (res.status === 401) {
          setSession('login');
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        setProducts(data.data || []);
        setSession('ready');
      })
      .catch(() => setSession('login'));
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
      await loadProducts();
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
    reset({ name: '', description: '', category: undefined, mileage_cost: 0, stock: 0, icon_type: undefined });
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
      if (!res.ok) {
        const data = await res.json();
        setFormError(data.error || '保存失败');
        return;
      }
      setDialogOpen(false);
      await loadProducts();
    } catch {
      setFormError('保存失败，请稍后重试');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (product: Product) => {
    if (!window.confirm(`确认删除商品「${product.name}」？`)) return;
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || '删除失败');
        return;
      }
      await loadProducts();
    } catch {
      toast.error('删除失败，请稍后重试');
    }
  };

  if (session !== 'ready') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="w-full max-w-sm border border-[#E2E8F0]">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-accent">
              <Leaf className="h-6 w-6 text-white" />
            </div>
            <CardTitle className="text-primary">GreenMiles 管理后台</CardTitle>
            <CardDescription>请输入管理员密码以管理绿色商品</CardDescription>
          </CardHeader>
          <CardContent>
            {session === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
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
                  />
                  {loginError && <p className="text-xs text-destructive mt-1">{loginError}</p>}
                </div>
                <Button className="w-full" type="submit" disabled={loggingIn}>
                  {loggingIn ? '登录中...' : '进入管理后台'}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  在 .env.local 中配置 ADMIN_PASSWORD 后可用
                </p>
              </form>
            ) : (
              <p className="text-center text-sm text-muted-foreground py-4">正在检查管理员会话...</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1280px] px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-primary">管理后台</h1>
            <Badge>Admin</Badge>
          </div>
          <div className="flex gap-2">
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
          <TabsList>
            <TabsTrigger value="products">商品管理</TabsTrigger>
            <TabsTrigger value="orders">订单管理</TabsTrigger>
          </TabsList>
          <TabsContent value="products">
            <Card className="border border-[#E2E8F0]">
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
                          <Button variant="ghost" size="icon-sm" aria-label={`删除 ${product.name}`} onClick={() => handleDelete(product)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
          <TabsContent value="orders">
            <AdminOrdersTable />
          </TabsContent>
        </Tabs>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? '编辑商品' : '新增商品'}</DialogTitle>
            <DialogDescription>
              {editing ? `修改「${editing.name}」的信息` : '录入新的绿色商品或服务'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div>
              <label htmlFor="product-name" className="text-xs text-muted-foreground mb-1 block">
                商品名称 <span className="text-destructive">*</span>
              </label>
              <Input id="product-name" {...register('name')} />
              {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label htmlFor="product-description" className="text-xs text-muted-foreground mb-1 block">
                商品描述
              </label>
              <Input id="product-description" {...register('description')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  类别 <span className="text-destructive">*</span>
                </label>
                <Controller
                  name="category"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="选择类别" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="virtual">虚拟卡券</SelectItem>
                        <SelectItem value="carbon">碳抵消</SelectItem>
                        <SelectItem value="physical">实体商品</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.category && <p className="text-xs text-destructive mt-1">{errors.category.message}</p>}
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  图标
                </label>
                <Controller
                  name="icon_type"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="选择图标" />
                      </SelectTrigger>
                      <SelectContent>
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
                <Input id="product-cost" type="number" {...register('mileage_cost')} />
                {errors.mileage_cost && <p className="text-xs text-destructive mt-1">{errors.mileage_cost.message}</p>}
              </div>
              <div>
                <label htmlFor="product-stock" className="text-xs text-muted-foreground mb-1 block">
                  库存 <span className="text-destructive">*</span>
                </label>
                <Input id="product-stock" type="number" {...register('stock')} />
                {errors.stock && <p className="text-xs text-destructive mt-1">{errors.stock.message}</p>}
              </div>
            </div>
            {formError && <p className="text-xs text-destructive">{formError}</p>}
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
    </div>
  );
}
