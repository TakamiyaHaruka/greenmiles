import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getFlightProvider } from '@/lib/flightInfo';
import { airportLabel } from '@/lib/airports';

// Query params: a flight number and (optionally) the date it operates
const FlightQuerySchema = z.object({
  flightNo: z
    .string()
    .trim()
    .regex(/^[A-Z0-9]{2}\d{1,4}$/i, '航班号格式无效，如 CA1501'),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式无效，应为 YYYY-MM-DD')
    .optional(),
});

export async function GET(request: NextRequest) {
  try {
    const parsed = FlightQuerySchema.safeParse({
      flightNo: request.nextUrl.searchParams.get('flightNo') ?? '',
      date: request.nextUrl.searchParams.get('date') ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || '参数无效' },
        { status: 400 }
      );
    }

    const { flightNo, date } = parsed.data;
    const info = await getFlightProvider().lookup(flightNo.toUpperCase(), date);

    if (!info) {
      return NextResponse.json(
        { error: '未查询到该航班，可手动选择起降机场' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: {
        ...info,
        depLabel: airportLabel(info.dep),
        arrLabel: airportLabel(info.arr),
      },
    });
  } catch {
    return NextResponse.json({ error: '查询失败，请稍后重试' }, { status: 500 });
  }
}
