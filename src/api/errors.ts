/** API 오류 타입. client.ts 와 mock-server.ts 가 공유한다 (순환 import 방지용으로 분리). */

/** 연결 실패/타임아웃 — 캐시를 계속 써도 되는 상황 */
export class NetworkError extends Error {
  constructor(message = '네트워크에 연결할 수 없어요.') {
    super(message);
    this.name = 'NetworkError';
  }
}

/** 서버가 응답했지만 2xx 가 아님 */
export class ApiError extends Error {
  readonly status: number;
  /** 서버가 body 로 내려주는 에러 코드 (예: MENU_CHANGED) */
  readonly code?: string;
  readonly body?: unknown;

  constructor(status: number, code?: string, body?: unknown) {
    super(code ? `${status} ${code}` : `HTTP ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.body = body;
  }
}
