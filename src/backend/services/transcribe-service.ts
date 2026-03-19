import { getOpenAIConfig } from '@/backend/openai/config';

const MAX_AUDIO_SIZE = 25 * 1024 * 1024;

export async function transcribeAudioFile(file: File) {
  const { apiKey, transcriptionModel } = getOpenAIConfig();

  if (!apiKey) {
    return {
      ok: false as const,
      status: 500,
      error: '缺少 OPENAI_API_KEY，请先在 .env.local 配置。',
    };
  }

  if (!file.size) {
    return {
      ok: false as const,
      status: 400,
      error: '没有收到可识别的音频文件。',
    };
  }

  if (file.size > MAX_AUDIO_SIZE) {
    return {
      ok: false as const,
      status: 400,
      error: '音频文件不能超过 25MB。',
    };
  }

  const formData = new FormData();
  formData.set('file', file, file.name || 'recording.webm');
  formData.set('model', transcriptionModel);
  formData.set('language', 'zh');
  formData.set('response_format', 'text');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorMessage = await readOpenAIError(response);

    return {
      ok: false as const,
      status: response.status,
      error: errorMessage,
    };
  }

  const text = (await response.text()).trim();

  if (!text) {
    return {
      ok: false as const,
      status: 500,
      error: '语音已上传，但没有识别出文字。',
    };
  }

  return {
    ok: true as const,
    text,
  };
}

async function readOpenAIError(response: Response) {
  try {
    const payload = await response.json();
    return payload?.error?.message || 'OpenAI 语音识别失败，请稍后再试。';
  } catch {
    return 'OpenAI 语音识别失败，请稍后再试。';
  }
}
