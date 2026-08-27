import { CarbonCalculator } from '@/components/CarbonCalculator';

export default function CalculatorPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1280px] px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary">碳排放计算器</h1>
          <p className="text-muted-foreground mt-2">
            输入航班信息，了解您的飞行碳排放量
          </p>
        </div>
        <CarbonCalculator />
      </div>
    </div>
  );
}
