import { getOpenAIConfig } from '@/backend/openai/config';

export async function synthesizeSpeech(text: string) {
  const { apiKey, ttsModel, realtimeVoice } = getOpenAIConfig();

  if (!apiKey) {
    return {
      ok: false as const,
      status: 500,
      error: '缺少 OPENAI_API_KEY，请先在部署环境中配置。',
    };
  }

  if (!text.trim()) {
    return {
      ok: false as const,
      status: 400,
      error: '没有可朗读的文字内容。',
    };
  }

  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: ttsModel,
      voice: realtimeVoice,
      input: text,
      response_format: 'mp3',
    }),
  });

  if (!response.ok) {
    return {
      ok: false as const,
      status: response.status,
      error: await readOpenAIError(response),
    };
  }

  return {
    ok: true as const,
    audioBuffer: await response.arrayBuffer(),
  };
}

async function readOpenAIError(response: Response) {
  try {
    const payload = await response.json();
    return payload?.error?.message || 'OpenAI 语音合成失败，请稍后再试。';
  } catch {
    return 'OpenAI 语音合成失败，请稍后再试。';
  }
}
