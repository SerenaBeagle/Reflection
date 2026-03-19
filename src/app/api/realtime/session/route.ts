import { NextRequest, NextResponse } from 'next/server';
import { createRealtimeCall } from '@/backend/services/realtime-service';
import { AIMode } from '@/types/user';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const aiMode = parseAIMode(request.nextUrl.searchParams.get('aiMode'));
    const sdp = await request.text();
    const result = await createRealtimeCall(sdp, aiMode);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return new Response(result.sdp, {
      headers: {
        'Content-Type': 'application/sdp',
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return NextResponse.json(
      { error: '创建实时语音会话时发生异常，请稍后再试。' },
      { status: 500 }
    );
  }
}

function parseAIMode(value: string | null): AIMode {
  if (
    value === 'best-friend' ||
    value === 'gentle-listener' ||
    value === 'reflective-coach' ||
    value === 'playful-companion'
  ) {
    return value;
  }

  return 'gentle-listener';
}
