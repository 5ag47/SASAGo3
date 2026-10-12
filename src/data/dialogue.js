export function dialogueLines(stats) {
  if (stats.stress >= 70) return ['쉬고 싶다.', '머리가 안 돌아간다.'];
  if (stats.hp < 30) return ['몸이 안 좋다.', '잠을 좀 자야겠다.'];
  return ['자습 몇 시까지지?', '수학 문제 하나만 더 풀자.', '매점 가야겠다.'];
}

export function conditionNote(stats) {
  if (stats.hp < 30) return '건강이 낮아요';
  if (stats.stress >= 70) return '스트레스가 높아요';
  if (stats.focus < 30) return '집중력이 낮아요';
  return '컨디션 양호';
}
