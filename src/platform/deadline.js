export function withDeadline(promise, milliseconds, code = 'INITIALIZATION_TIMEOUT') {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(Object.assign(new Error('초기화 시간을 초과했습니다.'), { code })),
      milliseconds,
    );
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
