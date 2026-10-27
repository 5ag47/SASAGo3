export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
export const securityHeaders = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
};
export function contentSecurityPolicy() {
  return "default-src 'self'; script-src 'self' https://apis.google.com https://www.gstatic.com; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://*.googleapis.com https://*.firebaseapp.com https://accounts.google.com; frame-src https://*.firebaseapp.com https://accounts.google.com https://apis.google.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests";
}
export async function readJson(request, maxBytes = 8192) {
  if (!(request.headers.get('content-type') ?? '').startsWith('application/json'))
    throw new ApiError(415, 'JSON_REQUIRED', 'JSON 요청만 사용할 수 있어요.');
  if (Number(request.headers.get('content-length') ?? 0) > maxBytes)
    throw new ApiError(413, 'BODY_TOO_LARGE', '요청 크기를 초과했어요.');
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, 'BODY_REQUIRED', '요청 내용이 비어 있어요.');
  const chunks = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > maxBytes) {
      await reader.cancel();
      throw new ApiError(413, 'BODY_TOO_LARGE', '요청 크기를 초과했어요.');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new ApiError(400, 'JSON_INVALID', 'JSON 형식이 올바르지 않아요.');
  }
}
const fields = {
  create: ['type', 'profile'],
  plan: ['type', 'index', 'activity', 'target'],
  task_game: ['type', 'task', 'action'],
  story: ['type', 'chapter', 'action'],
  copy_day: ['type', 'sourceDay', 'days'],
  preset: ['type', 'preset'],
  advance: ['type'],
  choose: ['type', 'event', 'option', 'answers'],
  buy: ['type', 'item'],
  ending: ['type', 'ending'],
  elective: ['type', 'course', 'term', 'enabled'],
};
const plain = (value) => value && typeof value === 'object' && !Array.isArray(value);
export function validateCommand(command) {
  if (
    !plain(command) ||
    typeof command.type !== 'string' ||
    !Object.hasOwn(fields, command.type) ||
    Object.keys(command).some((k) => !fields[command.type].includes(k))
  )
    throw new ApiError(400, 'COMMAND_SHAPE', '허용되지 않은 요청 필드가 있어요.');
  if (
    command.type === 'create' &&
    (!plain(command.profile) ||
      !['name', 'character', 'role', 'major'].every((key) => Object.hasOwn(command.profile, key)) ||
      Object.keys(command.profile).some(
        (k) => !['name', 'character', 'role', 'major', 'electives'].includes(k),
      ))
  )
    throw new ApiError(400, 'PROFILE_SHAPE', '프로필 형식이 올바르지 않아요.');
  return command;
}
export function validateEnvelope(body, reset = false) {
  if (
    !plain(body) ||
    !Number.isInteger(body.expectedRevision) ||
    body.expectedRevision < 0 ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      body.idempotencyKey,
    )
  )
    throw new ApiError(400, 'ENVELOPE_INVALID', '요청 버전·중복 방지 키가 올바르지 않아요.');
  const allowed = reset
    ? ['expectedRevision', 'idempotencyKey', 'confirmation']
    : ['expectedRevision', 'idempotencyKey', 'command'];
  if (Object.keys(body).some((k) => !allowed.includes(k)))
    throw new ApiError(400, 'ENVELOPE_FIELDS', '기록·점수를 직접 제출할 수 없어요.');
  if (reset && body.confirmation !== '새로 시작')
    throw new ApiError(400, 'RESET_CONFIRMATION', '초기화 확인 문구가 필요해요.');
  if (!reset) validateCommand(body.command);
}
const encoder = new TextEncoder();
export async function digest(text) {
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(text));
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
async function key(secret) {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}
export async function hmac(secret, value) {
  const result = await crypto.subtle.sign('HMAC', await key(secret), encoder.encode(value));
  return [...new Uint8Array(result)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
export async function csrfToken(secret, player, now) {
  return hmac(secret, `csrf:${player}:${Math.floor(now / 1800000)}`);
}
export async function verifyCsrf(secret, player, token, now) {
  if (!/^[0-9a-f]{64}$/.test(token ?? '')) return false;
  const bytes = Uint8Array.from(token.match(/../g), (s) => parseInt(s, 16));
  for (const window of [0, 1])
    if (
      await crypto.subtle.verify(
        'HMAC',
        await key(secret),
        bytes,
        encoder.encode(`csrf:${player}:${Math.floor(now / 1800000) - window}`),
      )
    )
      return true;
  return false;
}
