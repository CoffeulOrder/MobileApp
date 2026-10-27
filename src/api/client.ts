/**
 * Minimal fetch wrapper for the ORMO backend.
 *
 * - `EXPO_PUBLIC_API_URL` 이 설정돼 있으면 실제 서버로 요청한다. (예: https://api.example.com)
 * - 설정돼 있지 않으면 앱 안의 목업 서버(`mock-server.ts`)가 응답한다. 백엔드가 없을 때의 개발용.
 *
 * 오류는 두 종류로 구분한다:
 *   NetworkError — 연결 실패/타임아웃 (캐시를 계속 써도 되는 상황)
 *   ApiError     — 서버가 응답했지만 2xx 가 아님 (status, code, body 보존)
 */
import { ApiError, NetworkError } from '@/api/errors';
import { handleMockRequest } from '@/api/mock-server';

export { ApiError, NetworkError };

const BASE_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '');
export const USING_MOCK_API = !BASE_URL;

const TIMEOUT_MS = 10_000;

type Method = 'GET' | 'POST';

export async function apiRequest<T>(method: Method, path: string, body?: unknown): Promise<T> {
  if (USING_MOCK_API) {
    return handleMockRequest<T>(method, path, body);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    throw new NetworkError();
  } finally {
    clearTimeout(timer);
  }

  const text = await res.text();
  let json: unknown;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      // 2xx 인데 JSON 이 아니면 잘못된 응답으로 취급 (캐시를 덮어쓰지 않도록 실패 처리)
      throw new ApiError(res.status, 'BAD_RESPONSE');
    }
  }

  if (!res.ok) {
    const code =
      json && typeof json === 'object' && 'code' in json && typeof json.code === 'string'
        ? json.code
        : undefined;
    throw new ApiError(res.status, code, json);
  }
  return json as T;
}
