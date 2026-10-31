# FE 요청 사항과 BE 대화 응답

BE가 제공하는 데이터와 FE가 연결할 작업을 정리한다. 이 변경은 문서이며 FE 앱 소스는 수정하지 않았다.

## 지금 한마디 후 끝나는 이유

기존 FE `src/lib/engine.ts`의 `createEngine`과 `src/app/scene/[id].tsx`의 답변 오류 처리는 서버 오류 때 로컬 대본으로 전환한다. 로컬 `seoyun-weekend`, `prof-question`은 각각 사용자 답변 한 번짜리다. 또한 `api.start`는 `aiMode`를 생략하고, 장면 목록에서 첫 번째 짧은 예시를 선택한다. 그래서 **BE 배포만으로 기존 온보딩이 자동으로 8회 학습으로 바뀌지 않는다.**

FE는 다음 순서로 연결해 주세요.

1. 응답 `{data,meta}`에서 data를 꺼낸다. miod PR7에 이미 구현된 unwrap을 유지한다.
2. `GET /api/v1/scenes?pack=ko&characterId=girlfriend` 또는 `characterId=professor`에서 `source=curriculum`, `nodeCount=8`인 장면을 선택한다. 첫 회차는 각각 **`gf-1-1`**, **`prof-1-1`**이다. 모든 공개 예시를 첫 항목으로 선택하면 1~3회짜리 짧은 예시가 선택될 수 있다.
3. 시작 요청에 `aiMode:"live"`, 선택 언어를 명시한다. 서버는 새 교육과정·개인 생성 장면을 live로 고정한다.
4. UI의 마지막 발화 판단은 로컬 `turns.length`가 아니라 `session.nodeCount/nodeIndex/status`와 `result`를 사용한다. 사용자 답변이 적절하게 통과하면 다음 노드로 진행하며, △는 서버 progression에 따라 진행 또는 재도전하고, 모국어 도움·정정은 같은 노드에서 재도전한다. 8개 노드를 모두 통과하거나 체력이 소진돼야 종료된다.
5. API 실패 시 로컬 대본·가짜 STT·가짜 결과로 전환하지 않는다. 입력·세션·clientTurnId를 유지하고 오류와 재시도를 표시한다.

현재 8회 교육과정은 여자친구·교수용이다. 친구·부장 및 영어팩의 기존 짧은 예시는 그대로 별도 제공한다. 이 예시까지 8회 콘텐츠로 만들어졌다고 가정하지 않는다.

## 선택 언어 자막과 음성

```http
POST /api/v1/sessions
Authorization: Bearer <Malo accessToken>
Content-Type: application/json

{
  "sceneId": "gf-1-1",
  "aiMode": "live",
  "personalityId": "strict",
  "subtitleLanguage": "en"
}
```

`personalityId`: `strict/playful/calm`. 기존 FE 값 `picky/tease/calm`은 각각 `strict/playful/calm`으로 매핑한다. 기본 교육과정은 공통 대본을 사용하고 실시간 반응·판정에 선택 성격을 전달한다. 개인 생성은 생성 시 정한 성격을 유지한다.

`subtitleLanguage`: `en/ja/zh/vi/es/id/ko`. 기존 `useStore().lang`을 전달하며 초기값은 `en`이다. 한국어팩이면 대사는 계속 한국어이고, 자막만 선택 언어로 제공한다. 자막을 받기 위해 영어팩으로 바꾸지 않는다.

시작 응답의 주요 필드:

```ts
{
  data: {
    id: "세션 UUID",
    aiMode: "live",
    nodeCount: 8,
    nodeIndex: 0,
    npc: {
      text: "한국어 원문",
      subtitle: {language: "en", text: "English subtitle"},
      audioUrl: "https://.../api/v1/audio/a_...?token=...",
      action: "캐릭터 행동",
      cues: [{k:"표정",v:"관찰 가능한 단서"}]
    }
  },
  meta: {requestId:"...",apiVersion:"v1"}
}
```

