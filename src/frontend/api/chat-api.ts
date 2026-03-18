import { ChatRequestBody } from '@/shared/api/chat';
import {
  getEdgeFunctionHeaders,
  getEdgeFunctionUrl,
  useEdgeFunctions,
} from '@/frontend/api/backend-config';

export async function requestChatStream(body: ChatRequestBody) {
  const url = useEdgeFunctions() ? getEdgeFunctionUrl('chat') : '/api/chat';
  const headers = useEdgeFunctions()
    ? getEdgeFunctionHeaders()
    : {
        'Content-Type': 'application/json',
      };

  return fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}
