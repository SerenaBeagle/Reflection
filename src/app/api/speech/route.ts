import { NextRequest, NextResponse } from 'next/server';
import { synthesizeSpeech } from '@/backend/services/speech-service';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { text?: string };
    const result = await synthesizeSpeech(body.text || '');

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return new Response(result.audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return NextResponse.json(
      { error: '生成语音时发生异常，请稍后再试。' },
      { status: 500 }
    );
  }
}
