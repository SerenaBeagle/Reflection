import {
  PortraitErrorResponse,
  PortraitRequestBody,
  PortraitSuccessResponse,
} from '@/shared/api/portrait';
import {
  getEdgeFunctionHeaders,
  getEdgeFunctionUrl,
  useEdgeFunctions,
} from '@/frontend/api/backend-config';

export async function requestPortraitSummary(body: PortraitRequestBody) {
  const url = useEdgeFunctions() ? getEdgeFunctionUrl('profile-portrait') : '/api/profile-portrait';
  const headers = useEdgeFunctions()
    ? getEdgeFunctionHeaders()
    : {
        'Content-Type': 'application/json',
      };

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const payload = useEdgeFunctions()
    ? response.ok
      ? ({ summary: await response.text() } as PortraitSuccessResponse | PortraitErrorResponse)
      : ((await response.json()) as PortraitSuccessResponse | PortraitErrorResponse)
    : ((await response.json()) as PortraitSuccessResponse | PortraitErrorResponse);

  return {
    ok: response.ok,
    status: response.status,
    payload,
  };
}
