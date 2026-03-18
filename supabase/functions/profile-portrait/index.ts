import { createCorsHeaders, extractOutputText, getOpenAIEnv } from '../_shared/openai.ts';

type PortraitBody = {
  entries: Array<{
    entry_date: string;
    raw_text: string;
    summary_short: string | null;
    dominant_emotion: string | null;
  }>;
  startDate: string;
  endDate: string;
};

Deno.serve(async (request) => {
  const corsHeaders = createCorsHeaders();

  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { apiKey, model } = getOpenAIEnv();

    if (!apiKey) {
      return Response.json(
        { error: 'Missing OPENAI_API_KEY in Edge Function secrets.' },
        { status: 500, headers: corsHeaders }
      );
    }

    const body = (await request.json()) as PortraitBody;

    if (!body.entries?.length) {
      return Response.json(
        { error: 'No diary entries found in this range.' },
        { status: 400, headers: corsHeaders }
      );
    }

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
          '你是一个中文心理陪伴产品里的总结助手。请基于用户在指定时间区间内的日记，生成一段 120 到 220 字的用户画像总结。总结要温和、具体、像真实观察，不要诊断，不要夸张，不要列表，语气要像直接对用户说话。',
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
      return Response.json(
        { error: payload?.error?.message || 'OpenAI request failed.' },
        { status: response.status, headers: corsHeaders }
      );
    }

    const summary = extractOutputText(payload);

    if (!summary) {
      return Response.json(
        { error: 'The model returned a response, but no summary was parsed.' },
        { status: 500, headers: corsHeaders }
      );
    }

    return Response.json(
      { summary },
      { status: 200, headers: corsHeaders }
    );
  } catch {
    return Response.json(
      { error: 'Unexpected error in profile-portrait function.' },
      { status: 500, headers: corsHeaders }
    );
  }
});
