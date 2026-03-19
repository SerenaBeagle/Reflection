import { buildRealtimeVoicePrompt } from '@/backend/openai/chat-prompt';
import { getOpenAIConfig } from '@/backend/openai/config';
import { AIMode } from '@/types/user';

export async function createRealtimeCall(sdp: string, aiMode: AIMode) {
  const { apiKey, realtimeModel, realtimeVoice } = getOpenAIConfig();

  if (!apiKey) {
    return {
      ok: false as const,
      status: 500,
      error: '缺少 OPENAI_API_KEY，请先在部署环境中配置。',
    };
  }

  if (!sdp.trim()) {
    return {
      ok: false as const,
      status: 400,
      error: '没有收到浏览器的音频会话请求。',
    };
  }

  const formData = new FormData();
  formData.set('sdp', sdp);
  formData.set(
    'session',
    JSON.stringify({
      type: 'realtime',
      model: realtimeModel,
      instructions: buildRealtimeVoicePrompt(aiMode),
      audio: {
        input: {
          turn_detection: {
            type: 'server_vad',
          },
          transcription: {
            model: 'gpt-4o-mini-transcribe',
            language: 'zh',
          },
        },
        output: {
          voice: realtimeVoice,
        },
      },
    })
  );

  const response = await fetch('https://api.openai.com/v1/realtime/calls', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
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
    sdp: await response.text(),
  };
}

async function readOpenAIError(response: Response) {
  try {
    const payload = await response.json();
    return payload?.error?.message || 'OpenAI 实时语音会话创建失败。';
  } catch {
    return 'OpenAI 实时语音会话创建失败。';
  }
}
