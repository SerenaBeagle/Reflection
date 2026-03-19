export async function requestSpeechAudio(text: string) {
  const response = await fetch('/api/speech', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    let errorMessage = '语音合成失败，请稍后再试。';

    try {
      const payload = (await response.json()) as { error?: string };
      if (payload?.error) {
        errorMessage = payload.error;
      }
    } catch {
      // Ignore parse failures and use fallback.
    }

    return {
      ok: false as const,
      error: errorMessage,
    };
  }

  return {
    ok: true as const,
    blob: await response.blob(),
  };
}
