import { getOpenAIConfig } from '@/backend/openai/config';
import { extractOutputText } from '@/backend/openai/responses';
import { PortraitRequestBody } from '@/shared/api/portrait';

export async function generatePortraitSummary(body: PortraitRequestBody) {
  const { apiKey, model } = getOpenAIConfig();

  if (!apiKey) {
    return {
      ok: false as const,
      status: 500,
      error: '缺少 OPENAI_API_KEY，请先在 .env.local 配置。',
    };
  }

  if (!body.entries?.length) {
    return {
      ok: false as const,
      status: 400,
      error: '这个时间区间里还没有足够的日记记录。',
    };
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
    return {
      ok: false as const,
      status: response.status,
      error: payload?.error?.message || '生成画像失败，请稍后再试。',
    };
  }

  const summary = extractOutputText(payload);

  if (!summary) {
    return {
      ok: false as const,
      status: 500,
      error: '模型已返回结果，但没有解析到画像内容。',
    };
  }

  return {
    ok: true as const,
    summary,
  };
}
