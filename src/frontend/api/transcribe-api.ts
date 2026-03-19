import {
  TranscriptionErrorResponse,
  TranscriptionResponse,
} from '@/shared/api/transcribe';

export async function requestTranscription(file: File) {
  const formData = new FormData();
  formData.set('file', file, file.name);

  const response = await fetch('/api/transcribe', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    let errorMessage = '语音识别失败，请稍后再试。';

    try {
      const payload = (await response.json()) as TranscriptionErrorResponse;
      if (payload?.error) {
        errorMessage = payload.error;
      }
    } catch {
      // Ignore JSON parse failures and use the fallback message.
    }

    return {
      ok: false as const,
      error: errorMessage,
    };
  }

  const payload = (await response.json()) as TranscriptionResponse;

  return {
    ok: true as const,
    text: payload.text,
  };
}
