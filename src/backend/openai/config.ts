export function getOpenAIConfig() {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'gpt-5-mini';
  const transcriptionModel =
    process.env.OPENAI_TRANSCRIPTION_MODEL || 'gpt-4o-mini-transcribe';

  return {
    apiKey,
    model,
    transcriptionModel,
  };
}
