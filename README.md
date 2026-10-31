# Malo (말로) · 프론트엔드

React Native + Expo SDK 58 + TypeScript + expo-router

## 실행
```bash
npm install
npx expo start          # 터미널에 뜬 QR을 아이폰 카메라 / 갤럭시 Expo Go 앱으로 찍기
npx expo start --web    # 브라우저로 빠르게 보기
```
폰과 컴퓨터가 같은 와이파이여야 해요. 회사·학교 와이파이에서 안 붙으면 `npx expo start --tunnel`.

## 웹앱으로 쓰기
```bash
npm run web          # 개발용: 브라우저에서 바로 보기
npm run build:web    # 배포용: dist/ 폴더에 웹 파일 생성
npm run preview:web  # dist/ 를 로컬에서 미리 보기
```
- PC에서는 폰 크기(최대 430px)로 가운데에 보이고, 폰 브라우저에서는 꽉 차게 보여요.
- 폰에서 "홈 화면에 추가"하면 앱처럼 전체 화면으로 열려요 (`public/manifest.json`).
- **Vercel 배포**: 저장소를 Vercel에 연결하면 `vercel.json` 설정대로 빌드돼요(빌드 `npx expo export -p web`, 출력 `dist`). 새로고침해도 화면이 안 깨지게 모든 주소를 `index.html`로 보내요.
- 웹에서 마이크는 **https 주소**에서만 켜져요(배포 주소나 localhost는 OK).
- 백엔드 서버가 다른 주소라서, 백엔드에서 웹앱 주소를 CORS 허용해 줘야 서버 판정이 붙어요. 안 붙으면 앱 안 대본으로 돌아가요.

## 구조
- `src/app/` 화면 (파일 = 화면)
  - `index` 웰컴 → `onboarding/pack` → `onboarding/lang`(모국어) → `onboarding/character` → `onboarding/persona` → `scene/[id]`(장면) → `result`
  - `(tabs)/home · mistakes(오답 도감) · stats(내 기록)`
  - `characters · episodes(+요금제) · dress(꾸미기 · 코인 부족) · persona-create · persona-custom · settings · mistake/[id]`
- `src/lib/api.ts` 백엔드 API (`/api/v1`, 게스트 로그인 → 세션 · 턴 · 힌트 · TTS · STT)
- `src/lib/engine.ts` 장면 진행. 서버가 되면 서버(live), 안 되면 `data.ts` 대본(mock)으로 자동 전환
- `src/lib/data.ts` 캐릭터 · 성격 · 데모 대본 · 꾸미기 아이템
- `src/lib/theme.ts` 색 · 글꼴 토큰 (설명 글자는 #6B6B6B 이상)
- `assets/img/` 캐릭터 누끼, 블러 배경 (CSS blur 대신 이미지)

## 음성
- 녹음: expo-audio. 녹음 중엔 파형만, 끝나면 "알아듣는 중…" 후 한 번에 글자로 (실시간 받아쓰기 X)
- 서버 모드: `POST /speech/transcriptions`로 STT, `POST /sessions/{id}/speech`로 TTS
- 가짜 모드: 데모 문장으로 인식, 대사는 기기 TTS(expo-speech)

## Google 로그인

Supabase(PKCE)로 Google 인증을 받고, BE `/auth/google/exchange`에서 Malo 토큰으로 바꿔요. 이때 기존 게스트 기록도 회원으로 옮겨져요. 앱에는 Google Client ID나 Secret을 넣지 않아요.

- 설정: 앱이 시작할 때 `/auth/config`를 읽어요. `google.enabled=false`이거나 서버에 닿지 않으면 버튼이 "준비 중"으로 바뀌고, 게스트 학습은 그대로 돼요.
- 웹: `npm run web`으로 `localhost:8081`에서 열면, 로그인 후 `/auth/callback`(`src/app/auth/callback.tsx`)으로 돌아와서 교환을 마쳐요.
- 앱: `malo://auth/callback`으로 돌아와요. 이 경로는 Expo Go에서는 안 되고 development build(`npx expo run:ios` / `run:android` 또는 EAS)가 필요해요.
- 코드 위치:
  - `src/lib/auth.ts`: 로그인 흐름
  - `src/lib/tokens.ts`: 토큰 보관 (SecureStore / localStorage)
  - `src/lib/api.ts`: 401이면 `/auth/refresh` 후 다시 요청
  - `src/lib/useAccount.ts`: 화면용 훅
- 로그아웃하면 `/auth/logout`, Supabase signOut, 로컬 토큰 삭제를 함께 해요.
