# 게임 규칙 확장 안내

작업 브랜치는 `codex/sasago3-web-game` 하나입니다. 기존 미커밋 변경을 보존하고 작업 범위를 먼저 확인합니다. 플레이어 저장·비밀값을 `data/`에 넣지 않습니다.

## 기능을 추가할 위치

| 바꾸는 것                    | 주로 수정할 위치                              | 함께 확인할 계약                               |
| ---------------------------- | --------------------------------------------- | ---------------------------------------------- |
| 과제 내용·그룹·미니게임 지정 | `data/assignments.json`, 로컬 편집기          | [과제 작성](task-authoring.md)                 |
| 미니게임의 실제 규칙·화면    | `domain/task-modules`, `year-game/task-games` | 버전 ID, 공통 비용·난수·결과 계약              |
| 날짜별 표시·기존 발생일      | `data/calendar.json`, 로컬 편집기             | [달력 작성](calendar-authoring.md)             |
| 행동 명령                    | `domain/commands/해당기능.js`                 | 허용 필드·apply, 서버 검증, 사후 불변조건      |
| 저장 필드                    | `domain/state/{base,migrate,validate}.js`     | 이전 저장 보존, 반복 변환, 서버 응답·차이 응답 |
| 게임 메뉴·패널               | `year-game/panels/`와 기능 컴포넌트           | navigation의 제목·너비, 공통 테마              |
| 성장·회복·시험               | `data/balance.json`                           | [밸런스](balance.md), 전략 비교                |
| 생기부·입시·지원 묶음        | `data/admissions.json`                        | `admission-validation.js`, 제출 전후 구분      |

명령을 추가할 때 기존 기능 파일의 정의에 `{ fields: ['type', ...], apply(state, command) {...} }`를 등록합니다. 새 기능 그룹이면 `commands/index.js`에 한 번 연결합니다. 서버의 별도 필드 목록을 만들지 않습니다. 사용자 문구가 필요한 규칙 위반은 `requireRule`의 안정된 오류 코드를 사용합니다. 예외는 `commandType`과 `phase`를 포함한 서버 로그로 추적합니다.

새 저장 필드는 초기값과 검사만 넣고 끝내지 않습니다. 이름 있는 SAVE_MIGRATIONS 단계로 없는 값만 채우고, 이전 상태 원본과 확정된 성적·과제 결과를 보존하는 검사를 추가합니다. UI에서 필요한 필드면 `server/game-updates.js`와 `platform/server-updates.js`도 함께 확인합니다. CONTENT_VERSION은 `domain/version.js`에서 올립니다. 사용자에게 캐릭터를 변경하는 명령은 추가하지 않습니다.

## 조건부 일정과 선택지

기존 이벤트·과제의 `when`과 선택지의 `when`에 조건을 넣을 수 있습니다. 과제를 새로 만드는 예시가 아니라 기존 항목에 붙일 설정 예시입니다.

```json
{
  "when": {
    "any": [
      { "task": "thesis", "status": "completed" },
      { "choice": "may_union_study", "equals": "join" }
    ]
  },
  "chance": 0.5
}
```

`all`·`any`·`not`, `stat`+min/max, `money: true`+min/max, `major`, `course`, `task`+status, `flag`/`choice`+equals를 지원합니다. 상세 구조는 `conditions.js`를 따릅니다. 깊이 5·노드 64 제한이며 eval·임의 스크립트·프로토타입 키를 허용하지 않습니다. 과목·능력치 참조와 이벤트의 전공 참조는 카탈로그로 검사합니다. 동적으로 생기는 과제 ID·선택/표식 ID는 문법을 검사하므로 실제 생성 경로와 함께 검증해야 합니다. 없는 기록은 조건을 만족하지 않습니다.

일정의 조건과 확률은 지정된 발생일에 한 번 확인합니다. 조건을 나중에 만족했다고 같은 일정이 다시 발생하거나 실패한 추첨을 매 클릭 재시도하지 않습니다. 선택지 조건은 선택할 때 다시 확인하고, 화면에서 감춰도 서버가 허용하는 방식으로 만들지 않습니다. 이미 선택한 이벤트는 날짜를 뒤로 옮겨도 다시 응답하도록 요청하지 않습니다.

## 간접적인 차이를 조정할 때

`admissions.json`의 `essay_support.burden`과 `recommendation_support`가 추가 비용을 설정합니다. 자소서 품질 비중·관계의 작업 속도 보조도 같은 파일에 있습니다. `school_record.generalCourseCredit`는 형식 미지정/일반 교과 과제의 탐구 기여이고, 형식 지정 과제는 1, 논문은 `thesisCredit`를 사용합니다. 기록이 없는 플레이와 충분히 쌓은 플레이를 비교하되, 인접한 기록에서도 비용이 급격히 뛰지 않는 검사를 유지합니다.

추천서 필요 횟수 `sessions`는 새 준비를 시작할 때 `recommendation.target`에 저장합니다. 콘텐츠를 고쳤다고 진행 중인 준비를 갑자기 늘리지 않습니다. 제출된 `documents`도 새 설정으로 재계산하지 않습니다. 기존 결과까지 바꾸려면 별도 저장 변환 정책과 사용자 영향 검토가 필요합니다.

개발 설명을 게임 화면에 상시 붙이지 않습니다. 준비 단계·실제 활동·소비한 능력치를 보여 주고, 기록이나 사람에 대한 평가·비난으로 원인을 설명하지 않습니다.

## 검사와 배포

프로젝트 터미널에서 `npm run verify`를 실행하면 콘텐츠·의존성·ESLint, 전체 테스트, 서버 전용 빌드, 로컬 편집기 빌드, 의존성 취약점 검사를 차례로 실행합니다. 실패 시 중단하며 자동 배포하지 않습니다. 규칙을 바꿨다면 `npm run balance:simulate`로 비교하고 UI는 실제 화면에서도 확인합니다. 공개 갱신은 [배포 절차](deployment.md)의 백업·배포·검증을 따릅니다.
