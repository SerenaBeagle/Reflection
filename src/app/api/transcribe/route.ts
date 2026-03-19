import { NextRequest, NextResponse } from 'next/server';
import { transcribeAudioFile } from '@/backend/services/transcribe-service';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: '请先上传一段音频。' },
        { status: 400 }
      );
    }

    const result = await transcribeAudioFile(file);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ text: result.text });
  } catch {
    return NextResponse.json(
      { error: '处理语音时发生异常，请稍后再试。' },
      { status: 500 }
    );
  }
}
