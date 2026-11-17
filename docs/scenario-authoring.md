# 이벤트 JSON 작성

`data/scenarios.json`은 2번 PDF의 계약을 실제 실행하는 콘텐츠다. `schemaVersion: 1`과 ID를 키로 하는 `events` 객체를 사용한다. 기존 월별 스토리/과제/달력 파일은 호환하며, 같은 ID를 여러 파일에 정의하면 `npm run check`가 실패한다. 삭제·이동할 때 기존 정의를 함께 정리해야 한다.

## 공통 필드

| 필드                        | 의미                                                                                      |
| --------------------------- | ----------------------------------------------------------------------------------------- |
| `id`, `name`, `description` | 고유 ID, 표시 이름과 설명. 키와 id는 같아야 함                                            |
| `scope`                     | `common`은 전체, `course`는 해당 `courseId` 수강생만                                      |
| `kind`                      | `task`, `exam`, `choice`, `natural`                                                       |
| `enabled`                   | false이면 새로 발생하지 않음                                                              |
| `trigger`                   | `type: scheduled`, `term`, `week`, `day`, `phase`, `probability`, `maxOccurrencesPerTerm` |
| `trigger.when`              | 능력치/돈/전공/수강/이전 선택/과제 상태/표식 조건. `all`, `any`, `not` 조합 지원          |
| `repeatEvery`, `untilWeek`  | trigger 내부 반복 간격과 마지막 주. 최대 횟수까지만 발생 기회 생성                        |

학기는 `semester_1` 1~16주, `summer` 1~8주(전체 17~24주), `semester_2` 1~16주(전체 25~40주), `year` 전체 0~40주다. 요일은 월=0~일=6. phase는 `start`/`end`이며 해당 날짜의 첫 활동 전/연장 자습 후다. 확률은 0~1. 시점마다 조건·확률을 한 번 평가하므로 저장 후 다시 열어 재추첨하지 않는다. 반복 최대 횟수는 성공 횟수가 아닌 발생 기회 상한이다.

예: `{"all":[{"stat":"reputation","min":60},{"choice":"winter_study","equals":"friends"}]}`. 조건 문법은 `src/domain/conditions.js`에서 검사하며 문자열 코드, eval, 임의 수식은 실행하지 않는다.

## 종류별 실행

**과제**는 `deadline: {week, day, phase: "end"}`, `work`, `resolution`, `grade`를 가진다. `work.targetProgress`가 목표, `work.perAction`의 `timeSlots`, `progress`, `cost.money`, `effects`가 투입 시간·진척·비용이다. 2칸에 진척 1/비용 100이면 매 칸 0.5 진척/50 비용을 적용한다. 작업 비용이 없으면 진척이 늘지 않는다. 스케줄에서는 호실 휴식으로 대체한다. 명시한 작업 효과는 일반 task 활동 효과와 이중 부과하지 않는다. 주 전체의 학습량/계절 부담은 별도로 적용된다.

**시험**은 당시 능력치와 저장된 난수 시드로 즉시 채점한다. **자연발생**은 `effects.onTrigger`, 또는 순서 있는 `outcomes: [{when, description, effects}]` 중 처음 맞는 분기를 적용한다. 마지막 분기의 when을 생략하면 기본 결과다. **선택**은 `options`의 id/label/detail/cost/effect/when/chanceResult로 비용과 성공/실패 효과를 처리한다. 조건 불충족·잔액 부족은 선택할 수 없다.

효과 배열은 `{"type":"stat_delta","stat":"hp","amount":-2}` 형태다. 선택의 effect/success/failure는 기존 스토리와 호환되는 `{"stress":-3}` 형식을 쓴다. 모든 효과는 공통 상하한/양수 증가 감쇠 규칙을 통과하므로 +2 보상이 실제로 +2보다 작을 수 있다.

결과 규칙은 `report_score`, `ability_score`만 허용한다. params: `ability`, `base`, `abilityWeight`, `randomness`, `maxScore`, `expireScore`. 완료 점수는 `base + 능력치×가중치 ± randomness`를 0~maxScore로 제한하고 반올림한다. 미완료 과제는 `진척/목표 × expireScore`. 완료/기한 초과 효과는 `effects.onComplete`/`onExpire`로 나눈다.

`grade.assessmentId`는 평가 식별자, `grade.kind`는 해당 과목 assessments의 평가 종류다. 결과는 개인 저장의 `assessments`에 한 번만 추가되어 과목 학점 계산에 반영된다.

## 실제 예시와 저장 분리

현재 파일에는 물리 보고서(1학기 3주 시작, 5주 일요일 마감, 3칸), 비용/성공확률이 있는 배달 선택, 반복 호실 점검, 물리 쪽지시험이 연결되어 있다. 보고서 ID는 기존 저장 호환을 위해 `project-2-general_physics`를 유지한다. 수강 과목 JSON은 id/name/description/credits/assessments/prerequisites/graduationRequirement를 갖는다. 구체화되지 않은 선이수·졸업요건은 비어 있으며 현재 수강 제한으로 실행하지 않는다.

콘텐츠 JSON에 개인 진척을 쓰지 않는다. 발생 영수증은 `state.flags.eventDeliveries`, 과제 사본/진척은 `state.tasks`, 선택은 `state.choices`, 시험은 `state.assessments`, 수강은 `state.courses`에 저장한다. 로컬은 브라우저 저장/백업 JSON, 인증 모드는 서버 저장이다. 진행 중인 과제는 생성 시점의 정의를 복사하므로 콘텐츠 수정으로 사용자의 기존 마감/진척이 바뀌지 않는다.

수정 후 `npm run check`, `npm test`, `npm run balance:simulate`를 실행한다. 콘텐츠 버전은 `src/domain/version.js`에서 갱신하고 기존 저장의 의미가 바뀌면 마이그레이션과 테스트도 추가한다. 핵심 계약 검증은 `tests/domain/scenarios.test.js`에 있다.
