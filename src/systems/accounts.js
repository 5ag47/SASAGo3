const ACCOUNT_KEY = 'sasago3-accounts-v1';
export const SESSION_KEY = 'sasago3-session-v1';
export const accountSaveKey = id => `sasago3-player-${id}`;
function accounts(storage) {
  const value = JSON.parse(storage.getItem(ACCOUNT_KEY) || '[]');
  if (!Array.isArray(value)) throw new Error('계정 정보를 읽을 수 없어요.');
  return value;
}
async function digest(password, salt) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({
    name: 'PBKDF2',
    salt: new TextEncoder().encode(salt),
    iterations: 210000,
    hash: 'SHA-256'
  }, key, 256);
  return Array.from(new Uint8Array(bits), byte => byte.toString(16).padStart(2, '0')).join('');
}
export async function authenticate(mode, username, password, storage = localStorage) {
  if (!globalThis.crypto?.subtle) throw new Error('계정 기능은 localhost 또는 HTTPS 주소에서 사용할 수 있어요.');
  const name = username.trim().toLowerCase();
  if (!/^[a-z0-9_-]{3,24}$/.test(name)) throw new Error('아이디는 영문, 숫자, _, -를 사용해 3~24자로 입력해주세요.');
  if (password.length < 8 || password.length > 128) throw new Error('비밀번호는 8~128자로 입력해주세요.');
  const existing = accounts(storage).find(account => account.username === name);
  if (mode === 'signup') {
    if (existing) throw new Error('이미 사용 중인 아이디예요. 로그인해주세요.');
    const salt = crypto.randomUUID();
    const account = {
      id: crypto.randomUUID(),
      username: name,
      salt,
      hash: await digest(password, salt)
    };
    const latest = accounts(storage);
    if (latest.some(item => item.username === name)) throw new Error('이미 사용 중인 아이디예요.');
    storage.setItem(ACCOUNT_KEY, JSON.stringify([...latest, account]));
    return {
      id: account.id,
      username: name
    };
  }
  if (!existing || (await digest(password, existing.salt)) !== existing.hash) throw new Error('아이디 또는 비밀번호가 맞지 않아요.');
  return {
    id: existing.id,
    username: name
  };
}
export function restoreSession(storage = localStorage, session = sessionStorage) {
  try {
    const id = session.getItem(SESSION_KEY);
    const account = accounts(storage).find(item => item.id === id);
    return account ? {
      id: account.id,
      username: account.username
    } : null;
  } catch {
    return null;
  }
}
