# 날짜별 학사 일정 작성

달력 화면은 `CalendarPanel.jsx`, 표시 항목의 공급자는 `src/domain/calendar-entries.js`, 날짜 계산은 `calendar-date.js`, 작성 데이터는 `data/calendar.json`입니다. 실제 월간 날짜·요일과 게임의 월/주차를 구분합니다.

## 날짜에 표시만 추가하기

1. GitHub Desktop에서 현재 브랜치가 `codex/sasago3-web-game`인지 확인합니다. 새 브랜치를 만들지 않습니다.
2. 코드 편집기에서 `data/calendar.json`을 엽니다. 맨 위 calendar_settings는 그대로 둡니다.
3. 마지막 항목 뒤에 쉼표를 넣고 아래처럼 새 키를 추가합니다. sample_school_note 대신 다른 사람이 쓰지 않은 영문 ID를 사용합니다. 기존 ID를 재사용하지 않습니다.

```json
"sample_school_note": {
  "kind": "entry",
  "name": "행사 안내",
  "type": "note",
  "date": "2026-04-14",
  "description": "이 날짜를 선택하면 보이는 내용"
}
```

4. 파일을 저장하고 프로젝트 터미널에서 `npm run check`를 실행합니다. 문법·날짜·참조 오류가 있으면 해당 ID를 수정합니다.
5. `npm run dev:secure`로 게임을 열고 왼쪽 아래 달력 → 해당 월 → 해당 날짜를 눌러 확인합니다. 기존 서버가 실행 중이면 다시 실행하지 않습니다.
6. GitHub Desktop의 Changes에서 이 항목만 의도대로 바뀌었는지 확인합니다. 공개 게임 반영은 별도 보안 빌드·배포가 필요합니다.

date 대신 `"week": 5, "day": 1`을 쓸 수 있습니다. week는 겨울방학 0, 3월 1~4, 4월 5~8, …, 12월 37~40입니다. day는 월0·화1·수2·목3·금4·토5·일6입니다. date와 week/day를 동시에 쓰면 오류입니다.

type은 event·deadline·class·note 중 하나입니다. course를 지정하면 해당 과목 수강자만 표시합니다. enabled:false 또는 deleted:true면 표시와 연결을 해제하며 이전 키는 보존할 수 있습니다. 날짜만 추가한 항목은 게임 결과·시간표를 바꾸지 않습니다.

## 기존 일정의 실제 발생 날짜 지정

source를 지정하면 같은 일정을 중복 추가하지 않고 기존 항목을 대체합니다.

```json
"academy_notice_date": {
  "kind": "entry",
  "name": "학원 모집",
  "type": "event",
  "source": "event:academy_offer",
  "week": 1,
  "day": 2
}
```

위 예시는 3월 1주 수요일에 모집을 알립니다. 화면만 바꾸는 장식이 아니라 실제 이벤트 전달도 그날로 옮깁니다. 응답 가능 주 수는 기존 모집 기간을 유지합니다.

- `event:이벤트ID`: 공지·과제 시작의 발생일입니다. ID는 catalog의 events를 확인합니다.
- `deadline:과제ID`: 해당 과제의 마감입니다. 예: deadline:thesis, deadline:clean-4. 과제 발생 시 설정을 저장하므로 이미 발생한 과제의 마감을 소급 변경하는 관리 기능은 아닙니다.
- `exam:종류:원래주`: 예: exam:midterm:7. 표시와 실제 평가일을 함께 변경합니다.

등록 가능한 source 전체는 calendar-entries.js의 CALENDAR_SOURCE_IDS에 있습니다. 모르는 ID·같은 source의 중복 활성 연결·활동 주 밖의 source 날짜·과제 시작 이전 마감은 검사에서 거절합니다. 별도 source가 없는 단순 메모는 활동 주 밖의 날짜에도 표시할 수 있습니다.

원본에 요일이 없는 학사 일정은 ‘요일 미정’의 주간 항목으로 표시합니다. 시험은 날짜가 지정되기 전에는 기존 주말 평가 규칙을 유지합니다. 실제 학교의 시험 날짜를 임의로 만들어 넣지 않습니다.

## 게임 주와 공급자 확장

calendar_settings.weeks는 41개 활동 주의 월요일을 정합니다. 현재는 겨울방학 한 주와 3~12월 각 네 주입니다. 5번째 주 등은 달력에 보이지만 별도의 플레이 주가 아닙니다. 52주 전체로 바꾸려면 원본 이벤트·마감·입시 주차까지 함께 변경하고 새 콘텐츠 버전·저장 변환을 설계해야 합니다. 날짜 앵커만 바꿔 해마다 다른 게임으로 만들지 않습니다.

자동 표시를 추가할 때 CALENDAR_PROVIDERS에 독립 공급자를 등록합니다. 공급자는 상태를 읽고 안정된 id·name·type과 date 또는 start/end를 반환합니다. UI에서 스탯·이벤트를 생성하지 않습니다. 실제 효과가 있는 새 일정은 도메인의 일별 전달 경로도 연결하고, 표시 날짜와 실제 발생 날짜가 같다는 검사를 추가합니다. 날짜는 UTC의 날짜 단위로 계산해 사용자의 시간대에 따라 요일이 달라지지 않습니다. 배경 낮밤은 별도로 한국 실제 시간을 사용합니다.
