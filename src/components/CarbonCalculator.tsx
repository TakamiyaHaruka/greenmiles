'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  calculateCarbonEmission,
  getCarbonAnalogy,
  formatEmission,
  PRESET_ROUTES,
  AIRCRAFT_TYPES,
  CABIN_CLASSES,
  type AircraftType,
  type CabinClass,
} from '@/lib/carbon';
import { useCarbonStore } from '@/stores/carbonStore';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plane, TreePine, ArrowRight, MapPin } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const CHART_COLORS = {
  emission: '#10B981',
  background: '#E2E8F0',
};

const FormSchema = z.object({
  distance: z.string().min(1, '请输入距离').refine((v) => Number(v) > 0, '距离必须大于 0'),
  aircraftType: z.enum(['NARROW_EFFICIENT', 'NARROW_STANDARD', 'WIDE_EFFICIENT', 'WIDE_LARGE'], { message: '请选择机型' }),
  cabinClass: z.enum(['Y', 'W', 'C', 'F'], { message: '请选择舱位' }),
});

export function CarbonCalculator() {
  const router = useRouter();
  const { setCarbonResult } = useCarbonStore();
  const {
    register,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      distance: '',
      aircraftType: undefined,
      cabinClass: undefined,
    },
  });

  const distance = watch('distance');
  const aircraftType = watch('aircraftType');
  const cabinClass = watch('cabinClass');

  const isComplete =
    distance &&
    Number(distance) > 0 &&
    aircraftType &&
    cabinClass;

  const co2Kg = useMemo(() => {
    if (!isComplete || !aircraftType || !cabinClass) return null;
    try {
      return calculateCarbonEmission(
        Number(distance),
        aircraftType as AircraftType,
        cabinClass as CabinClass
      );
    } catch {
      return null;
    }
  }, [isComplete, distance, aircraftType, cabinClass]);

  const analogy = useMemo(() => {
    if (co2Kg === null) return '';
    return getCarbonAnalogy(co2Kg);
  }, [co2Kg]);

  const chartData = useMemo(() => {
    if (co2Kg === null) return [];
    const maxScale = co2Kg * 1.5;
    return [
      { name: '排放量', value: co2Kg },
      { name: '剩余', value: maxScale - co2Kg },
    ];
  }, [co2Kg]);

  const handlePresetRoute = (distanceKm: number) => {
    setValue('distance', String(distanceKm));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Input Form */}
      <Card className="border border-[#E2E8F0]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plane className="h-5 w-5 text-accent" />
            航班信息
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Preset Routes */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              常用航线
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESET_ROUTES.map((route) => (
                <Button
                  key={`${route.from}-${route.to}`}
                  variant="outline"
                  size="sm"
                  onClick={() => handlePresetRoute(route.distance)}
                  className="text-xs"
                >
                  <MapPin className="h-3 w-3 mr-1" />
                  {route.from}→{route.to}
                  <span className="ml-1 text-muted-foreground">
                    {route.distance}km
                  </span>
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Distance Input */}
          <div>
            <label
              htmlFor="distance"
              className="text-sm font-medium text-muted-foreground mb-1.5 block"
            >
              飞行距离 (km)
            </label>
            <Input
              id="distance"
              type="number"
              placeholder="输入飞行距离，如 1075"
              {...register('distance', {
                valueAsNumber: false,
              })}
              className="h-9"
            />
            {errors.distance && (
              <p className="text-xs text-destructive mt-1">
                {errors.distance.message}
              </p>
            )}
          </div>

          {/* Aircraft Type Select */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
              机型
            </label>
            <Controller
              name="aircraftType"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full h-9">
                    <SelectValue placeholder="选择机型" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(AIRCRAFT_TYPES).map(([key, info]) => (
                      <SelectItem key={key} value={key}>
                        {info.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Cabin Class Select */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
              舱位
            </label>
            <Controller
              name="cabinClass"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full h-9">
                    <SelectValue placeholder="选择舱位" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CABIN_CLASSES).map(([key, info]) => (
                      <SelectItem key={key} value={key}>
                        {info.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </CardContent>
      </Card>

      {/* Right: Result Display */}
      <Card className="border border-[#E2E8F0]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TreePine className="h-5 w-5 text-accent" />
            碳排放结果
          </CardTitle>
        </CardHeader>
        <CardContent>
          {co2Kg !== null ? (
            <div className="flex flex-col items-center gap-6">
              {/* Donut Chart */}
              <div className="relative h-48 w-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      startAngle={90}
                      endAngle={-270}
                      dataKey="value"
                      stroke="none"
                    >
                      <Cell fill={CHART_COLORS.emission} />
                      <Cell fill={CHART_COLORS.background} />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-primary">
                    {co2Kg}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    kg CO₂
                  </span>
                </div>
              </div>

              {/* Analogy */}
              <div className="text-center">
                <p className="text-sm text-muted-foreground">{analogy}</p>
              </div>

              {/* Summary Badge */}
              <Badge variant="secondary" className="text-sm px-4 py-1.5">
                {formatEmission(co2Kg)}
              </Badge>

              <Separator />

              {/* CTA */}
              <Button
                className="w-full"
                size="lg"
                onClick={() => {
                  setCarbonResult(co2Kg, analogy);
                  router.push('/mall');
                }}
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                前往绿色商城抵消
              </Button>
            </div>
          ) : (
            /* Empty State */
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Plane className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">
                请输入完整的航班信息
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                填写距离、机型和舱位后，将实时计算碳排放量
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
