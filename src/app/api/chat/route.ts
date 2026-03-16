import { NextRequest, NextResponse } from 'next/server';
import { AIMode } from '@/types/user';
import { Message } from '@/types/message';

type ChatRequestBody = {
  message: string;
  messages: Message[];
  aiMode: AIMode;
  mode: 'chat' | 'diary';
};

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: '缺少 OPENAI_API_KEY，请先在 .env.local 配置。' },
        { status: 500 }
      );
    }

    const body = (await request.json()) as ChatRequestBody;
    const message = body.message?.trim();

    if (!message) {
      return NextResponse.json({ error: '消息内容不能为空。' }, { status: 400 });
    }

    const model = process.env.OPENAI_MODEL || 'gpt-5-mini';
    const systemPrompt = buildSystemPrompt(body.aiMode, body.mode);
    const recentMessages = body.messages.slice(-10);

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        stream: true,
        reasoning: { effort: 'low' },
        instructions: systemPrompt,
        input: [
          ...recentMessages.map((item) => ({
            role: item.sender === 'user' ? 'user' : 'assistant',
            content: [
              item.sender === 'user'
                ? { type: 'input_text', text: item.content }
                : { type: 'output_text', text: item.content },
            ],
          })),
          {
            role: 'user',
            content: [{ type: 'input_text', text: message }],
          },
        ],
      }),
    });

    if (!response.ok) {
      const payload = await response.json();
      const apiError =
        payload?.error?.message || 'OpenAI 请求失败，请稍后再试。';

      return NextResponse.json({ error: apiError }, { status: response.status });
    }

    if (!response.body) {
      return NextResponse.json(
        { error: 'OpenAI 已返回响应，但没有可读取的流。' },
        { status: 500 }
      );
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const reader = response.body.getReader();

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              break;
            }

            buffer += decoder.decode(value, { stream: true });
            const events = buffer.split('\n\n');
            buffer = events.pop() || '';

            for (const eventChunk of events) {
              const lines = eventChunk
                .split('\n')
                .map((line) => line.trim())
                .filter(Boolean);

              for (const line of lines) {
                if (!line.startsWith('data:')) {
                  continue;
                }

                const data = line.slice(5).trim();

                if (!data || data === '[DONE]') {
                  continue;
                }

                const parsed = JSON.parse(data) as {
                  type?: string;
                  delta?: string;
                  text?: string;
                };

                if (parsed.type === 'response.output_text.delta' && parsed.delta) {
                  controller.enqueue(encoder.encode(parsed.delta));
                }

                if (parsed.type === 'response.output_text.done' && parsed.text) {
                  controller.enqueue(encoder.encode(''));
                }
              }
            }
          }
        } catch {
          controller.error(new Error('读取 OpenAI 流失败。'));
          return;
        }

        controller.close();
      },
    });

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

function buildSystemPrompt(aiMode: AIMode, mode: 'chat' | 'diary') {
  const basePrompt =
    '你是 Reflection 应用里的中文陪伴型 AI 助手。回答保持温柔、具体、自然，不说套话，不要提及自己是语言模型。';

  const modePrompt =
    mode === 'diary'
      ? '当前是日记模式。用户刚写下一段日记，请先共情，再用 1 到 3 句帮助用户总结感受或轻轻追问，不要过度分析。'
      : '当前是聊天模式。请像真实、稳定、细腻的陪伴者一样回应，优先理解用户情绪，再给出简短可执行的支持。';

  const stylePromptMap: Record<AIMode, string> = {
    'best-friend': '语气像亲密朋友，真诚、直接、有陪伴感。',
    'gentle-listener': '语气温柔、耐心、擅长倾听和接住情绪。',
    'reflective-coach': '语气冷静但不生硬，擅长帮助用户梳理感受和看见模式。',
    'playful-companion': '语气轻盈一点，但不要幼稚，适合在低压氛围里鼓励用户继续表达。',
  };

  return `${basePrompt}\n${modePrompt}\n${stylePromptMap[aiMode]}\n回复尽量控制在 120 中文字以内。`;
}
