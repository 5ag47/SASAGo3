// Keep academic subskills internal while preserving the readable action and outcome.
export function publicText(text = '') {
  return text
    .replace(/(?:서술력|구술력|매력)\s*[+\-−▲▼]?\s*\d+(?:\.\d+)?/g, '활동 경험')
    .replaceAll('품질', '완성도');
}
