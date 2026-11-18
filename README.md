# StardewSOOPBridge

Windows 로컬 PC에서 스트리머 본인이 SOOP 인증을 하고, SOOP Chat SDK(브라우저) → Node.js 로컬 브리지 → Stardew Valley SMAPI 모드로 후원 이벤트를 전달하는 프로젝트입니다. 스트리머별로 이 프로그램을 각자의 PC에서 실행하는 구성입니다.

## 프로젝트 구성

- `public/index.html`: 공식 SOOP Chat SDK 브라우저 스크립트 로드, OAuth, 채팅 연결, `BALLOON_GIFTED` 이벤트 수신
- `src/server.js`: 로컬 웹 서버, OAuth callback, 이벤트 검증 및 SMAPI 전달 API
- `src/donation-handler.js`: 후원 이벤트 검증
- `src/stardew-client.js`: SMAPI HTTP 수신기로 후원 전달
- `smapi-mod-source/ModEntry.cs`: 기존 SMAPI 모드 소스
- `.env.example`: 설정 템플릿

## 1. 준비

- Windows
- Node.js 20 이상
- SOOP 개발자 앱의 Client ID / Client Secret
- 스트리머 본인 SOOP 계정과 해당 앱에 등록한 Redirect URL
- 기존 Stardew Valley SMAPI 모드 및 해당 모드의 AuthToken

이 SDK는 **브라우저 환경에서만 지원**되며 본인 방송 채팅에만 연결됩니다. Node.js 서버가 SDK를 직접 import하지 않습니다. SDK는 브라우저에서 실행되고 로컬 Node 서버는 후원 이벤트를 SMAPI로 전달합니다.

## 2. 환경 설정

PowerShell에서 프로젝트 폴더로 이동한 뒤:

```powershell
npm.cmd install
Copy-Item .env.example .env
notepad .env
```

`.env` 값을 채우세요.

```dotenv
SOOP_CLIENT_ID=개발자앱_Client_ID
SOOP_CLIENT_SECRET=개발자앱_Client_Secret
SOOP_REDIRECT_URL=http://127.0.0.1:3000/oauth/callback
STARDEW_BRIDGE_URL=http://127.0.0.1:8765/event
STARDEW_BRIDGE_TOKEN=SMAPI_모드의_AuthToken
PORT=3000
```

개발자 앱 설정의 Redirect URL도 정확히 `http://127.0.0.1:3000/oauth/callback`로 등록하세요. 앱 등록 정책에서 허용되는 Redirect URL 형식은 SOOP 개발자 페이지를 따르세요.

## 3. 실행

```powershell
npm.cmd start
```

브라우저에서 `http://127.0.0.1:3000`을 여세요. SDK CDN을 불러오므로 인터넷 연결이 필요합니다.

1. `SOOP 로그인 / 인증`을 누릅니다.
2. 스트리머 본인 계정으로 SOOP 인증 및 동의를 완료합니다.
3. Redirect 후 채팅 연결을 시도합니다.
4. 화면에 연결됨이 표시되는지 확인합니다.
5. 테스트 방송에서 별풍선 이벤트가 발생하면 Node 브리지가 SMAPI 모드로 전달합니다.

현재 버전은 `.env`에 고정된 `SOOP_STREAMER_ID`를 사용하지 않습니다. 인증한 브라우저의 SOOP 토큰과 SDK가 제공하는 방송 ID(bjId)를 사용합니다. 각 스트리머는 자기 PC에서 프로그램을 실행하고 자기 게임 서버를 연결해야 합니다. 브라우저 저장소에 access token이 저장됩니다. `저장된 인증 삭제` 버튼으로 지울 수 있습니다. 토큰이 만료되어 연결이 실패하면 인증 버튼을 눌러 다시 인증하세요. refresh-token 갱신은 SDK의 실제 응답과 만료 동작을 테스트한 뒤 별도로 검증해야 합니다.

## 4. 후원 규칙 (SMAPI 모드 기준)

개별 `BALLOON_GIFTED` 이벤트의 `count` 기준:

- 33개 이상: 몬스터 1마리
- 100~999개: 100개당 상자 1개
- 정확히 1,000개: 상자 11개
- 1,000개 초과: 상자 지급 없음
- 상자 지급과 몬스터 소환은 서로 독립

## 5. SMAPI 모드 연결

`smapi-mod-source/ModEntry.cs`는 소스 파일이며 단독 DLL이 아닙니다. 사용 중인 SMAPI 모드 프로젝트에서 빌드하고, 모드 설정의 `AuthToken`과 `.env`의 `STARDEW_BRIDGE_TOKEN`을 일치시키세요. 모드의 계정 연결 설정도 요구 조건에 맞게 승인되어 있어야 보상이 지급됩니다.

## 보안 및 한계

- 이 프로젝트는 스트리머별 로컬 실행용입니다. 서버는 `127.0.0.1`에만 바인딩되어야 하며 포트 3000을 외부에 공개하지 마세요. 이 ZIP만으로 중앙 공개 웹사이트에서 여러 스트리머와 여러 게임 서버를 동시에 관리하는 멀티테넌트 서비스가 되는 것은 아닙니다.
- SDK 공식 예제에 따라 Client Secret이 브라우저에서 SDK 생성자로 전달됩니다. 이 값은 브라우저 개발자 도구를 통해 확인될 수 있으므로 공용 PC나 공개 호스팅에서 사용하지 마세요.
- SDK의 `BALLOON_GIFTED` 문서에 안정적인 이벤트 ID가 명시되어 있지 않아, 브라우저가 생성하는 UUID는 재전송/재수신 중복을 완벽하게 제거하지 못합니다. 실제 후원 테스트가 필요합니다.
- 실방송 운영 전에는 OAuth 인증, 토큰 만료, 채팅 재접속, SMAPI 실행/미실행, 중복 이벤트를 반드시 테스트하세요.


## 스트리머 계정 ID 확인 동작

- `SOOP_STREAMER_ID`를 고정값으로 사용하지 않습니다.
- 로그인 후 OAuth 응답에 계정 ID 필드가 포함되어 있으면 화면의 `인증 계정 ID`에 표시하고 브라우저 로컬 저장소에 저장합니다.
- SDK의 `getRoomInfo()`에서 방송 ID/채팅방 번호를 읽을 수 있으면 표시합니다.
- SDK가 해당 정보를 반환하지 않으면 `connect()` 성공만으로 방송 채팅 연결을 확정하지 않고, 화면에 `방송 정보 미확인`으로 표시합니다.
- 실제 `BALLOON_GIFTED` 이벤트의 `bjId`가 들어오면 해당 ID를 화면에 표시하고 후원 전달에 사용합니다.
- OAuth 응답에도 계정 ID가 없고 채팅 연결 전에 방송 ID도 제공되지 않으면, 브라우저 코드만으로 ID를 확정할 수 없습니다. 이 경우 최근 기록의 응답 필드명에 맞춰 공식 SDK에서 지원하는 계정/방송 정보 API를 확인해야 합니다. 토큰 값은 로그에 기록하지 않습니다.
