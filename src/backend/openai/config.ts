export function getOpenAIConfig() {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'gpt-5-mini';
  const transcriptionModel =
    process.env.OPENAI_TRANSCRIPTION_MODEL || 'gpt-4o-mini-transcribe';
  const realtimeModel = process.env.OPENAI_REALTIME_MODEL || 'gpt-realtime';
  const realtimeVoice = process.env.OPENAI_REALTIME_VOICE || 'marin';

  return {
    apiKey,
    model,
    transcriptionModel,
    realtimeModel,
    realtimeVoice,
  };
}
