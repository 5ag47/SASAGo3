# Firebase Google 로그인: 처음 하는 분을 위한 안내

이 절차는 **Google 로그인만** 준비합니다. Firestore·Realtime Database·Firebase Hosting·서비스 계정 키는 만들지 않습니다. 게임 결과 계산과 저장은 별도 게임 서버가 담당합니다. 로컬 미리보기는 이 설정 없이도 `npm run dev`로 실행됩니다.

## 1. 프로젝트 만들기

1. <https://console.firebase.google.com/>을 브라우저에서 엽니다.
2. 사용할 Google 계정으로 로그인합니다.
3. 프로젝트 목록에서 **프로젝트 만들기 / 프로젝트 추가**를 누릅니다.
4. 이름을 `sasago3`로 입력합니다. 자동 생성된 프로젝트 ID는 그대로 사용해도 됩니다. 이미 같은 이름이 있으면 ID에 문자가 붙을 수 있습니다.
5. **계속**을 누릅니다. Gemini 선택이 나오면 사용하지 않아도 됩니다.
6. Google Analytics 설정이 나오면 끕니다. 이 게임의 로그인에는 필요하지 않습니다.
7. **프로젝트 만들기**를 누르고, 생성이 끝나면 **계속**을 누릅니다.
8. 요금제를 바꾸거나 카드 정보를 등록하지 않습니다. 결제 관련 화면이 나타나면 그 단계에서 멈추고 화면 문구를 확인합니다.

## 2. 웹 앱 등록

1. 방금 만든 프로젝트의 개요 화면을 엽니다.
2. `</>` 모양 **웹** 아이콘을 누릅니다. 안 보이면 **앱 추가 → 웹**을 고릅니다.
3. 앱 닉네임에 `sasago3-web`을 입력합니다.
4. Firebase Hosting 설정 선택란이 나오면 체크하지 않습니다.
5. **앱 등록**을 누릅니다.
6. SDK 설정 화면의 `const firebaseConfig = { ... }`를 찾습니다.
7. `apiKey`, `authDomain`, `projectId`, `appId` 네 값을 확인합니다. 이 화면의 npm 명령을 직접 실행할 필요는 없습니다. 개발 의존성은 이미 설치되어 있습니다.
8. **콘솔로 이동**을 누릅니다.

설정 코드를 다시 보려면 **왼쪽 위 톱니바퀴 → 프로젝트 설정 → 일반 → 내 앱 → sasago3-web → SDK 설정 및 구성**으로 이동합니다.

## 3. Google 로그인 활성화

1. 왼쪽 메뉴에서 **Authentication**을 엽니다. 메뉴에서 찾기 어렵다면 콘솔의 검색창에 `Authentication`을 입력합니다.
2. 처음 사용하는 경우 **시작하기**를 누릅니다.
3. **로그인 방법 / Sign-in method** 탭을 엽니다.
4. 제공업체 목록의 **Google**을 누릅니다. 목록이 비어 있으면 **새 제공업체 추가 → Google**을 선택합니다.
5. **사용 설정 / Enable**을 켭니다.
6. 프로젝트 지원 이메일을 요구하면 드롭다운에서 본인 이메일을 선택합니다. 그 이메일을 개발자에게 전달할 필요는 없습니다.
7. 공개 프로젝트 이름을 요구하면 `SASAGo3`를 입력합니다.
8. **저장**을 누릅니다. 목록에서 Google이 활성화 상태인지 확인합니다.

공식 안내: <https://firebase.google.com/docs/auth/web/google-signin>

## 4. 로컬 로그인 주소 허용

1. Authentication의 **설정 / Settings** 탭을 누릅니다.
2. **승인된 도메인 / Authorized domains**를 엽니다.
3. 목록에 `localhost`가 있으면 그대로 둡니다.
4. 없으면 **도메인 추가**를 누르고 `localhost`만 입력한 뒤 저장합니다. `http://` 또는 `:5173`을 붙이지 않습니다.
5. 로그인 테스트 주소는 `http://localhost:5173`을 사용합니다. `127.0.0.1`과는 다른 호스트입니다.
6. 나중에 공개 배포한 뒤에는 실제 게임 도메인도 이곳에 추가합니다. 별도 운영 프로젝트를 사용한다면 운영 프로젝트에서는 `localhost`를 제거합니다.

