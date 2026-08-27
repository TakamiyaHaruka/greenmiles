'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useUserStore } from '@/stores/userStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProductCard } from '@/components/ProductCard';
import { ProductDetailSheet } from '@/components/ProductDetailSheet';
import { Plane, Leaf, TreePine, TrendingUp, BarChart3, Calculator, ShoppingBag, ArrowRight, Users, Globe, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface Product {
  id: number;
  name: string;
  description: string;
  category: string;
  mileage_cost: number;
  stock: number;
  icon_type: string;
}

const CHART_COLORS = ['#10B981', '#059669', '#047857', '#065f46'];

const mockOffsetData = [
  { month: '1月', offset: 12 },
  { month: '2月', offset: 18 },
  { month: '3月', offset: 25 },
  { month: '4月', offset: 32 },
  { month: '5月', offset: 28 },
  { month: '6月', offset: 45 },
];

const mockConversionData = [
  { name: '已兑换', value: 3200 },
  { name: '未兑换', value: 6800 },
];

export default function HomePage() {
  const { user, isAuthenticated } = useUserStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    fetch('/api/products')
      .then((res) => res.json())
      .then((data) => setProducts((data.data || []).slice(0, 4)))
      .catch(() => {});
  }, []);

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setSheetOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-primary text-primary-foreground py-12">
        <div className="mx-auto max-w-[1280px] px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Leaf className="h-8 w-8 text-accent" />
            <h1 className="text-4xl font-bold">GreenMiles</h1>
          </div>
          <p className="text-lg text-primary-foreground/80 mb-8">
            用飞行里程兑换绿色商品，为地球减碳
          </p>
          {isAuthenticated ? (
            <div className="flex flex-col items-center gap-4">
              <Badge variant="secondary" className="text-lg px-6 py-2">
                <Plane className="h-5 w-5 mr-2" />
                {user?.miles_balance.toLocaleString()} 里程
              </Badge>
              <p className="text-primary-foreground/60">
                欢迎回来，{user?.email}
              </p>
            </div>
          ) : (
            <div className="flex gap-4 justify-center">
              <Link href="/register" className={cn(buttonVariants({ size: 'lg' }))}>
                开始旅程
              </Link>
              {/* <Link href="/login" className={cn(buttonVariants({ size: 'lg', variant: 'outline' }), 'bg-transparent! text-primary-foreground! border-primary-foreground! hover:bg-primary-foreground! hover:text-primary!')}>
                登录
              </Link> */}
            </div>
          )}
        </div>
      </section>

      {/* How It Works - only for unauthenticated users */}
      {!isAuthenticated && (
        <>
          {/* How It Works */}
          <section className="py-16">
            <div className="mx-auto max-w-[1280px] px-4">
              <div className="text-center mb-12">
                <h2 className="text-2xl font-bold text-primary mb-2">如何参与</h2>
                <p className="text-muted-foreground">四步开启你的绿色飞行之旅</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { icon: Calculator, title: '计算碳排放', desc: '输入航班信息，了解你的飞行碳足迹', step: '01' },
                  { icon: Plane, title: '获取绿色里程', desc: '注册即赠 10,000 里程，每次飞行可积累', step: '02' },
                  { icon: ShoppingBag, title: '兑换环保商品', desc: '用里程兑换骑行卡、植树公益等绿色商品', step: '03' },
                  { icon: TreePine, title: '为地球减碳', desc: '每一次兑换都是一份对地球的承诺', step: '04' },
                ].map((item, index) => (
                  <div key={item.step} className="relative">
                    <Card className="border border-[#E2E8F0] h-full">
                      <CardContent className="pt-6 pb-6 text-center">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent/10">
                          <item.icon className="h-7 w-7 text-accent" />
                        </div>
                        <span className="inline-block mb-2 text-xs font-bold text-accent bg-accent/10 px-2.5 py-0.5 rounded-full">
                          STEP {item.step}
                        </span>
                        <h3 className="font-semibold text-primary mb-1">{item.title}</h3>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </CardContent>
                    </Card>
                    {index < 3 && (
                      <div className="hidden lg:flex absolute top-1/2 -right-3 z-10 -translate-y-1/2">
                        <ArrowRight className="h-5 w-5 text-accent/40" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {/* <div className="text-center mt-10">
                <Link href="/register" className={cn(buttonVariants({ size: 'lg' }))}>
                  立即注册
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </div> */}
            </div>
          </section>

          {/* About & Eco Tips */}
          <section className="py-16 bg-muted/30">
            <div className="mx-auto max-w-[1280px] px-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* About GreenMiles */}
                <div>
                  <h2 className="text-2xl font-bold text-primary mb-4">关于 GreenMiles</h2>
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    GreenMiles 致力于将飞行里程转化为绿色行动。我们相信，每一次飞行都可以成为保护地球的机会。
                    通过将里程兑换为环保商品和碳抵消项目，让旅行者在探索世界的同时，也为地球的可持续发展贡献力量。
                  </p>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { value: '10,000+', label: '注册用户', icon: Users },
                      { value: '500 吨', label: 'CO₂ 减排', icon: Globe },
                      { value: '4 类', label: '绿色商品', icon: ShoppingBag },
                    ].map((stat) => (
                      <Card key={stat.label} className="border border-[#E2E8F0] text-center">
                        <CardContent className="pt-4 pb-4">
                          <stat.icon className="h-5 w-5 text-accent mx-auto mb-2" />
                          <p className="text-lg font-bold text-primary">{stat.value}</p>
                          <p className="text-xs text-muted-foreground">{stat.label}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Eco Tips */}
                <div>
                  <h2 className="text-2xl font-bold text-primary mb-4">飞行减碳小贴士</h2>
                  <div className="space-y-4">
                    {[
                      '选择直飞航班可减少约 20% 碳排放，中途转机的起降阶段消耗最多燃料',
                      '经济舱碳足迹仅为头等舱的 1/4，因为座位越少，人均排放越高',
                      '轻装出行，每减少 1kg 行李可降低约 0.01kg 碳排放',
                      '选择新型节能机型（如 A320neo、B787）可降低 15-30% 碳排放',
                    ].map((tip, index) => (
                      <div key={index} className="flex gap-3 p-4 rounded-xl bg-background border border-[#E2E8F0]">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 mt-0.5">
                          <CheckCircle className="h-4 w-4 text-accent" />
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{tip}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Bottom CTA */}
          <section className="py-12 bg-primary text-primary-foreground">
            <div className="mx-auto max-w-[1280px] px-4 text-center">
              <h2 className="text-2xl font-bold mb-3">加入 GreenMiles，让每一次飞行都有意义</h2>
              <p className="text-primary-foreground/70 mb-6">
                注册即赠 10,000 绿色里程，开启你的低碳飞行之旅
              </p>
              <Link href="/register" className={cn(buttonVariants({ size: 'lg' }))}>
                免费注册
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </div>
          </section>
        </>
      )}

      {isAuthenticated && (
        <>
          {/* KPI Dashboard */}
          <section className="py-8">
            <div className="mx-auto max-w-[1280px] px-4">
              <h2 className="text-xl font-bold text-primary mb-4">数据看板</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border border-[#E2E8F0]">
                  <CardHeader className="pb-2">
                    <CardDescription>里程余额</CardDescription>
                    <CardTitle className="text-3xl text-accent">
                      {user?.miles_balance.toLocaleString()}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Plane className="h-4 w-4 text-muted-foreground" />
                  </CardContent>
                </Card>

                <Card className="border border-[#E2E8F0]">
                  <CardHeader className="pb-2">
                    <CardDescription>累计碳减排</CardDescription>
                    <CardTitle className="text-3xl text-accent">160 kg</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TreePine className="h-4 w-4 text-muted-foreground" />
                  </CardContent>
                </Card>

                <Card className="border border-[#E2E8F0]">
                  <CardHeader className="pb-2">
                    <CardDescription>里程绿色转化率</CardDescription>
                    <CardTitle className="text-3xl text-accent">32%</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardContent>
                </Card>

                <Card className="border border-[#E2E8F0]">
                  <CardHeader className="pb-2">
                    <CardDescription>兑换次数</CardDescription>
                    <CardTitle className="text-3xl text-accent">5</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardContent>
                </Card>

                <Link href="/calculator">
                  <Card className="border border-[#E2E8F0] hover:shadow-md transition-shadow cursor-pointer">
                    <CardHeader className="pb-2">
                      <CardDescription>碳排放计算器</CardDescription>
                      <CardTitle className="text-lg text-accent">开始计算</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Plane className="h-4 w-4 text-muted-foreground" />
                    </CardContent>
                  </Card>
                </Link>
              </div>
            </div>
          </section>

          {/* Charts */}
          <section className="pb-8">
            <div className="mx-auto max-w-[1280px] px-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border border-[#E2E8F0]">
                  <CardHeader>
                    <CardTitle className="text-base">月度碳减排趋势</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={mockOffsetData}>
                          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Bar dataKey="offset" fill="#10B981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-[#E2E8F0]">
                  <CardHeader>
                    <CardTitle className="text-base">里程转化率</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-48 flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={mockConversionData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={70}
                            dataKey="value"
                            stroke="none"
                          >
                            {mockConversionData.map((_, index) => (
                              <Cell key={index} fill={CHART_COLORS[index]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          {/* Recommended Products */}
          <section className="pb-16">
            <div className="mx-auto max-w-[1280px] px-4">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-primary">推荐商品</h2>
                <Link href="/mall" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
                  查看全部
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onClick={() => handleProductClick(product)}
                  />
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      <ProductDetailSheet
        product={selectedProduct}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
}
