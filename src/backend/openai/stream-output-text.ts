export function createOutputTextStream(response: Response) {
  if (!response.body) {
    throw new Error('OpenAI 已返回响应，但没有可读取的流。');
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader = response.body.getReader();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split('\n\n');
          buffer = events.pop() || '';

          for (const eventChunk of events) {
            const lines = eventChunk
              .split('\n')
              .map((line) => line.trim())
              .filter(Boolean);

            for (const line of lines) {
              if (!line.startsWith('data:')) {
                continue;
              }

              const data = line.slice(5).trim();

              if (!data || data === '[DONE]') {
                continue;
              }

              const parsed = JSON.parse(data) as {
                type?: string;
                delta?: string;
                text?: string;
              };

              if (parsed.type === 'response.output_text.delta' && parsed.delta) {
                controller.enqueue(encoder.encode(parsed.delta));
              }

              if (parsed.type === 'response.output_text.done' && parsed.text) {
                controller.enqueue(encoder.encode(''));
              }
            }
          }
        }
      } catch {
        controller.error(new Error('读取 OpenAI 流失败。'));
        return;
      }

      controller.close();
    },
  });
}
