import { NextRequest, NextResponse } from 'next/server';
import { createOutputTextStream } from '@/backend/openai/stream-output-text';
import { createChatCompletionStream } from '@/backend/services/chat-service';
import { ChatRequestBody } from '@/shared/api/chat';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ChatRequestBody;
    const result = await createChatCompletionStream(body);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const { response } = result;

    if (!response.ok) {
      const payload = await response.json();
      const apiError = payload?.error?.message || 'OpenAI 请求失败，请稍后再试。';
      return NextResponse.json({ error: apiError }, { status: response.status });
    }

    if (!response.body) {
      return NextResponse.json(
        { error: 'OpenAI 已返回响应，但没有可读取的流。' },
        { status: 500 }
      );
    }

    const stream = createOutputTextStream(response);

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
      },
    });
  } catch {
    return NextResponse.json(
      { error: '调用 OpenAI 时发生异常，请检查 API Key 和网络配置。' },
      { status: 500 }
    );
  }
}
