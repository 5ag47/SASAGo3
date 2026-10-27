# 팀으로 수정하기

현재 작업 브랜치는 `codex/sasago3-web-game`입니다. 이 작업에서는 브랜치를 한 번만 생성했습니다. main에서 개발하지 않습니다. 현재 폴더에 이미 있던 미커밋 작업과 Godot 폴더는 보존했습니다.

## 작업 전

1. Github Desktop에서 저장소와 현재 브랜치를 확인합니다.
2. **Changes**에서 다른 사람이나 이전 작업의 미커밋 변경이 있는지 확인합니다. 전체 되돌리기·강제 초기화로 없애지 않습니다.
3. 팀 채팅이나 이슈에 작업할 파일을 적고, 같은 파일을 함께 수정할 필요가 있는지 먼저 확인합니다.
4. 동기화 전에는 본인 변경을 검토해 커밋하거나 별도 사본으로 보관합니다. 충돌이 생기면 ‘현재 버전 전체 선택’으로 덮어쓰지 않습니다.

## 권장 분담

| 작업               | 주로 수정할 파일                             | 함께 바꾸지 않아도 되는 부분 |
| ------------------ | -------------------------------------------- | ---------------------------- |
| 캐릭터·기숙사 표현 | Scene.jsx, 해당 CSS 구역, assets.js          | 시험·입시 공식               |
| 자습 신청 UI       | Planner.jsx, ActivityPicker.jsx              | 서버 인증                    |
| 과제·이벤트 추가   | data/events.json, 필요한 경우 과목 JSON      | 메인 화면 조립               |
| 학점·입시 조정     | grades.js, 관련 domain 테스트                | 캐릭터 이미지                |
| 저장·로그인        | src/platform, server                         | 콘텐츠 문구                  |
| 설정·매점          | SettingsPanel.jsx, ShopPanel.jsx, items.json | 41주 일정 계산               |

`game.css`는 공유 파일이므로 동시에 스타일을 바꾸면 담당 구역을 합의합니다. 색상·간격 공통값을 바꾸는 작업은 별도 변경으로 검토합니다. 모듈 분리가 모든 Git 충돌을 없애지는 않습니다.

## 이벤트 추가 예

`data/events.json`에 새 키 하나를 추가합니다. 기존 이벤트 키는 변경하거나 재사용하지 않습니다.

```json
"my_new_report": {
  "week": 3,
  "kind": "task",
  "course": "general_physics",
  "name": "추가 실험 보고서",
  "description": "실험 결과를 두 칸 동안 정리하세요.",
  "target": 2,
  "deadline": 5,
  "reward": { "science": 3, "reputation": 1 },
  "penalty": { "reputation": -2 }
}
```

## 작업 후 확인

```sh
npm run check
npm test
npm run build
npm audit --audit-level=high
```

콘텐츠 검사에서 모르는 과목 ID, 잘못된 능력치, 평가 비율 합계, 이벤트 시점을 확인합니다. 자동 테스트는 전공별 완주와 서버의 잘못된 요청·동시 요청도 확인합니다. GitHub Actions가 PR과 대상 브랜치의 push에서 같은 검사를 실행합니다. GitHub 저장소 설정에서 해당 검사를 필수 상태 검사로 지정하는 작업은 저장소 관리자가 해야 합니다.

## 새 패널의 담당 범위

- 성적·달력: `CoursesPanel.jsx`, `CalendarPanel.jsx`
- 스터디·진학실·능력치: `GroupPanel.jsx`, `AdmissionsPanel.jsx`, `StatsPanel.jsx`
- 튜토리얼: `TutorialPanel.jsx`, `tutorial.js`, `tutorial.css`
- 주간 검토: `WeekReviewPanel.jsx`, `planning.css`

이 컴퓨터의 저장소에는 `core.hooksPath=.githooks`를 적용했습니다. pre-commit은 main/master 직접 커밋, 로컬 DB·비밀 파일 및 명확한 개인 키 형식의 실수로 인한 커밋을 막고 콘텐츠·의존성 경계를 검사합니다. 새로 clone한 팀원은 저장소 폴더에서 `git config core.hooksPath .githooks`를 한 번 실행합니다. Git 훅은 우회 가능하므로 접근 권한이나 서버 보안의 대체물이 아닙니다.

## 문제가 생겼을 때

날짜별 학사는 [달력 작성](calendar-authoring.md), 과제 비용·회차·미니게임은 [모듈 작성](task-authoring.md), 주간 실행과 입력 묶음의 경계는 [ADR-0003](adr/0003-chronological-week.md)를 따릅니다. 같은 과제를 여러 그룹에서 재정의하지 않고 안정된 ID와 개별/그룹 우선순위를 유지합니다.

1. 화면에 나온 문구와 발생 주차를 기록합니다.
2. 설정 → **진단 보고서 다운로드**를 누릅니다.
3. 서버 모드라면 응답의 `trace` 또는 `X-Request-ID`로 서버 로그를 찾습니다. 전체 인증 요청 헤더를 복사하지 않습니다.
4. ‘예상 동작 / 실제 동작 / 재현 순서 / 오류 코드 / 브랜치·버전’을 이슈에 남깁니다.
5. `REVISION_CONFLICT`는 다른 창이 먼저 저장한 상황입니다. 최신 저장을 읽고 다시 행동합니다. 다른 사람의 기록을 수동으로 덮어쓰지 않습니다.

진단 보고서는 다운로드만 하며 자동 업로드되지 않습니다. 공유하기 전에 보고서 내용을 직접 확인합니다.