`npc.text` 아래 `npc.subtitle.text`를 함께 표시한다. `audioUrl`은 **그 npc.text를 읽는 한국어 음성**이다. 자막 언어를 영어로 선택해도 음성을 영어로 바꾸지 않는다. 화면·TTS에 넣을 텍스트를 별도로 조립하지 않는다.

사용자 답변의 `/sessions/{id}/turns` 응답은 다음 두 대사를 구분한다.

| 응답 | 의미 | 연결 |
|---|---|---|
| `turn.npcReply` | 사용자의 방금 답에 대한 실제 AI 반응 | `turn.npcReplySubtitle.text`와 `turn.audioUrl`을 함께 표시·재생 |
| `session.npc.text` | 다음 학습 노드의 대사 | 피드백을 닫은 뒤 해당 `npc.subtitle`와 함께 표시 |

반응 대사를 보여주면서 현재 NPC용 `/speech {}`를 호출하면 **다음 노드의 다른 대사**가 재생될 수 있다. 현재 반응은 함께 받은 `turn.audioUrl`을 사용한다. 재발급·다시 듣기는 아래 요청을 사용한다.

```http
POST /api/v1/sessions/{id}/speech
Content-Type: application/json

{"turnId":"해당 turn.id"}
```

다음 노드의 음성은 같은 경로에 `{}`를 보내 준비한다. 다음 버튼을 누르기 전 피드백을 보는 동안 미리 가져올 수 있다. 수신한 음성을 로드한 뒤 대사·자막 표시와 재생을 같은 흐름에서 시작한다. 캐릭터 이미지 전환은 해당 대사·반응의 render 필드에 맞춘다. iOS 등 브라우저의 자동 재생 제한이 있으면 기존 듣기 버튼으로 사용자 동작을 받아 재생한다.

서명 URL은 10분 유효하다. 만료되면 다시 `/speech`로 발급받는다. 음성 생성이 일시적으로 실패하면 `audioUrl=null`일 수 있으므로 대사는 유지하고 다시 듣기를 제공한다. 자막은 세션의 기본 대본·분기용으로 한 번 생성한 뒤 재사용하며, 실시간 반응 자막은 채점과 같은 AI 호출에서 생성한다.

## 추가 연결 확인

- `hint`에는 `{step:1}` 또는 `{step:2}`를 보낸다. step1 응답의 속마음·tip이 null인 것은 정상이다. step2 응답을 실제로 화면 상태에 저장한다.
- `retry/pause/speech` POST에는 빈 body 대신 `{}`를 보낸다.
- 같은 답변의 전송 재시도는 같은 clientTurnId를 유지한다. 고친 답변은 새 ID로 보낸다.
- FE의 `views:[]`와 가짜 속도·망설임 문구를 서버 필드로 교체한다.
- 생성중 카드·폴링·PWA 알림·DB 카탈로그 전체 교체 등 나머지 작업은 [전체 인수인계](FE_INTEGRATION.md)를 따른다.

## 배포와 접속

FE 접속: **https://inthon-demo-20261031-dh.koreacentral.cloudapp.azure.com/**

BE 문서: **https://inthon-demo-20261031-dh.koreacentral.cloudapp.azure.com/api/v1/docs**

`feat/* → develop → main` 순서로 PR을 병합한다. main의 검사 통과 후 배포 릴리스가 생성되고 VM이 받아 적용한다. 병합 직후 즉시 바뀌는 것은 아니다. 외부 사용자는 HTTPS 주소로 접속하며, VM의 8080은 내부 리스너다.

배경 이미지는 BE에서 흐림 처리하므로 FE에서 다시 블러를 적용하지 않는다. 캐릭터 이미지·텍스트는 선명하게 유지한다. GLB 구현은 제외하며 [이미지 전환 요청사항](CHARACTER_IMAGES.md)을 따른다.

상황 안내와 O·△·X·? 판정, 완료 상세 보고서는 [최신 통합 계약](FE_INTEGRATION.md#상황-안내판정상세-보고서-계약)을 따른다. 다음 노드의 `npc.audioUrl`이 null이면 `/sessions/{id}/speech {}`로 해당 현재 대사의 음성을 발급한다. 반응 대사는 반드시 turn.audioUrl 또는 speech {turnId}를 사용한다.
