export function dialogueLines(stats) {
  if (stats.hp < 30) return ['침대 보고 싶다…', '오늘은 정말 일찍 자야겠어.', '내 체력도 충전이 필요해.'];
  if (stats.stress >= 70) return ['머리가 안 돌아간다… 잠깐만.', '산책이라도 하고 올까?', '아무 생각 없이 쉬고 싶다.'];
  if (stats.focus < 30) return ['문장을 세 번 읽었는데 기억이 안 나.', '따뜻한 차 한 잔이면 좀 나을까?'];
  if (stats.reputation >= 70) return ['같이 공부하자는 연락이 왔네!', '친구들 덕분에 오늘도 버틴다.'];
  if (stats.math >= 80) return ['이 문제, 다른 풀이도 있을 것 같은데?', '수학이 조금씩 재밌어지고 있어.'];
  return ['자습 몇 시까지지?', '수학 문제 하나만 더 풀자.', '매점 가야겠다.', '오늘 하루도 꽤 괜찮았어.'];
}
export function conditionNote(stats) {
  if (stats.hp < 30) return '신체 회복이 필요해요';
  if (stats.stress >= 70) return '스트레스가 높아요';
  if (stats.focus < 30) return '멘탈 회복이 필요해요';
  return '컨디션 양호';
}
