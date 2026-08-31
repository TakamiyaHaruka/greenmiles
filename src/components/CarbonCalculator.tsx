'use client';

import { useMemo, useState, useEffect } from 'react';
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
import { AIRPORTS, airportLabel, flightDistanceKm } from '@/lib/airports';
import type { FlightInfo } from '@/lib/flightInfo';
import { useCarbonStore } from '@/stores/carbonStore';
import { z } from 'zod';
import { toast } from 'sonner';
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
import { Plane, TreePine, ArrowRight, MapPin, Save, Check, Search, PlaneTakeoff, PlaneLanding } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const CHART_COLORS = {
  emission: '#10B981',
  background: '#E2E8F0',
};

const FormSchema = z.object({
  depAirport: z.string().optional(),
  arrAirport: z.string().optional(),
  distance: z.string().min(1, '请输入距离').refine((v) => Number(v) > 0, '距离必须大于 0'),
  aircraftType: z.enum(['NARROW_EFFICIENT', 'NARROW_STANDARD', 'WIDE_EFFICIENT', 'WIDE_LARGE'], { message: '请选择机型' }),
  cabinClass: z.enum(['Y', 'W', 'C', 'F'], { message: '请选择舱位' }),
});

const AIRPORT_OPTIONS = Object.values(AIRPORTS).sort((a, b) =>
  a.city.localeCompare(b.city, 'zh') || a.code.localeCompare(b.code)
);

