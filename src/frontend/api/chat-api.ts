import { ChatRequestBody } from '@/shared/api/chat';

export async function requestChatStream(body: ChatRequestBody) {
  return fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}
