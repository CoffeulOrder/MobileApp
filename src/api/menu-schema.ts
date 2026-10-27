/**
 * 서버 응답/로컬 캐시의 메뉴 JSON 검증.
 * 잘못된 데이터가 정상 캐시를 덮어쓰지 않도록, 저장 전에 반드시 통과시킨다.
 */
import type { Cafe, MenuItem, MenuPayload } from '@/constants/coffeul';

export class SchemaError extends Error {
  constructor(where: string) {
    super(`잘못된 메뉴 데이터: ${where}`);
    this.name = 'SchemaError';
  }
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const optStr = (v: unknown) => (v === undefined || v === null ? undefined : isStr(v) ? v : null);

function parseMenu(raw: unknown, at: string): MenuItem {
  if (!isObj(raw)) throw new SchemaError(at);
  const { id, name, desc, price, category } = raw;
  if (!isStr(id) || !isStr(name) || !isStr(category)) throw new SchemaError(`${at}.id/name/category`);
  if (typeof price !== 'number' || !Number.isFinite(price) || price < 0) {
    throw new SchemaError(`${at}.price`);
  }
  const thumbnailUrl = optStr(raw.thumbnailUrl);
  const imageUrl = optStr(raw.imageUrl);
  if (thumbnailUrl === null || imageUrl === null) throw new SchemaError(`${at}.image`);
  return {
    id,
    name,
    desc: typeof desc === 'string' ? desc : '',
    price,
    category,
    thumbnailUrl,
    imageUrl,
  };
}

function parseCafe(raw: unknown, at: string): Cafe {
  if (!isObj(raw)) throw new SchemaError(at);
  const { id, name, code, menus } = raw;
  if (!isStr(id) || !isStr(name) || !Array.isArray(menus)) throw new SchemaError(`${at}.id/name/menus`);
  return {
    id,
    name,
    code: isStr(code) ? code : id.slice(0, 2).toUpperCase(),
    menus: menus.map((m, i) => parseMenu(m, `${at}.menus[${i}]`)),
  };
}

export function parseMenuPayload(raw: unknown): MenuPayload {
  if (!isObj(raw)) throw new SchemaError('root');
  const { version, cafes } = raw;
  if (typeof version !== 'number' || !Number.isInteger(version)) throw new SchemaError('version');
  if (!Array.isArray(cafes)) throw new SchemaError('cafes');
  return { version, cafes: cafes.map((c, i) => parseCafe(c, `cafes[${i}]`)) };
}

export function parseVersion(raw: unknown): number {
  if (!isObj(raw) || typeof raw.version !== 'number' || !Number.isInteger(raw.version)) {
    throw new SchemaError('version');
  }
  return raw.version;
}

export function parseSoldOutIds(raw: unknown): string[] {
  if (!isObj(raw) || !Array.isArray(raw.soldOutMenuIds)) throw new SchemaError('soldOutMenuIds');
  return raw.soldOutMenuIds.filter(isStr);
}
