import { timingSafeEqual } from 'node:crypto';

export function isTelegramServiceRequest(request: Request): boolean {
  const expected = process.env.TELEGRAM_INTEGRATION_SECRET;
  if (!expected || Buffer.byteLength(expected, 'utf8') < 32) return false;
  const authorization = request.headers.get('authorization');
  const actual = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!actual) return false;
  const left = Buffer.from(expected);
  const right = Buffer.from(actual);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function telegramAssessmentMeteringKey(
  telegramUserId: string,
  updateId: number
): Promise<string> {
  const [userHash, updateHash] = await Promise.all([
    sha256Hex(telegramUserId),
    sha256Hex(String(updateId)),
  ]);
  return `telegram:${userHash.slice(0, 32)}:${updateHash}`;
}

export function telegramUserIdSchema(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9]{1,24}$/.test(value);
}

export async function readTelegramJson(request: Request): Promise<Record<string, unknown> | null> {
  const length = Number(request.headers.get('content-length'));
  if (Number.isFinite(length) && length > 8_192) return null;
  let text: string;
  try {
    text = await request.text();
  } catch {
    return null;
  }
  if (new TextEncoder().encode(text).byteLength > 8_192) return null;
  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch {
    return null;
  }
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
