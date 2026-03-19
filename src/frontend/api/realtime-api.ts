import {
  RealtimeSessionErrorResponse,
  RealtimeSessionRequest,
} from '@/shared/api/realtime';

export async function requestRealtimeSession({
  aiMode,
  sdp,
}: RealtimeSessionRequest) {
  const response = await fetch(`/api/realtime/session?aiMode=${encodeURIComponent(aiMode)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/sdp',
    },
    body: sdp,
  });

  if (!response.ok) {
    let errorMessage = '实时语音连接失败，请稍后再试。';

    try {
      const payload = (await response.json()) as RealtimeSessionErrorResponse;
      if (payload?.error) {
        errorMessage = payload.error;
      }
    } catch {
      // Ignore parse failures and use the fallback message.
    }

    return {
      ok: false as const,
      error: errorMessage,
    };
  }

  const answerSdp = await response.text();

  return {
    ok: true as const,
    sdp: answerSdp,
  };
}
