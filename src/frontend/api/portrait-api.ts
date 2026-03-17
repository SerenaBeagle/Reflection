import {
  PortraitErrorResponse,
  PortraitRequestBody,
  PortraitSuccessResponse,
} from '@/shared/api/portrait';

export async function requestPortraitSummary(body: PortraitRequestBody) {
  const response = await fetch('/api/profile-portrait', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json()) as PortraitSuccessResponse | PortraitErrorResponse;

  return {
    ok: response.ok,
    status: response.status,
    payload,
  };
}
