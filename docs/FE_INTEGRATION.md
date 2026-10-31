# Malo FE API 연동 작업

> 최신 엔딩 API·정리 카드·추가 감정 이미지 연결은 [FE Migration V2](FE_MIGRATION_V2.md)를 먼저 확인하세요.

기준: miod4198의 [PR 7](https://github.com/2026-INTHON/frontend/pull/7), 최종 head `b59d663a5fddb46412fae0f6b2e7da51e024c2df`. 이 PR은 develop에 병합됐다. 아래는 이 상태에서 **FE가 추가 구현할 작업**이다. BE/AI 구현과 FE 구현 완료를 구분한다.

캐릭터·성격·예시 대본·챕터는 BE DB를 원본으로 사용한다. 대화는 서버가 진행하며, 생성은 화면을 닫아도 계속된다. FE에 있는 카드·힌트·판정 화면은 유지하고 데이터와 상태 연결을 교체하면 된다.

## 최신 반영 사항 — 2026-11-01

BE·AI 배포와 실제 8발화 → 상세 보고서 생성 검증을 마쳤다. **이 PR은 FE 문서만 변경한다. 아래 화면 연결은 FE 개발 작업이다.**

| 먼저 연결할 항목 | 사용할 서버 값 |
|---|---|
| 8발화 학습 | 교육과정 `gf-1-1` / `prof-1-1`, `aiMode:"live"` |
| 대화 전 상황·목표·번역 | `session.briefing`과 `briefing.translation` |
| 한국어 원문 + 선택 언어 자막 + 음성 | `npc` / `turn.npcReplySubtitle` / `audioUrl` |
| 학습 판정 O·△·X·?와 사유 | `turn.evaluation.mark/reason/reasonSubtitle` |
| 캐릭터 표정·몸짓 이미지 | 판정과 독립적인 `turn.emotion/render`, DB 등록분을 포함한 이미지 34개 |
| 완료 평가 → 대화별 자세히 보기 | `result.report` → `GET /sessions/{id}/report` |

공개 교육과정은 **8챕터·32서브챕터, 각각 8노드**다. 재도전하면 실제 발화 수는 늘어난다. 기존 1~3노드 예시도 남아 있으므로 배열 첫 항목을 고르면 안 된다. 서버가 8노드를 제공해도 현재 FE의 자동 fallback·한마디 대본을 연결한 상태에서는 화면이 자동으로 바뀌지 않는다.

## 먼저 할 작업

| 우선순위 | 작업 | 완료 기준 |
|---|---|---|
| P0 | 하드코딩 목록을 DB API로 교체 | 신규 계정에 가짜 완료·A등급이 보이지 않고, 서버 캐릭터·챕터가 표시됨 |
| P0 | 상황 안내·번역, O△X?, 완료 상세 보고서 연결 | 대화 전 맥락 확인, 캐릭터 감정과 별도 판정, 실제 보고서 표시 |
| P0 | live 엔진 연동과 자동 mock 전환 제거 | AI 오류에서 체력 변화 없이 재시도, 가짜 STT·대사 없음 |
| P0 | 2단계 힌트·단서·모국어 도움·정정·관점 전환·성취도 연결 | 서버 필드와 화면의 값이 일치 |
| P0 | 나만의 챕터 생성·생성중 카드·재접속 복원 | 생성 예약 후 다른 학습 가능, 새로고침 후 같은 작업 확인 |
| P0 | 녹음 중 전사와 실측 | 녹음 종료부터 화면 반응까지 시간을 기록하고 5초 초과에도 실제 응답 대기 |
| P1 | PWA Web Push | 알림 허용한 웹앱에서 닫힌 화면의 생성 완료 알림과 본인 챕터 이동 |
| P1 | 표정·몸짓 이미지 전환 | 이미지 목록을 캐시하고 BE의 render.assetKey로 같은 캐릭터 표정 전환 |
| P2 | 카드 섞임·서브 챕터 전환·화면 높이 조정 | 작은 아이폰·갤럭시에서도 녹음 버튼과 대사 영역 사용 가능 |

## 서버 주소와 공통 규칙

```env
EXPO_PUBLIC_API_URL=https://inthon-demo-20261031-dh.koreacentral.cloudapp.azure.com
```

`src/lib/api.ts`가 `/api/v1`을 붙이므로 환경변수에는 호스트만 넣는다. [Swagger](https://inthon-demo-20261031-dh.koreacentral.cloudapp.azure.com/api/v1/docs)에서 최신 형식을 확인한다. 성공 응답은 `{data, meta}`, 실패는 `{error:{code,message,retryable,requestId}}`다. 기존 unwrap·토큰 저장·refresh·PKCE 코드는 재사용한다.

선택 언어 자막과 음성은 [최신 대화 API 요청사항](BE_SUBTITLE_AUDIO_HANDOFF.md)을 먼저 따른다.

FE에는 Azure/OpenAI/Lablup 키, Supabase service role, SSH private key를 넣지 않는다. 음성·생성 API는 Malo Bearer 토큰으로 BE를 호출한다. 실시간 STT의 60초 임시 자격증명과 VAPID 공개키만 예외적으로 클라이언트에서 사용한다.

## 데이터 원본 교체

| 현재 파일·데이터 | 교체 대상 |
|---|---|
| `src/lib/data.ts`의 `CHARACTERS`, `PERSONAS` | `GET /characters`의 `personalities` 포함 데이터 |
| `CHAPTERS`와 로컬 완료·등급 | 인증 후 `GET /chapters?pack=ko&characterId=...` |
| `SCENES`, `sceneById`, `sceneForChar` | 공개 브리핑은 `/scenes`, 실제 대사·선택지는 `/sessions` 응답 |
| `IMG.char`, `IMG.card`, `IMG.bg` | 서버 `imageUrl`, `cardUrl`, 세션 `backgroundUrl`을 `absUrl`로 변환 |
| 로컬 진행도·재화·오답 통계 | `/home`, `/records`, `/wallet`, `/mistakes`, 세션 결과 |

서버 ID는 `girlfriend / friend / manager / professor`, 성격 ID는 `playful / strict / calm`이다. 기존 표시용 키는 `clientKey`로 각각 `seoyun / junho / boss / prof`, `tease / picky / calm`을 제공한다. API 요청과 저장에는 서버 ID를 쓴다. 캐릭터 이름은 DB의 **서윤·준호·한 부장·윤 교수**를 사용한다.

`/chapters`는 공개 교육과정·기존 예시·내 개인 챕터를 함께 반환한다. `source=curriculum|examples|personal`로 구분할 수 있다. 카드의 `id`·`subs[].sceneId`를 그대로 사용하고, 챕터 번호나 로컬 배열 위치로 ID를 조립하지 않는다. 내 챕터는 공개 `/scenes`에 나오지 않으며, 해당 소유자의 `/sessions` 시작 요청으로 접근한다.

챕터 `generationStatus=generating|failed` 또는 서브 챕터 `availability!=ready`이면 시작 버튼을 비활성화한다. `state=done/now/open/locked`, `score`는 서버 기록을 표시한다. 대본이 없는 옛 FE 카드 제목은 보존하되 `availability=unavailable`로 잠겨 있다. 다른 장면으로 몰래 연결하지 않는다.

로딩·빈 목록·API 오류·재시도를 각각 표시한다. 404나 네트워크 오류를 첫 번째 예시 시나리오로 바꾸는 `?? SCENES[0]` 처리는 제거한다. 전체 정답·속마음 대본을 미리 내려받아 채점하지 않는다.

## 대화 화면 연결

`src/lib/api.ts`, `src/lib/engine.ts`, `src/app/scene/[id].tsx`를 우선 수정한다.

1. `POST /sessions`에 `{sceneId, aiMode:"live", subtitleLanguage:st.lang}`를 보낸다. 기존 엔진의 이름이 live여도 `aiMode`를 생략하면 옛 예시는 mock 채점이다. 새 개인·교육과정 장면은 서버가 live로 고정한다.
2. `session.npc.action`은 행동 문장, `npc.cues[]`는 표정·억양·망설임·침묵 칩으로 대사 아래 표시한다. 별도 추론 화면은 추가하지 않는다.
3. `POST /sessions/{id}/hint`에 **`{step:1}` → `{step:2}`**를 보낸다. 1단계는 `clue[]`만 표시하며 `hiddenThought/tip=null`이다. 같은 노드에서 다시 열어도 서버가 중복 집계하지 않는다. 빈 body는 보내지 않는다.
4. 답변은 `/sessions/{id}/turns`로 제출한다. 요청을 만들 때 `clientTurnId`를 한 번 생성하고, 네트워크 재시도에는 같은 ID·내용을 사용한다. 답을 고쳐 새로 말할 때만 새 ID를 만든다.
5. `turn.evaluation.mark`로 O·△·X·?를 표시한다. `outcome` 3종으로 4개 표시를 추측하지 않는다. X에는 **정정하기**, ?에는 인식 내용 확인·다시 말하기를 제공한다. △도 `progression=advance`이면 진행하고 retry이면 같은 노드에서 보완한다. 체력은 `session.lives`를 사용한다.
6. `turn.native=true`이면 모국어 답을 받아 준다. `feedback.betterExpression`의 한국어 표현을 보여준 뒤 같은 노드에서 재도전한다. 모국어 도움과 AI 오류에는 체력을 깎지 않는다.
7. `turn.comparison`이 있으면 `firstAnswer → currentAnswer`를 한 줄로 비교한다. `attempt`와 `nodeId`를 사용하며 앱 재실행에도 서버 기록을 유지한다.
8. 피드백의 **다른 사람이 이 말을 하면?** 버튼을 눌렀을 때만 `feedback.views[]`를 펼친다. 대답 전에 필수 단계로 만들지 않는다.
9. 결과는 `result.achievement.reach/infer/self` 세 수치를 표시한다. `null`이면 측정값 없음으로 처리한다. 로컬 `scoreOf`로 다시 계산하지 않는다.

응답의 `turn.npcReply`는 방금 답에 대한 반응이다. 피드백을 닫은 다음 `session.npc`의 다음 대사를 표시한다. 새 대사에서 action·cues도 함께 갱신한다. 마지막 결과가 있으면 마지막 대사를 다시 진행하지 않는다.

`result.ending`은 `{id,kind,title,text,emotion?,render,dialogue,recap}`이며 `happy`, `deferred`, `breakdown` 세 결말을 제공한다. `passed`는 학습 성공 여부다. **O를 받았어도 교수님의 정책이나 상대 의사 때문에 요청이 보류될 수 있다.** 엔딩과 학습 점수를 같은 의미로 취급하지 않는다. 다음 회차는 `result.nextSceneId`를 사용한다.

△의 진행 여부는 서버 `evaluation.progression`을 따른다. 임의로 통과시키는 skip API는 없다. FE live 모드의 정답 보기·건너뛰기는 진행 버튼으로 쓰지 않고, 힌트 후 다시 말하기로 연결한다.

### 반드시 제거할 자동 데모 처리

PR 7의 `createEngine`은 오류 시 `mockEngine`으로 전환하고, `transcribe(uri=null,fallback)`는 예시 문장을 반환한다. `useRec.ts`도 녹음 시작 실패를 성공처럼 반환한다. 이 세 경로를 제거한다. 데모가 필요하면 사용자가 명시적으로 선택한 별도 데모 모드에만 둔다.

현재 live 엔진의 `views:[]`, `speed:'적당해요'`, `hesitation:'없어요'`, `ending:'또렷하게 끝냈어요'`도 서버 근거가 없는 기본 문구다. 실제 응답 필드를 연결하고 값이 없으면 **측정 안 함**으로 표시한다. 텍스트의 공손함 점수를 목소리 감정·발음 점수로 표현하지 않는다.

## 상황 안내·판정·상세 보고서 계약

### 대화를 시작하기 전

`session.briefing`은 `{title,partner,situation,goal,translation}`이다. `translation`은 `{language,title,partner,situation,goal}` 또는 null이다. 시작 요청의 `subtitleLanguage`가 번역 언어다. 대화 전 원문과 선택 언어의 짧은 상황·목표를 보여주고 **대화 시작**을 누르면 NPC 음성·제한시간·녹음을 시작한다. 브리핑을 읽는 동안 타이머가 돌거나 자동 종료되지 않게 한다. 이 안내에는 속마음·모범 답안이 없다.

### 판정과 캐릭터 감정 분리

```ts
evaluation: {
  mark: 'O'|'△'|'X'|'?',
  category: 'excellent'|'acceptable'|'inappropriate'|'off_topic',
  label: string, reason: string,
  reasonSubtitle: {language:string,text:string}|null,
  goalAchieved: boolean, progression: 'advance'|'retry',
  policyVersion: 'judgment-v2-draft'|'reaction-v1-draft', provisional: true
}
```

| 표시 | 의미 |
|---|---|
| O | 매우 적절. 사소한 오류는 허용 |
| △ | 의사소통은 되지만 표현·말투·맥락·뉘앙스 보완 필요 |
| X | 핵심 의도를 명백히 오해하거나 심한 무례·부적절함 |
| ? | 불완전·모호·이해 불가로 의도 판정 어려움. STT 내용 확인도 안내 |

사용자가 제공한 예시 12개도 프롬프트에 포함했다. “네 교수님. 내일 2시에 갈게요.”는 △, 면담 지시에 대한 “내일 수업은 휴강인가요?”는 X, 결론이 끊겨 의도를 알기 어려운 답은 ?라는 기준이다. 의미가 명확한 화제 이탈과 의도 자체를 알 수 없는 응답을 구분한다. 실제 관계·맥락을 함께 보며 문장 일치로 채점하지 않는다.

학습 판정에 웃음·눈물 등의 감정 이모지를 쓰지 않는다. **적절한 거절은 O이면서 캐릭터 표정은 sad일 수 있다.** 표정은 `render`로 표시한다. ?·모국어 도움·AI 오류는 차감하지 않으며, 낮은 신뢰도의 X는 서버가 ?로 보류한다. `evaluation=null`인 과거 기록은 판정 없음으로 표시하고 새 판정을 만들지 않는다.

사유 원문과 `reasonSubtitle`을 함께 표시한다. 프롬프트는 제공된 「AI 대화 및 학습 과정」을 반영했고, 점수 가중치 등은 임시다. 현재 성취도는 연습 지표이며 공인 한국어 능력이나 심리 측정값이 아니다.

### 완료 보고서와 자세히 보기

최종 턴의 `result`는 즉시 사용한다. `result.report={reportId,status}`가 있으면 서버가 상세 보고서 생성을 예약한 상태다. 보고서를 기다리느라 전체 결과 화면이나 다른 학습을 막지 않는다.

| 요청 | 동작 |
|---|---|
| `GET /sessions/{id}/report` | 상태·완료 보고서 조회. 조회가 유료 생성을 시작하지 않음 |
| `POST /sessions/{id}/report {}` | 완료 세션의 보고서 생성 또는 기존 작업 재사용 |
| `POST /sessions/{id}/report/retry {}` | 실패한 작업 재시도 |

```ts
{data:{reportId, status:'queued'|'running'|'ready'|'failed', error:null|{code,message,retryable}, report:null|{
  id, sessionId, sceneId, title, language, policyVersion, provisional, createdAt,
  overview:{passed,score,grade,achievement,rewardCoins,elapsedMs,learnerTurns,judgmentCounts},
  summary:{headline,overallFeedback,strengths,improvements,culturalTakeaways,nextPractice},
  details:[{turnId,nodeId,attempt,comparison,npcText,learnerText,native,
    assessmentSource,legacyOutcome,evaluation,originalIntent,implicitIntent,cues,
    culturalContext,feedback,feedbackTranslation,praise,alternativeExpression,practiceTip}]
}},meta:{...}}
```

화면이 보이는 동안만 3~5초 간격으로 조회하고, 복귀 시 즉시 조회한다. 404는 아직 요청하지 않은 보고서이므로 완료 세션에서 POST로 생성할 수 있다. 409는 진행 중 세션이다. 실패 시 재시도를 제공하고 기존 결과·점수는 유지한다. 작업은 영속 큐에 저장돼 앱을 닫아도 계속되며 본인만 조회할 수 있다.

`overview`와 `summary`는 종합 보기, `details`는 **대화별 자세히 보기**에 쓴다. 모든 실제 재시도도 포함한다. 기록된 판정·사유, 설정된 NPC 의도, 문화 맥락, 자연스러운 대안, 최초 답과 비교를 표시한다. `praise`가 있으면 잘한 점을 보여주고, `alternativeExpression=null`이면 억지 교정 문장을 만들지 않는다. 보고서는 기존 점수를 재채점하지 않는다. 설명은 선택 언어, 실제 대사·표현 인용은 학습 언어다. 정정·대안에 필요할 때 원문을 함께 표시한다.

완료 알림 URL은 보고서의 경우 `/result?sessionId=...`이다. FE 라우팅 형태에 맞춰 같은 origin 내부 이동으로 처리하고 로그인 후 본인 세션을 다시 조회한다. 현재 API는 생성 큐·푸시 설정까지 준비됐으며, 실제 iPhone/Galaxy의 SW·권한·알림 도착은 FE에서 검증해야 한다.

## 나만의 챕터 생성

```http
POST /chapter-generations
Authorization: Bearer <Malo accessToken>
Content-Type: application/json

{
  "clientRequestId": "새 UUID",
  "prompt": "기한 내 과제 제출을 잊었어요. 교수님은 실망한 상태예요. 사과하고 내일 저녁까지 제출할 기회를 정중히 부탁하고 싶어요.",
  "characterId": "professor",
  "personalityId": "calm",
  "pack": "ko",
  "lessonCount": 3
}
```

`lessonCount`는 2~4, 기본 3이다. **각 서브 챕터**가 약 5분·학습자 발화 8회이며, 실제 소요시간은 말하기·재도전에 따라 달라진다. 요청에 감정·배경·희망 결말을 자세히 써도 된다. 안전한 일상 학습과 캐릭터의 성격 범위에서 반영한다.

응답은 즉시 `200`으로 생성 작업을 돌려준다. HTTP 200을 콘텐츠 생성 완료로 해석하지 않는다.

```ts
type GenerationJob = {
  id: string; label: string; characterId: string; personalityId: string;
  status: 'queued' | 'running' | 'ready' | 'failed';
  stage: string; chapterId: string | null;
  error: {code: string; message: string; retryable: boolean} | null;
  createdAt: string; updatedAt: string;
};
```

화면에 보이는 동안 `GET /chapter-generations` 또는 `/{id}`를 3~5초 간격으로 조회한다. 화면이 숨겨지면 폴링을 멈추고, 돌아오면 즉시 새로 조회한다. AppState/visibility 이벤트에서 복원하고 로그아웃·계정 변경 시 이전 계정 캐시를 비운다. 서버 작업은 계속되므로 FE의 타이머를 작업 실행 수단으로 쓰지 않는다.

`queued/running` 카드는 **생성중…**으로 잠그고 다른 학습은 허용한다. `stage`를 퍼센트 게이지로 바꾸지 않는다. `ready`가 되면 `/chapters`를 다시 불러와 `chapterId` 카드만 활성화한다. 대본·분기·배경까지 모두 준비된 후 ready가 된다. 화면을 닫았다 다시 열어도 작업 목록에서 복원한다.

네트워크 전송 실패는 같은 `clientRequestId`로 재전송한다. 서버가 최종 `failed`를 반환하면 `POST /chapter-generations/{id}/retry {}`로 저장된 단계부터 재개한다. 이미지 예산 초과는 한도 재개 후 시도하고, 부적절한 내용은 고쳐서 새 UUID로 생성한다. 새 이야기로 변경할 때도 새 UUID를 쓴다. 시연용 서버 한도는 현재 계정당 진행 중 3개·하루 5개다. 이 제한은 실제 구독 상품 정책과 별개다. 무료/구독 결제와 주 2개 페르소나 생성권 차감은 이번 API에 구현되지 않았다.

## 음성 응답과 지연 시간

목표 측정 구간은 **녹음 종료 → STT 확정 → AI 판정·대사 화면 표시**다. 음성 재생 시작까지도 따로 기록한다. 검토 화면에서 사용자가 머문 시간까지 포함한 전체 시간과, 그 시간을 제외한 처리 시간을 구분한다.

웹 우선 경로는 `POST /speech/realtime-session {pack:"ko"}`로 임시 자격증명을 받아 녹음 **중** 전사하는 방식이다. 서버의 프로젝트 키를 브라우저에 저장하지 않는다. 반환된 `value`는 메모리에만 보관하고 로그·localStorage에 남기지 않는다.

웹 WebSocket을 사용한다면 `websocketUrl`과 `['realtime', 'openai-insecure-api-key.' + value]` 서브프로토콜로 연결한다. AudioWorklet 등으로 마이크를 **24 kHz mono PCM16**으로 변환하고, 100~200ms 단위로 `input_audio_buffer.append`에 base64를 보낸다. `MediaRecorder`의 webm 파일 조각을 PCM으로 간주해 보내면 안 된다. WebRTC 경로를 선택할 때는 [공식 연결 예제](https://developers.openai.com/api/docs/guides/voice-webrtc?api=realtime)를 따른다.

녹음을 끝내면 `input_audio_buffer.commit`을 보내고, `input_audio_buffer.committed.item_id`와 전사 `completed.item_id`를 매칭한다. `gpt-live-transcribe`에는 server_vad·semantic_vad를 켜지 않는다. delta는 미리보기, completed가 제출할 확정 문자열이다. 권한 거절·무음·연결 실패에는 가짜 예시 문장을 쓰지 않고 다시 녹음·텍스트 입력을 제공한다. 시작 전 연결을 준비하고, 녹음은 60초 내에서 종료하며 트랙·소켓을 즉시 닫는다.

확정 전사는 `/sessions/{id}/turns`에 `{clientTurnId,inputType:"voice",text,realtime:true}`로 보낸다. 이 경로는 음성 속도·침묵 측정값을 만들지 않으므로 그 그래프는 숨기거나 측정 안 함으로 표시한다. `realtime:true`는 음성 진위 인증이 아니라 입력 경로 구분이다.

기존 Expo Go·파일 녹음은 `/speech/transcriptions`에 업로드한 뒤 `transcriptId`를 붙여 제출할 수 있다. 이 경로의 오디오 분석은 추정치이며 감정 진단이 아니다. Expo Go에 없는 네이티브 WebRTC 모듈을 추가하면 Expo Go에서 실행되지 않는다. **무료 기기 테스트는 PWA의 실시간 전사와 Expo Go의 파일 녹음 경로를 나누어 확인**한다.

현재 BE는 실제 응답을 기다리며, 5초 초과 시에도 mock으로 대체하지 않는다. FE는 3초 이후 생각 중 표시, 5초 이후 기다리는 중 표시를 하되 자동 실패 판정을 하지 않는다. 네트워크 제한 시간을 늘리고, 최종 오류에는 같은 clientTurnId로 재시도한다. 단축된 온라인 LLM 호출과 실시간 전사 준비는 구현됐지만 **기기별 3~5초 보장은 아직 실측 대상**이다. [전사 이벤트·모델 제약](https://developers.openai.com/api/docs/guides/realtime-transcription)을 참고한다.

## 웹앱 완료 알림

1. HTTPS 웹앱에 manifest(`display:standalone`, 앱 이름·아이콘)와 Service Worker를 등록한다.
2. 사용자가 **완료 알림 받기**를 누른 시점에 권한을 요청한다. `serviceWorker`, `PushManager`, `Notification`을 먼저 확인하고 거절한 사람에게 반복 팝업을 띄우지 않는다.
3. 인증 후 `GET /notifications/push/config`의 `enabled/publicKey`를 읽는다. VAPID 공개키를 Uint8Array로 변환해 `pushManager.subscribe({userVisibleOnly:true,applicationServerKey})`를 실행한다.
4. `subscription.toJSON()`의 `{endpoint,keys:{p256dh,auth}}`를 `POST /notifications/push/subscriptions`로 저장하고 반환된 id를 해당 계정과 함께 기억한다.
5. 로그아웃·알림 해제 시 `DELETE /notifications/push/subscriptions/{id}` 후 브라우저 `subscription.unsubscribe()`를 호출한다. 다른 계정 구독을 덮어쓰지 않는다.
6. SW의 `push` 이벤트는 `{title,body,url,tag}`를 `showNotification`에 전달한다. `notificationclick`은 같은 origin의 경로만 열고, 로그인 후 `/chapters`에서 **본인 chapterId**를 다시 확인해 이동한다.

알림 본문은 일반적인 생성 완료 문구로 보내며, 개인 시나리오·감정·대사는 잠금화면에 노출하지 않는다. Android Chrome과 **iOS 16.4 이상 홈 화면에 추가한 웹앱**을 대상으로 한다. 아이폰 일반 브라우저 탭만으로는 같은 조건이 충족되지 않는다. OS·브라우저 설정에 따라 알림 전달은 지연되거나 차단될 수 있어, 앱을 열면 작업 목록을 반드시 다시 조회한다. Expo Go의 네이티브 Push와는 별개다. ([WebKit 조건](https://webkit.org/blog/13878/), [Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API))

## 캐릭터 모델과 계정 테스트

GLB 모델 대신 같은 캐릭터의 표정·몸짓 이미지를 미리 받는 방식으로 진행한다. `GET /assets/characters`를 미리 로드하고 `session.npc.render` 및 `turn.render`에 따라 전환한다. 현재 여자친구 13개·교수 11개와 친구·부장 각 5개, 총 34개 이미지 항목을 제공한다. 같은 캐릭터의 DB 세트를 우선하며 AI가 사용 조건·태그·현재 반응을 보고 실제 이미지 키를 선택한다. 자세한 필드·대체 순서는 [캐릭터 이미지 요청사항](CHARACTER_IMAGES.md)을 따른다.

Google 로그인은 PR 7의 PKCE·게스트 이관을 유지한다. BE는 기존 중첩 `google.supabaseUrl/publishableKey`와 PR 7이 읽는 최상위 공개 설정을 함께 제공한다. 배포 웹의 `/auth/callback`이 Supabase Redirect URLs에 허용돼 있어야 한다. 네이티브 `malo://auth/callback`은 Expo Go가 커스텀 scheme 앱이 되는 것을 뜻하지 않는다. **구독·앱스토어 결제 없이 두 기기의 전체 로그인·알림 흐름을 테스트할 경로는 HTTPS PWA**다. Expo Go는 UI·API·녹음 테스트에 사용하고, 전용 scheme OAuth는 해당 scheme을 포함한 개발 빌드에서 검증한다.

## 인수 테스트

| 항목 | 기대 동작 |
|---|---|
| 신규 게스트 | 가짜 등급 없음, DB 캐릭터·예시·교육과정 표시 |
| A 계정 생성 → B 계정 조회·시작 | 목록 노출 없음, 추측한 ID는 404 |
| 생성 중 다른 학습·앱 닫기·재접속 | 기존 학습 가능, 같은 생성 작업 복원 |
| 같은 요청 재전송 | 새 작업·중복 과금 방지용 동일 job 반환 |
| 게스트 → Google 로그인 | 학습 기록·진행 중 작업·완료 개인 챕터 이관 |
| 힌트 1 → 2 → 다시 열기 | 단서 후 속마음 공개, 중복 집계 없음 |
| 모국어 답·X 정정 | 한국어 도움 또는 정정 후 같은 대사 재도전, 처음 답 비교 |
| AI 오류·5초 초과 | 가짜 답·추가 체력 차감 없음, 실제 응답 대기·재시도 |
| 분기·마지막 발화 | 서버 다음 대사와 3개 결말 중 실제 ending 표시 |
| 푸시 허용·거절·해제·닫힌 앱 | 허용 시 완료 알림, 미지원·거절 시 조회로 복원 |
| iPhone Safari PWA·Galaxy Chrome PWA | 마이크·오디오 재생·화면 safe area·키보드·작은 높이 확인 |
| Expo Go 양 기기 | 파일 STT와 API 흐름 확인, 지원하지 않는 웹 기능은 숨김 |

서버의 생성·보안 테스트와 실제 기기의 마이크·Push 테스트는 별도다. 기기에서 수행하지 않은 항목을 완료로 체크하지 않는다.


배경 선명도 계약: 기존 FE 카페 배경은 파일 자체가 부드럽게 처리돼 있다. 신규 배경도 BE에서 Gaussian blur를 적용한 파일을 제공하므로 FE에서는 원본 URL을 그대로 표시한다. 캐릭터·텍스트에는 블러를 주지 않는다. 배경 전체 View에 filter/blur를 걸어 자식 캐릭터까지 흐려지게 하지 않는다.

이번 서버 검증: 8회 실제 발화로 8노드를 완료하고 대화별 보고서를 생성했다. HTTP 응답 시간은 중앙값 4.74초, 최대 6.21초였다. 텍스트 제출부터 AI·인라인 TTS 응답까지이며 마이크·STT·기기 재생은 포함하지 않는다. 기기에서 녹음 종료 기준 3~5초를 따로 측정해야 한다.


배드엔딩 이미지 연결: 여자친구 경멸·분노·눈물 및 교수 분노 4종을 DB/API에 추가했다. 결과 화면은 `result.ending.render`를 사용하며, 일반 대화는 기존 `turn.render`를 따른다. 감정은 O·△·X·?와 분리한다. 강한 실패 엔딩에는 적절한 새 이미지를 우선하고 정중한 보류는 차분한 슬픔도 가능하다. 자세한 키와 호환 처리는 [캐릭터 이미지 계약](CHARACTER_IMAGES.md#추가-감정-4종과-배드엔딩)을 따른다. 이 변경도 FE 앱 소스가 아닌 연동 문서만 수정한다.
