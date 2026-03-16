import { NextRequest, NextResponse } from 'next/server';
import { EmotionType } from '@/types/message';

type PortraitRequestBody = {
  entries: Array<{
    entry_date: string;
    raw_text: string;
    summary_short: string | null;
    dominant_emotion: EmotionType | null;
  }>;
  startDate: string;
  endDate: string;
};

type ResponseOutputContentItem = {
  type?: string;
  text?: string;
};

type ResponseOutputItem = {
  content?: ResponseOutputContentItem[];
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

    const body = (await request.json()) as PortraitRequestBody;

    if (!body.entries?.length) {
      return NextResponse.json(
        { error: '这个时间区间里还没有足够的日记记录。' },
        { status: 400 }
      );
    }

    const model = process.env.OPENAI_MODEL || 'gpt-5-mini';
    const diaryContext = body.entries
      .map((entry) => {
        const summary = entry.summary_short ? `摘要：${entry.summary_short}` : '';
        const emotion = entry.dominant_emotion ? `情绪：${entry.dominant_emotion}` : '';
        return `日期：${entry.entry_date}\n${summary}\n${emotion}\n正文：${entry.raw_text}`;
      })
      .join('\n\n---\n\n');

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        reasoning: { effort: 'low' },
        instructions:
          '你是一个中文心理陪伴产品里的总结助手。请基于用户在指定时间区间内的日记，生成一段 120 到 220 字的用户画像总结。总结要温和、具体、像真实观察，不要诊断，不要夸张，不要列表。',
        input: [
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: `请总结 ${body.startDate} 到 ${body.endDate} 的用户画像。\n\n${diaryContext}`,
              },
            ],
          },
        ],
      }),
    });

    const payload = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: payload?.error?.message || '生成画像失败，请稍后再试。' },
        { status: response.status }
      );
    }

    const summary = extractOutputText(payload);

    if (!summary) {
      return NextResponse.json(
        { error: '模型已返回结果，但没有解析到画像内容。' },
        { status: 500 }
      );
    }

    return NextResponse.json({ summary });
  } catch {
    return NextResponse.json(
      { error: '生成用户画像时发生异常，请稍后再试。' },
      { status: 500 }
    );
  }
}

function extractOutputText(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    return '';
  }

  const outputText =
    'output_text' in payload && typeof payload.output_text === 'string'
      ? payload.output_text
      : '';

  if (outputText) {
    return outputText.trim();
  }

  if (!('output' in payload) || !Array.isArray(payload.output)) {
    return '';
  }

  return (payload.output as ResponseOutputItem[])
    .flatMap((item) => {
      if (!item || typeof item !== 'object' || !('content' in item) || !Array.isArray(item.content)) {
        return [];
      }

      return item.content
        .map((contentItem: ResponseOutputContentItem) => {
          if (
            contentItem &&
            typeof contentItem === 'object' &&
            'type' in contentItem &&
            contentItem.type === 'output_text' &&
            'text' in contentItem &&
            typeof contentItem.text === 'string'
          ) {
            return contentItem.text;
          }

          return '';
        })
        .filter(Boolean);
    })
    .join('\n')
    .trim();
}
