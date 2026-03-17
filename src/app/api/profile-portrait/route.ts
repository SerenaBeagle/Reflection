import { NextRequest, NextResponse } from 'next/server';
import { generatePortraitSummary } from '@/backend/services/portrait-service';
import { PortraitRequestBody } from '@/shared/api/portrait';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as PortraitRequestBody;
    const result = await generatePortraitSummary(body);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ summary: result.summary });
  } catch {
    return NextResponse.json(
      { error: '生成用户画像时发生异常，请稍后再试。' },
      { status: 500 }
    );
  }
}
