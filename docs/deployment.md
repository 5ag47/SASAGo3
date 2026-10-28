# 공개 서버 배포와 운영

공개 주소는 **https://sasago3-play-20261027.sasago3.workers.dev/** 입니다. Workers + D1 `sasago3-game`을 배포했고 Google 로그인·저장·새로고침 복구를 사용자 브라우저로 확인했습니다. 기존 `sasago3-prod`, `sasago3-dev` DB는 변경하지 않았습니다. 로컬 개발의 `.local/game.sqlite`는 별도 기록이며 Firestore에는 게임 상태를 저장하지 않습니다.

최신 배포는 콘텐츠2026.10.28-3, Worker `3d9130bb-bc44-491f-895c-7dba42483eed`입니다. 학점·생기부 중심 평가, 상담과 다음날 추천서 검토, 완만한 준비 부담, 제출 자료 고정과 기능별 구조 개편을 같은 주소·DB에 반영했습니다. 전체206개 검사·보안/편집기 빌드·취약점0개를 확인했고 운영 플레이어1명·영수증58개를 암호화 백업해 메모리 복원 검증을 마쳤습니다. 공개 상태200·미인증401·외부 출처403과 원격 D1 임시 검사도 통과했습니다. 이번 버전의 실제 브라우저 로그인·조작·복구는 사용자 확인을 요청한 상태이며 API 검사로 대체하지 않습니다.

직전2026.10.28-2의 두 캐릭터 정상 표시와 2026.10.28-1의 진행·저장·입력 반응 정상은 사용자가 확인했습니다. 캐릭터는 생성 때만 정합니다. 새 기기·초보자·공개 장기 플레이는 별도 검증 범위입니다.

## 현재 환경 갱신

1. 현재 개발 브랜치를 확인합니다. main에서 개발하지 않습니다.
2. `npm ci`로 잠긴 의존성을 설치합니다. Wrangler는 4.131.0으로 고정합니다.
3. `npm run verify`를 실행해 콘텐츠·구조·ESLint·전체 테스트·보안/편집기 빌드·의존성을 확인합니다. 배포 전 `npm run cloud:backup`으로 기존 기록을 암호화 보존하고 복원 검증 결과를 확인합니다.
4. `npm run cloud:deploy`를 실행합니다. 이 명령은 서버 모드로 다시 빌드하고 설정된 같은 Worker를 갱신합니다.
5. 공개 화면에서 새로고침하고 로그인·일정 수정·새로고침 복구를 확인합니다. 오래된 탭은 갱신 안내를 받을 수 있습니다.
6. `npm run smoke:d1`은 고유한 임시 레코드만 사용해 원격 저장·오래된 버전 거절·중복 키 제약을 확인한 뒤 해당 레코드만 삭제합니다.

`npm run cloud:secret`은 원격 비밀값이 없을 때만 최초 등록하며 기존 키는 교체하지 않습니다. `npm run cloud:backup`은 암호화 백업과 메모리 DB 복구 검증을 수행합니다. 실제 운영 덮어쓰기는 하지 않습니다. [백업·복구 절차](backup-recovery.md)를 따릅니다. [Cloudflare D1 복구 문서](https://developers.cloudflare.com/d1/reference/time-travel/)

2026-10-27 확인한 무료 Workers 한도에는 요청당 CPU 10ms 제한이 있습니다. 무료 D1의 일일 한도를 넘으면 쿼리가 중단됩니다. 공개 환경의 긴 플레이·동시 이용·장애 복구 검증은 계속 필요하며 유료 업그레이드는 자동으로 하지 않습니다. [Workers 요금·제한](https://developers.cloudflare.com/workers/platform/pricing/), [D1 요금·제한](https://developers.cloudflare.com/d1/platform/pricing/)

## 준비된 선택지

- Node 서버: `server/node.mjs`, SQLite 저장. 지속 디스크가 있는 호스트와 HTTPS 프록시가 필요합니다.
- Cloudflare Workers + D1: 현재 배포 경로이며 `server/worker.js`, `server/d1-store.js`, `wrangler.toml`을 사용합니다.

## Cloudflare를 처음 설정하는 경우

아래는 새 계정·별도 환경을 처음 만들 때의 절차입니다. 현재 배포를 갱신할 때 기존 DB를 다시 만들거나 비밀값을 재생성하지 않습니다. 유료 업그레이드나 카드 등록은 자동 진행하지 않습니다.

1. <https://dash.cloudflare.com/>에서 본인 계정으로 로그인합니다. 계정이 없으면 본인이 가입합니다.
2. 저장소 폴더에서 터미널을 엽니다. `package.json`이 있는 위치입니다.
3. 공식 CLI로 `npx wrangler login`을 실행합니다. 브라우저에 뜨는 Cloudflare 권한 화면을 본인이 확인하고 허용합니다. API 토큰을 채팅에 보내지 않습니다.
4. `npx wrangler d1 create sasago3-game`을 실행합니다. 출력의 `database_id`를 `wrangler.toml`의 동일한 항목에 넣습니다. DB 바인딩 이름 `DB`는 바꾸지 않습니다.
5. `wrangler.toml`의 FIREBASE_PROJECT_ID와 FIREBASE_API_KEY에는 동일 Firebase 프로젝트의 공개 웹 설정을 넣습니다. PLAYER_ID_SECRET은 파일에 넣지 않습니다.
6. `npx wrangler d1 execute sasago3-game --remote --file server/schema.sql`로 빈 운영 DB의 테이블을 만듭니다. 이미 운영 중인 DB를 삭제·초기화하지 않습니다.
7. `npm run cloud:secret`으로 서버 식별 비밀값을 등록합니다. 원격에 이미 있으면 교체하지 않습니다. 최초 사본은 Git에서 제외된 `.local/cloudflare-player-secret`에 보관되며 화면에는 출력되지 않습니다.

8. `npm run build:secure`를 실행합니다. `.env.local`에 Firebase 공개 설정 네 개가 있어야 합니다.
9. Cloudflare 대시보드의 Workers 주소를 확인하고 `wrangler.toml`의 PUBLIC_ORIGIN을 실제 `https://...workers.dev` 주소로 바꿉니다. 경로·마지막 슬래시는 넣지 않습니다. 주소가 아직 정해지지 않았다면 초기 배포로 주소를 만든 뒤 실제 주소를 넣어 다시 배포합니다. 설정 전 API는 정상 플레이를 허용하지 않습니다.
10. `npx wrangler deploy`를 실행합니다. 출력된 HTTPS 주소를 확인합니다.
11. Firebase 콘솔 → Authentication → 설정 → 승인된 도메인 → 도메인 추가에서 배포 호스트만 입력합니다. 예: `sasago3-game.계정이름.workers.dev`. `https://`는 넣지 않습니다.
12. 배포 주소를 열고 Google 로그인 → 새 게임 → 한 주 진행 → 새로고침 → 로그아웃·재로그인 순서로 저장을 확인합니다.
13. 별도 Google 계정으로 접속해 다른 계정의 기록이 보이지 않는지 확인합니다.
14. DB 백업과 복구 절차를 실제 운영 전에 정합니다. 로컬 DB 파일이 D1에 자동 복제되지는 않습니다.

배포 성공과 저장 검증은 구분합니다. 현재 공개 주소의 로그인·저장은 확인했지만, 새 환경을 복제하면 그 환경에서 다시 확인해야 합니다.