export function CarbonCalculator() {
  const router = useRouter();
  const { setCarbonResult } = useCarbonStore();
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Flight-number import state
  const [flightNo, setFlightNo] = useState('');
  const [flightDate, setFlightDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [importedFlight, setImportedFlight] = useState<FlightInfo | null>(null);

  const {
    register,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      depAirport: undefined,
      arrAirport: undefined,
      distance: '',
      aircraftType: undefined,
      cabinClass: undefined,
    },
  });

  const depAirport = watch('depAirport');
  const arrAirport = watch('arrAirport');
  const distance = watch('distance');
  const aircraftType = watch('aircraftType');
  const cabinClass = watch('cabinClass');

  // Whenever both airports are set, derive the great-circle distance
  const computedDistance = useMemo(
    () => (depAirport && arrAirport ? flightDistanceKm(depAirport, arrAirport) : null),
    [depAirport, arrAirport]
  );

  useEffect(() => {
    if (computedDistance !== null) {
      setValue('distance', String(computedDistance));
    }
  }, [computedDistance, setValue]);

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

  const applyRoute = (dep: string, arr: string, aircraft?: AircraftType) => {
    setValue('depAirport', dep);
    setValue('arrAirport', arr);
    if (aircraft) {
      setValue('aircraftType', aircraft);
    }
  };

  const handleLookup = async () => {
    if (!flightNo.trim() || lookingUp) return;
    setLookingUp(true);
    setLookupError(null);
    setImportedFlight(null);
    try {
      const params = new URLSearchParams({ flightNo: flightNo.trim(), date: flightDate });
      const res = await fetch(`/api/flight?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 404) {
          setLookupError(data.error || '未查询到该航班');
        } else {
          setLookupError(data.error || '查询失败，请稍后重试');
        }
        return;
      }
      const info: FlightInfo = data.data;
      setImportedFlight(info);
      applyRoute(info.dep, info.arr, info.aircraftType);
    } catch {
      setLookupError('网络错误，请稍后重试');
    } finally {
      setLookingUp(false);
    }
  };

  // A saved record is only valid for the inputs it was computed from
  useEffect(() => {
    setSaveState('idle');
  }, [distance, aircraftType, cabinClass, depAirport, arrAirport]);

  const handleSave = async () => {
    if (co2Kg === null || !aircraftType || !cabinClass || saveState === 'saving') return;
    setSaveState('saving');
    try {
      const res = await fetch('/api/carbon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          distance: Number(distance),
          aircraftType,
          cabinClass,
          ...(depAirport && arrAirport ? { route: `${depAirport}→${arrAirport}` } : {}),
        }),
      });
      setSaveState(res.ok ? 'saved' : 'error');
      if (res.ok) {
        toast.success('已保存到我的碳足迹');
      }
    } catch {
      setSaveState('error');
    }
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
          {/* Flight number import */}
          <div>
            <label htmlFor="flightNo" className="text-sm font-medium text-muted-foreground mb-1.5 block">
              按航班号导入
            </label>
            <div className="flex gap-2">
              <Input
                id="flightNo"
                placeholder="航班号，如 CA1501"
                value={flightNo}
                onChange={(e) => setFlightNo(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                className="h-9"
              />
              <Input
                type="date"
                aria-label="航班日期"
                value={flightDate}
                onChange={(e) => setFlightDate(e.target.value)}
                className="h-9 w-36"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleLookup}
                disabled={lookingUp || !flightNo.trim()}
                className="h-9"
              >
                <Search className="h-4 w-4 mr-1" />
                {lookingUp ? '查询中...' : '查询'}
              </Button>
            </div>
            {lookupError && (
              <p className="text-xs text-muted-foreground mt-1.5">{lookupError}</p>
            )}
            {importedFlight && (
              <Badge variant="secondary" className="mt-2 font-normal">
                {importedFlight.airline} {importedFlight.flightNo} ·{' '}
                {airportLabel(importedFlight.dep)} → {airportLabel(importedFlight.arr)} ·{' '}
                {importedFlight.distanceKm.toLocaleString()} km
                {importedFlight.aircraftCode && ` · ${importedFlight.aircraftCode}`}
                <span className="ml-1 text-muted-foreground">（演示数据）</span>
              </Badge>
            )}
          </div>

          <Separator />

          {/* Preset Routes */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              常用航线
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESET_ROUTES.map((route) => {
                const from = AIRPORTS[route.from];
                const to = AIRPORTS[route.to];
                return (
                  <Button
                    key={`${route.from}-${route.to}`}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setImportedFlight(null);
                      setLookupError(null);
                      applyRoute(route.from, route.to);
                    }}
                    className="text-xs"
                  >
                    <MapPin className="h-3 w-3 mr-1" />
                    {from.city}→{to.city}
                  </Button>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Departure / Arrival airports */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
                <PlaneTakeoff className="h-3.5 w-3.5 inline mr-1" />
                出发机场
              </label>
              <Controller
                name="depAirport"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full h-9">
                      <SelectValue placeholder="选择机场" />
                    </SelectTrigger>
                    <SelectContent>
                      {AIRPORT_OPTIONS.map((airport) => (
                        <SelectItem key={airport.code} value={airport.code}>
                          {airportLabel(airport.code)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
                <PlaneLanding className="h-3.5 w-3.5 inline mr-1" />
                到达机场
              </label>
              <Controller
                name="arrAirport"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full h-9">
                      <SelectValue placeholder="选择机场" />
                    </SelectTrigger>
                    <SelectContent>
                      {AIRPORT_OPTIONS.map((airport) => (
                        <SelectItem key={airport.code} value={airport.code}>
                          {airportLabel(airport.code)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

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
              placeholder="选择机场后自动计算，也可手动输入"
              {...register('distance', {
                valueAsNumber: false,
              })}
              className="h-9"
            />
            {computedDistance !== null && (
              <p className="text-xs text-muted-foreground mt-1">
                已按 {depAirport}→{arrAirport} 大圆距离自动填充，可手动修正
              </p>
            )}
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
              <div className="w-full space-y-2">
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
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleSave}
                  disabled={saveState === 'saving' || saveState === 'saved'}
                >
                  {saveState === 'saved' ? (
                    <Check className="h-4 w-4 mr-2 text-accent" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {saveState === 'saving'
                    ? '保存中...'
                    : saveState === 'saved'
                      ? '已保存到我的碳足迹'
                      : saveState === 'error'
                        ? '保存失败，点击重试'
                        : '保存到我的碳足迹'}
                </Button>
              </div>
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
                输入航班号或选择起降机场，填写机型和舱位后，将实时计算碳排放量
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
