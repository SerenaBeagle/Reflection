export function getOpenAIEnv() {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  const model = Deno.env.get('OPENAI_MODEL') || 'gpt-5-mini';

  return {
    apiKey,
    model,
  };
}

type ResponseOutputContentItem = {
  type?: string;
  text?: string;
};

type ResponseOutputItem = {
  content?: ResponseOutputContentItem[];
};

export function extractOutputText(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    return '';
  }

  const outputText =
    'output_text' in payload && typeof payload.output_text === 'string'
      ? payload.output_text
      : '';

  if (outputText) {
    return outputText.trim();
  }

  if (!('output' in payload) || !Array.isArray(payload.output)) {
    return '';
  }

  return (payload.output as ResponseOutputItem[])
    .flatMap((item) => {
      if (!item || typeof item !== 'object' || !('content' in item) || !Array.isArray(item.content)) {
        return [];
      }

      return item.content
        .map((contentItem: ResponseOutputContentItem) => {
          if (
            contentItem &&
            typeof contentItem === 'object' &&
            'type' in contentItem &&
            contentItem.type === 'output_text' &&
            'text' in contentItem &&
            typeof contentItem.text === 'string'
          ) {
            return contentItem.text;
          }

          return '';
        })
        .filter(Boolean);
    })
    .join('\n')
    .trim();
}

export function createCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}
