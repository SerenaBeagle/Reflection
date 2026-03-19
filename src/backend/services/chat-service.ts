import { ChatRequestBody } from '@/shared/api/chat';
import { getOpenAIConfig } from '@/backend/openai/config';
import { buildChatSystemPrompt } from '@/backend/openai/chat-prompt';

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
      instructions: buildChatSystemPrompt(body.aiMode, body.mode),
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