신규 프로젝트에 localhost가 기본 추가되지 않는 변경 안내: <https://firebase.google.com/docs/auth/faq-and-troubleshooting>

## 5. 개발자에게 전달할 값

다음 **공개 웹 앱 설정**만 전달합니다. 또는 직접 `.env.local` 파일에 입력해도 됩니다.

```text
apiKey: ...
authDomain: ...
projectId: ...
appId: ...
```

**전달하지 않을 것:** 서비스 계정 JSON, private_key, Google 비밀번호, 로그인 ID 토큰, refresh token, Cloudflare API 토큰. 공개 Firebase 설정의 API 키는 DB 관리자 비밀키가 아니지만, Google Cloud 콘솔에서 API 사용 제한·쿼터는 별도로 관리해야 합니다.

## 6. 내 컴퓨터에서 로그인 테스트

1. Github Desktop에서 저장소가 `SASAGo3`, 브랜치가 `codex/sasago3-web-game`인지 확인합니다.
2. 저장소 폴더를 엽니다. `package.json`과 `.env.example`이 보이는 폴더입니다.
3. `.env.example`을 복사하고 복사본 이름을 `.env.local`로 바꿉니다. `.txt`가 붙지 않게 합니다.
4. 파일을 편집기로 열고, 네 항목 오른쪽에 웹 앱 설정을 넣습니다. 따옴표 없이 넣어도 됩니다.

```dotenv
VITE_FIREBASE_API_KEY=여기에_apiKey
VITE_FIREBASE_AUTH_DOMAIN=프로젝트ID.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=프로젝트ID
VITE_FIREBASE_APP_ID=1:숫자:web:문자열
VITE_SERVER_MODE=false
PUBLIC_ORIGIN=http://localhost:5173
API_PORT=4174
```

5. 현재 `npm run dev`를 실행한 터미널이 있으면 그 터미널에서 `Ctrl+C`를 눌러 중지합니다. 같은 포트에서 두 서버를 실행하지 않습니다.
6. 이 폴더에서 터미널을 열고 `npm run dev:secure`를 실행합니다. Node.js 24 LTS를 권장합니다.
7. 브라우저에서 **http://localhost:5173**을 엽니다.
8. **Google로 로그인**을 누르고 본인이 계정을 선택합니다. 개발자가 비밀번호를 대신 입력할 필요는 없습니다.
9. 닉네임·특성·전공을 선택해 게임을 시작합니다.
10. 한 주를 보낸 뒤 새로고침합니다. 같은 기록이 복구되고 화면에 **서버 저장됨**이 보이는지 확인합니다.
11. 설정에서 로그아웃한 뒤 다시 같은 Google 계정으로 로그인해 기록이 복구되는지 확인합니다.

서버 모드는 브라우저 저장을 서버에 업로드하거나, 서버 장애 시 로컬 저장으로 자동 전환하지 않습니다. 로컬 게임 기록은 별개입니다.

## 막혔을 때

| 화면/코드                  | 확인할 곳                                                                      |
| -------------------------- | ------------------------------------------------------------------------------ |
| auth/unauthorized-domain   | Authentication → 설정 → 승인된 도메인에 localhost 또는 현재 배포 호스트 추가   |
| auth/operation-not-allowed | 로그인 방법에서 Google 활성화                                                  |
| auth/popup-blocked         | 로그인 버튼을 직접 클릭하고 브라우저 팝업 차단 설정 확인                       |
| FIREBASE_CONFIG_REQUIRED   | .env.local 이름과 네 설정값, 서버 재시작 여부 확인                             |
| AUTH_INVALID               | 다시 로그인; 서버 projectId·apiKey가 같은 프로젝트인지 확인                    |
| ORIGIN_DENIED              | PUBLIC_ORIGIN과 실제 브라우저 주소의 프로토콜·호스트·포트가 정확히 같은지 확인 |
| REVISION_CONFLICT          | 최신 저장 불러오기; 다른 창의 변경을 덮어쓰지 않음                             |

위 단계를 완료해도 실제 Google 로그인 성공과 재로그인 복구를 확인하기 전에는 외부 연동이 완료됐다고 보지 않습니다.
