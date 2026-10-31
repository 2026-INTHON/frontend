# Malo (말로) · 프론트엔드

React Native + Expo SDK 58 + TypeScript + expo-router

## 실행
```bash
npm install
npx expo start          # 터미널에 뜬 QR을 아이폰 카메라 / 갤럭시 Expo Go 앱으로 찍기
npx expo start --web    # 브라우저로 빠르게 보기
```
폰과 컴퓨터가 같은 와이파이여야 해요. 회사·학교 와이파이에서 안 붙으면 `npx expo start --tunnel`.

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
