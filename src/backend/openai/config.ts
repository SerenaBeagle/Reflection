export function getOpenAIConfig() {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'gpt-5-mini';

  return {
    apiKey,
    model,
  };
}
