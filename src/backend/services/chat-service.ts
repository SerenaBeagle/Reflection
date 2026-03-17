import { ChatRequestBody } from '@/shared/api/chat';
import { AIMode } from '@/types/user';
import { getOpenAIConfig } from '@/backend/openai/config';

export async function createChatCompletionStream(body: ChatRequestBody) {
  const { apiKey, model } = getOpenAIConfig();

  if (!apiKey) {
    return {
      ok: false as const,
      status: 500,
      error: '缺少 OPENAI_API_KEY，请先在 .env.local 配置。',
    };
  }

  const message = body.message?.trim();
  const imageUrl = body.imageUrl?.trim() || '';

  if (!message && !imageUrl) {
    return {
      ok: false as const,
      status: 400,
      error: '消息内容或图片不能为空。',
    };
  }

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
      instructions: buildSystemPrompt(body.aiMode, body.mode),
      input: [
        ...recentMessages.map((item) => ({
          role: item.sender === 'user' ? 'user' : 'assistant',
          content:
            item.sender === 'user'
              ? buildUserContent(item.content, item.imageUrl)
              : [{ type: 'output_text', text: item.content }],
        })),
        {
          role: 'user',
          content: buildUserContent(message, imageUrl),
        },
      ],
    }),
  });

  return {
    ok: true as const,
    response,
  };
}

function buildUserContent(message: string, imageUrl?: string | null) {
  const content: Array<
    | { type: 'input_text'; text: string }
    | { type: 'input_image'; image_url: string }
  > = [];

  if (message) {
    content.push({ type: 'input_text', text: message });
  }

  if (imageUrl && !message) {
    content.push({ type: 'input_text', text: '请根据这张图片，用自然陪伴的方式回复我。' });
  }

  if (imageUrl) {
    content.push({ type: 'input_image', image_url: imageUrl });
  }

  return content;
}

function buildSystemPrompt(aiMode: AIMode, mode: 'chat' | 'diary') {
  const basePrompt =
    '你是 Reflection 应用里的中文陪伴型聊天对象。说话要像真人，不要像客服，不要像心理咨询报告，不要提及自己是语言模型。';

  const modePrompt =
    mode === 'diary'
      ? '当前是日记模式。用户刚写下一段日记。先接住情绪，再轻轻回应。优先短句，像真人回消息，不要长篇分析。'
      : '当前是聊天模式。请像真实朋友发消息一样回应，先理解，再说话。优先短句、口语、自然停顿。';

  const stylePromptMap: Record<AIMode, string> = {
    'best-friend': '语气像亲密朋友，真诚直接，稍微口语一点，可以有一点点吐槽感。',
    'gentle-listener': '语气温柔、慢一点、像认真在回消息的人。',
    'reflective-coach': '语气清醒但不生硬，用很短的话帮用户看清一点点。',
    'playful-companion': '语气轻松有活人感，可以灵动一点，但不要夸张和幼稚。',
  };

  return `${basePrompt}
${modePrompt}
${stylePromptMap[aiMode]}
回复要求：
1. 一次尽量只回 1 到 3 句。
2. 每句尽量短，不要啰嗦，不要总结腔。
3. 不要动不动给很多建议，先像真人一样接话。
4. 如果内容稍多，请用空行分成 2 到 3 条短消息，每条都像单独发出的聊天气泡。
5. 一次回复总长度尽量控制在 60 中文字以内，只有在用户明显需要时才放宽到 120 字。`;
}
