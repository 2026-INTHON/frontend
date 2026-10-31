# FE Migration V2 — 엔딩 대사·정리 카드·추가 감정 이미지

## 챕터 순서 및 대화 흐름 (2026-11-01)

`GET /chapters`가 잠긴 챕터와 열린 챕터를 함께 정렬해 캐릭터별 1번부터 연속된 `no`/`displayLabel`을 반환한다. FE는 별도 번호 계산이나 잠금 기준 재정렬 없이 서버 순서를 사용한다. 챕터·서브챕터 ID, 잠금과 완료 기록은 유지된다. 개인 생성 챕터는 공개 커리큘럼 다음에 놓인다.

서윤: 첫 만남 → 카카오톡 약속 → 함께 점심 → 첫 나들이 → 주말 데이트 → 썸에서 연인으로 → 연락과 서운함 → 친구 소개 → 기념일. 기존 `CH 0`도 이 순서에 포함되며 더 이상 별도 0번으로 표시하지 않는다. 각 소개는 한 문장으로 줄이고 기존 선택 언어 번역 필드를 사용한다.

실시간 대사는 사용자 제안에 먼저 수락·거절로 답한 뒤 자연스럽게 학습 주제로 이어간다. 합의한 장소·행동을 다시 물어보거나 다른 활동으로 바꾸지 않는다. FE는 서버 `npcReply`를 그대로 사용한다.

결과의 지표 이름·버튼·짧은 안내도 UI 선택 언어(한국어·영어·일본어·중국어)로 표시한다. 한국어 원래 대사와 학습 예문은 유지한다.

## 간결한 다국어 보고서 (2026-11-01)

`GET/POST /sessions/{id}/report?language=ko|en|ja|zh`와 `POST /sessions/{id}/report/retry?language=...`에 **현재 UI 선택 언어**를 보낸다. 학습 pack은 계속 ko다. 서버는 `report-v2-concise`와 언어별로 보고서를 캐시하며 기존 긴 v1 보고서는 새 형식으로 준비한다. 생성 중에는 다른 학습을 계속할 수 있다.

- 종합: 한 줄 요약 + `strengths`(잘한 점), `improvements`(개선할 점), `shortcomings`(아쉬운 점), `culturalTakeaways`(문화 팁). 섹션별 최대 두 개의 짧은 문장.
- 대화별: `details[].coaching`에 같은 세 가지 피드백 배열, `implicitIntent`, `culturalContext`, 한국어 `alternativeExpression`을 제공한다. 재시도도 각각 별도로 분석하며 점수나 기존 판정을 변경하지 않는다.
- FE는 각 대화를 독립적으로 펼치는 카드로 표시한다. 설명·섹션 제목은 선택 언어만, 실제 한국어 대사·추천 표현은 원문으로 표시한다. 과거 `feedback`, `praise`, `evaluation.reason`을 설명으로 중복 렌더링하지 않는다.
- 언어 변경 시 이전 언어 응답을 폐기하고 새 보고서를 요청한다. 보이지 않는 탭에서는 조회를 멈추며 요청이 겹치지 않게 완료 후 4초 간격으로 조회한다.

2026-11-01 교수 음성 장애: 생성기 자체 오류가 아니라 서버 내부 Typecast 일일 4,000자 제한 도달이었다. 무료 플랜·결제 수단 없음·잔여 9,623크레딧을 확인한 후 운영 `MALO_TYPECAST_TTS_DAILY_CHAR_LIMIT`만 8,000으로 조정했다. 공급자 월 한도·결제 설정은 변경하지 않았다. FE는 `DAILY_QUOTA_EXCEEDED`를 보존해 선택 언어로 한도 안내를 표시하고 자막 대화를 계속 허용한다. 캐시 재생은 신규 생성량에 포함되지 않는다.

## 실제 대화 맥락·말투 유지 (2026-11-01)

- FE live 엔진은 응답의 `turn.npcReply`를 표시하고, 이어지는 대화도 `session.npc.text`를 그대로 사용한다. 로컬 대본으로 덮어쓰지 않는다. △·?에서도 서버가 생성한 실제 후속 질문을 이어 간다.
- `session.npc.speechLevel`, `turn.npcSpeechLevel`은 `polite | casual`이다. FE `Line.speechLevel`로 전달하며 화면에 별도 배지를 강제하지 않는다. 기존 응답에는 없어도 정상 작동한다.
- BE는 시작 말투와 합의한 변경을 저장한다. '말투 변화' 챕터 제목, 사용자의 반말, 다음 대본만으로 캐릭터가 반말로 전환하지 않는다. 명시적으로 다시 말하기를 누르면 당시 질문과 말투를 복구한다.
- AI는 실제 질문·답변·최근 12개 대화와 인물 프로필을 우선한다. 다음 대본의 완성된 문장을 실시간 입력에서 제거했다. '담백한 음식 좋아하세요?'에는 취향을 답하고, '다음에는 미리 알려줄게'라는 약속을 받았다면 다시 같은 약속을 요구하지 않는다.
- 이 변경은 FE 타입·실시간 엔진에도 반영했다. 기존 API의 텍스트·선택 언어 자막·TTS 동기화, 자발적으로 여는 피드백 모달 동작을 유지한다.

2026-11-01 재생·운영 수정: 데모 대사도 `POST /api/v1/speech/preview`로 같은 캐릭터 음성을 받는다. `{text,pack,characterId,personalityId,emotion}`을 보내며 인증·기존 TTS 한도·캐시가 적용되고 학습 기록은 만들지 않는다. 오프라인에서는 대사와 다시 듣기를 제공하고 기기 나레이션으로 조용히 대체하지 않는다. `demo`·언어·캐릭터·성격이 바뀌면 열린 장면도 새 엔진으로 시작한다. 실학습 기본값은 live이고 운영 mock 채점은 차단한다.

배포 시 정적 JS/에셋은 VM 공유 저장소에 이전 버전과 함께 보존한다. 앱 HTML은 no-store, 없는 정적 파일은 HTML 대신 404를 반환한다. Google 운영 Site URL과 `/auth/callback` 허용 주소도 실제 HTTPS 도메인을 사용한다.

여자친구·교수 음성은 Typecast SSFM 3.1을 사용한다. 아래 조합으로 고정하며 감정은 같은 목소리의 프리셋·강도로 표현한다. `TYPECAST_API_KEY`는 BE·AI GitHub Actions Secrets에 보관하고 AI 서버에서만 사용한다. FE에는 키를 전달하지 않는다.

| 캐릭터 | UI 성격 | FE / API 값 | 음성 |
| --- | --- | --- | --- |
| 여자친구 | 발랄 | tease / playful | 아린 |
| 여자친구 | 까탈 | picky / strict | 예은 |
| 여자친구 | 차분 | calm / calm | 나윤 |
| 교수 | 기본 | calm / calm | 재선 |
| 교수 | 까탈 | picky / strict | 라연 |
| 교수 | 친절 | tease / playful | 승연 |

기쁨→happy, 분노→angry, 슬픔→sad, 경멸→tonedown, 울먹임→sad 강도 증가. 혼란은 tonedown 강도를 낮춘다. 캐시 버전 `selected-voice-v2`와 목소리·감정을 함께 구분하므로 기존 대사도 새 음성 URL을 받는다. 음성을 영구 저장하지 말고 서버의 새 `audioUrl`을 사용하며 만료/재생 실패 시 `/speech`로 다시 받는다.

2026-11-01 재진입 수정: 토큰 최초 로딩·게스트 생성·토큰 갱신은 동시에 여러 화면이 요청해도 한 번만 실행한다. 같은 장면·성격·자막 언어의 진행 중인 시작 요청을 공유하고, 떠난 화면의 늦은 응답은 폐기한다. 장면 시작은 자막·TTS 준비를 기다리도록 최대 120초를 허용하며 실패 시 사용자가 재시도한다. 이 시간은 실시간 답변의 3~5초 목표와 별개다.

`GET /chapters`의 기존 예시 챕터(`ko-girlfriend` 등)는 성격 3종을 합쳐 **한 에피소드**로 내려준다. 성격은 `/sessions`의 `personalityId`로 고른다. 과거 어떤 성격으로 완료했어도 완료 기록을 유지한다. 실제 커리큘럼·개인 생성 챕터를 제목으로 중복 제거하면 안 된다. BE는 조회·쓰기 요청 한도를 분리하고 429에 `Retry-After` 초와 기다릴 시간을 제공한다.

홈 기록 동기화는 안정적인 `store.set` 콜백을 사용한다. `/wallet`, `/mistakes`, `/records`, `/home` 응답을 저장할 때마다 콜백이 바뀌어 재조회를 반복하던 원인을 제거했다. 화면 진입·앱 복귀 시에는 동기화하며, 서버 요청 제한을 올리거나 우회하지 않는다.

데모에서 저장된 `seoyun-weekend` 같은 이어하기 링크는 live 진입 시 선택한 성격의 서버 예시 ID로 변환한다. 서버에서 받은 교육과정·개인 장면 ID는 그대로 사용한다.

2026-11-01. BE·AI의 엔딩 응답과 FE의 재생·운영 수정 내용을 정리한다. 전체 학습·생성·인증 계약은 [FE Integration](FE_INTEGRATION.md)을 따른다.

## 먼저 연결할 것

| 항목 | 서버 값 | FE 동작 |
|---|---|---|
| 엔딩 종류 | `result.ending.kind` | happy/bad 스토리 연출 결정 |
| 마지막 캐릭터 대사 | `ending.dialogue` | 원문·선택 언어 자막 표시, 마지막 turn 음성 재사용 |
| 마지막 표정·몸짓 | `ending.render` | 서버가 선택한 이미지 그대로 표시 |
| 엔딩 정리 카드 | `ending.recap` | 제목·상황 정리·코멘트·다음 행동 문장 표시 |
| 재접속·독립 결과 화면 | `GET /sessions/{id}/ending` | 본인 엔딩을 다시 불러오기 |
| 학습 성과 | `result.passed/score/achievement`, `turn.evaluation.mark` | 스토리 결말·캐릭터 감정과 분리해 표시 |

**표시 순서:** 마지막 반응 대사(+자막·음성·이미지) → 엔딩 정리 카드 → 다음 학습/재도전/상세 보고서.

최종 `result`가 있거나 세션이 succeeded/failed이면 다음 NPC 노드를 시작하지 않는다. 종료된 `session.npc.text`를 마지막 반응 대사처럼 재생하지 않는다.

## API 주소와 시작 요청

호스트는 `https://inthon-demo-20261031-dh.koreacentral.cloudapp.azure.com`, 아래 경로의 공통 접두사는 `/api/v1`이다. 성공 응답은 `{data,meta}`다. 기존 unwrap·Malo Bearer 토큰을 사용한다.

```json
{
  "sceneId": "gf-1-1",
  "aiMode": "live",
  "personalityId": "calm",
  "subtitleLanguage": "en"
}
```

`POST /sessions`에 선택한 언어를 반드시 보낸다. 지원 언어는 en/ja/zh/vi/es/id/ko다. 한국어 학습 대사·음성은 계속 한국어이며 번역만 선택 언어다. 대화 전 `session.briefing`과 번역을 읽은 후 시작한다.

## 엔딩 조회

`GET /sessions/{sessionId}/ending` — 본인 세션의 완료 엔딩. 추가 생성 요청 body가 없다. 진행 중은 409 `ENDING_NOT_READY`, 본인 세션이 아니면 404다. 이 조회가 새 LLM·TTS 생성을 시작하지 않는다.

동일한 객체가 최종 턴 응답의 `result.ending`과 `GET /sessions/{id}/result`의 `ending`에도 들어 있다.

```ts
type Ending = {
  id: string;                    // happy / deferred / breakdown 등 서버 ID
  kind: 'happy' | 'bad';
  title: string;
  text: string;                  // 실제 결말을 정리한 문장
  emotion?: 'neutral'|'happy'|'confused'|'sad'|'angry';
  render: CharacterRender | null;
  dialogue: {
    turnId: string;
    text: string;                // 실제 마지막 캐릭터 반응 대사
    subtitle: {language:string; text:string} | null;
    audioUrl: string | null;
  } | null;
  recap: {
    title: string;
    story: string;               // 상황을 정리하는 스토리 문장
    comment: string;             // 실제 판정·결말에 맞는 학습 코멘트
    prompt: string;              // 계속 학습 / 재도전 제안
    translation: {
      language:string;
      title:string; story:string; comment:string; prompt:string;
    } | null;
  } | null;
};
```

정리 카드는 `recap.translation`이 있으면 선택 언어 문장을 우선하고 한국어 원문을 함께 보여줄 수 있다. 예전 기록이나 subtitleLanguage를 보내지 않은 세션은 번역이 null일 수 있다. 빈 값이나 임의 번역으로 채우지 않는다.

원문 결말과 코멘트 번역은 시작 시 대사·상황 번역과 함께 준비한다. 종료 직후 별도 요약 생성 화면을 기다릴 필요가 없다. 재조회해도 스토리·판정·보상이 다시 생성되지 않는다.

## 대사·음성 연결

최종 턴의 `turn.npcReply`, `turn.npcReplySubtitle`, `turn.audioUrl`은 같은 반응이다. 이 음성 URL이 생성됐으면 같은 최종 응답의 `ending.dialogue.audioUrl`에도 제공한다.

GET 엔딩 응답의 audioUrl은 null이며, 저장된 대사·이미지·정리 카드를 바로 반환한다. 이미 받은 마지막 turn 오디오를 재사용하거나 아래 요청으로 다시 듣기를 발급한다.

```http
POST /sessions/{sessionId}/speech
Authorization: Bearer <Malo accessToken>
Content-Type: application/json

{"turnId":"ending.dialogue.turnId"}
```

turnId에는 ending.dialogue.turnId의 실제 UUID를 넣는다. 10분 유효한 audioUrl을 받아 해당 대사와 함께 재생한다. 끝난 세션에서 `/speech {}`를 보내면 마지막 반응이 아닌 대본의 NPC 대사가 나올 수 있으므로 turnId를 사용한다. 음성이 실패하면 원문·자막은 유지하고 다시 듣기를 제공한다.

## 추가 이미지 네 장

`GET /assets/characters`로 미리 받는다. 현재 여자친구 13개·교수 11개·친구 5개·부장 5개, 총 34개 항목이다. DB 업로드분 24개 중 하나는 같은 파일의 별칭이므로 고유 업로드 파일은 23개다.

| 인물 | 표현 | emotion | reaction / assetKey 끝부분 |
|---|---|---|---|
| 여자친구 | 경멸 | angry | contempt |
| 여자친구 | 강한 분노 | angry | furious |
| 교수 | 분노·단호한 지적 | angry | furious_pointing |
| 여자친구 | 슬픔·눈물 | sad | sobbing |

새 네 항목은 `endingPreferred=true`다. `emotion`은 호환용 5종을 유지하고 경멸은 `reaction=contempt`로 세분화한다. `render`에도 reaction/label/pose가 선택적으로 포함된다. 경멸이라는 새 학습 판정이나 Emotion enum을 만들 필요가 없다.

FE는 감정이나 키 문자열로 URL을 조립하지 않고 `ending.render.imageUrl`을 표시한다. 상대 URL은 기존 absUrl 처리, Supabase의 절대 URL은 그대로 사용한다. 과거 기록에서 ending.render=null이면 마지막 turn.render → session.npc.render 순으로 대체한다.

원본 네 장은 픽셀·포즈·불투명 배경을 보존한 무손실 WebP다. 투명 배경이라고 가정하지 않는다. 자세한 이미지 계약은 [Character Images](CHARACTER_IMAGES.md)를 따른다.

## 감정별 대사와 정리 코멘트

중간 반응은 AI가 현재 맥락에 맞게 생성한다. 체력 소진으로 확정된 한국어 실패 엔딩은 감정·이미지에 맞는 검수된 마무리 대사를 서버가 선택한다. 안전 문제의 맥락에 따른 AI 반응과 영어팩은 해당 생성 대사를 사용한다. 아래는 말투 기준이며 FE가 임의로 대사를 교체하지 않는다.

| 감정 | 말투 예시 |
|---|---|
| 경멸 | “뭐야, 이 사람. 이상한 사람 아니야?”처럼 차갑게 거리를 두는 반응 |
| 분노 | “뭐, 너 뭐라고 했어? 장난해?”처럼 짧고 날카로운 반응 |
| 슬픔·울음 | “어떻게 그런 말을 할 수가 있어? 정말 너무해.”처럼 상처받은 반응 |

교수는 관계에 맞게 “지금 뭐라고 했나요? 그런 태도로는 면담을 이어가기 어렵겠어요.”처럼 변주한다. 경찰 신고 언급은 실제 위협·스토킹 등 맥락이 있는 경우에만 사용한다. 단순 문법 실수·정중한 이견·거절만으로 강한 위협 반응을 붙이지 않는다. 코칭 사유는 실제 표현을 설명하는 존중하는 말투를 유지한다. 체력 소진으로 확정된 한국어 엔딩의 감정별 마무리 대사도 시작 시 번역하므로 원문·자막·TTS가 같은 문장을 따른다.

정리 문장은 스토리의 결말 대본과 실제 기록을 사용한다. 체력 소진 종료에서는 고정 대본이 실제 발화와 어긋나지 않도록 경멸·분노·슬픔의 실제 종료 상태에 맞는 문장을 제공한다. 첫 만남은 다음 대화의 약속, 관계 확인은 그 관계의 결말처럼 해당 상황을 정리한다. 모두 O였던 여자친구 해피엔딩은 “좋은 인상을 남긴 당신! 상황에 맞는 답변만 쏙쏙…” 같은 코멘트, 그 외 성공은 학습 과정을 인정하는 코멘트, 실패는 단서·표현을 되짚고 재도전하도록 돕는 코멘트를 제공한다.

`kind=bad`이면서 `result.passed=true`일 수도 있다. 정중하게 말했지만 요청이 보류되는 등 스토리 결과와 학습 성과가 다른 경우다. FE가 결말 종류로 점수를 재계산하거나 X를 표시하지 않는다.

## 버튼과 상세 보고서

- 계속 학습: `result.nextSceneId`가 있으면 같은 언어로 새 세션 시작, 없으면 챕터 목록으로 이동.
- 다시 도전: `POST /sessions/{id}/retry {}`로 새 세션 시작. 기존 결과를 덮어쓰지 않음.
- 자세히 보기: `result.report.status`와 `GET /sessions/{id}/report` 사용. queued/running은 분석 중으로 표시하고 엔딩 카드와 다른 학습은 계속 허용.
- 대사별 O·△·X·?: `turn.evaluation.mark/reason/reasonSubtitle` 사용. 캐릭터 표정·경멸·눈물 이미지와 분리.

검증: 정상 해피엔딩, 정중한 보류, 체력 소진 종료의 이미지·판정 분리 및 엔딩 API 소유권·진행 중 409·번역·과거 기록 호환을 자동 검사한다. 모바일의 실제 재생·화면 전환은 FE에서 기기 검증한다.



## 배포 및 실제 API 확인

2026-11-01 기준 BE·AI 운영 배포 완료. 여자친구·교수의 실제 실패 엔딩과 정상 해피엔딩을 live 모드로 완료해 영어 자막·정리 카드·등록된 종료 이미지를 확인했다. 두 실패 엔딩의 마지막 음성 파일도 내려받아 확인했다. 자동 검사는 BE 23개·AI 23개가 통과했고, 진행 중/다른 사용자 접근과 정중한 보류의 판정·감정 분리도 포함한다. 실제 모바일 화면 전환과 음성 재생 버튼 연결은 FE 작업이다.
# 2026-11-01 캐릭터별 프로필과 카드 뒤집기

- PR #23은 main `9b2de694`에 포함되었고 11월 1일 04:38 KST에 배포되었다. develop의 CI는 검사만 실행하며 실제 배포는 검증된 main 릴리스를 따른다.
- 홈은 제공된 화면처럼 배경·캐릭터 위에 흰 정보 카드가 겹치는 배치로 맞췄다. 검은 상태 태그 → 장면 제목 → 캐릭터·성격·실제 상태 → 진행 막대 순서다. 막대는 저장된 대화 위치로 계산하며 완료한 장면은 100%, 새 다음 장면은 0%다. 하단 두 바로가기와 시작 버튼을 유지하고 작은 화면에서는 스크롤할 수 있다.
- 홈 캐릭터 영역 우측 상단 44px 원형 버튼으로 프로필을 열고 닫는다. 흰색 반투명 패널 안에서 스크롤하며, 뒤쪽 캐릭터의 장면 시작 동작은 잠긴다. 하단 장면 카드와 탐색은 유지한다. 웹 Escape로 닫을 수 있다.
- `GET /api/v1/characters` → 선택 캐릭터의 `personalities[]`에서 선택한 유형의 `profile`을 표시한다. FE `seoyun/prof/junho/boss`와 `tease/picky/calm`은 기존 SERVER_CHAR / SERVER_PERSONA 매핑을 사용한다.
- 공개 필드: `age`, `role`, `occupation`, `introduction`, `relationship`, `traits`, `likes`, `dislikes`, `hobbies`, `values`, `speakingStyle`, `sampleLines`. `profileRevision`으로 설정 버전을 확인한다.
- 로딩·누락·실패는 명시적으로 표시하고 다시 불러오기를 제공한다. 캐릭터/유형 전환 시 이전 프로필을 보여주지 않는다. 이전 대화의 유형이 현재 선택과 다르면 해당 대화를 자동으로 이어가지 않는다.
- 원본은 BE `src/personas/{girlfriend,professor,friend,manager}.json`. 카드 정보와 실시간 AI 답변·신규 챕터 생성이 같은 원본을 사용한다. 상세 편집법은 해당 디렉터리 README 참고.
- 프로필 내용은 수정 가능한 가상 인물 초안이다. 좋아하는 것이 다르다는 이유로 X 판정을 하지 않는다. 기존 DB 고정 대본은 이 배포로 재작성하지 않는다.

## 성격 선택 포토카드

- `GET /api/v1/assets/characters`의 기존 이미지 사용. `tease`(발랄/활발/친절)는 미소, `picky`는 가벼운 찡그림, `calm`은 기존 번들 사진 유지.
- 서윤: `delighted` / `displeased`. 교수: `pleased` / `stern`. 친구·부장은 기존 `happy` / `angry` 에셋의 가벼운 표정 사용.
- `endingPreferred` 이미지는 제외. 목록이나 이미지 로드 실패 시 원래 사진으로 유지하며 성격 선택을 막지 않는다. 추가 생성 비용은 없다.

## 한국어팩과 사용자 설명 언어

- 영어 **학습팩**은 비활성화. 영어 **설명·자막**은 계속 지원한다. `GET /packs`는 한국어만 반환하며 영어팩으로 새 학습/생성을 요청하면 `422 PACK_DISABLED`.
- 온보딩은 한국어 / 日本語 / English / 中文 4개 언어를 국기와 함께 표시한다. 첫 선택 여부를 별도 저장해 기존 사용자도 한 번 확인한다. 설정에서 같은 화면을 다시 열 수 있다.
- `GET /chapters?pack=ko&characterId=...&language=ja`처럼 선택 언어를 보낸다. `chapter.translation.{language,title,desc}`와 `subs[].translation.{language,title}`를 표시한다. 원본 ID와 한국어 텍스트는 유지된다.
- 세션 생성 및 `/sessions/{id}/retry`에 `subtitleLanguage` 전달. `briefing.translation`의 상황·목표·상대, `npc.subtitle`, `turn.npcReplySubtitle`, `evaluation.reasonSubtitle`은 선택 언어로 표시하며 한국어 대사는 보존한다. 한국어 선택이면 중복 번역 자막은 숨긴다.
- 힌트는 세션의 선택 언어로 반환한다. 번역은 AI 서버에서 문구·언어별 저장 캐시를 사용한다. 최초 번역은 시간이 걸릴 수 있어 로딩·재시도를 제공한다. 다른 언어의 캐시 자막을 대체 표시하지 않는다.
- 새 로그인과 게스트 시작 모두 언어 선택을 거친다. 게스트 시작은 실제 API 모드이며, 명시적 데모 스위치와 구분한다.
- 진입 소개는 선택한 **설명 언어만** 표시한다. 상황·학습 목표 제목도 해당 언어로 표시하며 한국어 원문을 중복 배치하지 않는다. BE `src/data/briefings.json`에서 기본 교육과정 32개와 짧은 예시 7종(성격 변형 포함 53개 한국어 스테이지)의 상황·목표를 각 한 문장으로 관리한다. AI가 참고할 상세 원문과 고정 대사는 보존한다. 새 사용자 시나리오 생성도 이 짧은 소개 형식을 따른다.

## 대화를 막지 않는 피드백과 실제 대사 유지

- 하단 자동 피드백 가이드를 제거했다. 답변 후 우측 상단 O/△/X/? 배지만 갱신하며, 눌렀을 때만 피드백 모달을 연다. 모달에서 이유·대안·다시 말하기를 제공한다.
- 일반 답변 후 입력은 계속 열려 있다. 1.6초 뒤 고정 대사로 바꾸는 타이머는 제거했다. `turn.npcReply`는 사용자가 다음에 답할 실제 대사이며, BE가 이를 `session.npc.text`에 저장한다. X/?도 캐릭터의 질문/반응으로 이어지고 원 대사를 반복하지 않는다.
- AI는 현재 답변과 다음 학습 목표를 함께 받아 자연스럽게 연결한다. 고정 대본은 목표와 분기 참고 자료이며, 사용자가 말한 시간·취향·거절 등을 덮어쓰지 않는다. 학습 진척은 기존 판정 정책(O, 목표 달성 △)을 유지한다.
- 사용자가 요청한 다시 말하기: `POST /sessions/{id}/correction`에 `{turnId}` 전달. 최신 답변의 실제 질문으로 돌아가고, 응답 `Session`을 적용한다. 소유자만 가능하며 종료된 세션/오래된 turn은 409. 기록·차감 체력은 보존하고 결과 점수는 체크포인트별 최종 답변 한 번만 계산한다.
- `turn.prompt`에는 사용자가 실제로 들은 질문·행동·단서를 보관한다. 상세 보고서와 오답 재연습도 고정 대본 대신 이 질문을 사용한다.
- 종료된 장면의 다시 말하기는 장면 전체 재시작이다. 마지막 대사가 재생되는 동안에는 결과로 넘기지 않는다.


## 2026-11-01 추가: 짧은 프로필·표정 반응·대화 종료

### 프로필 카드 API

`GET /api/v1/characters/{characterId}/personalities/{personalityId}/profile?language=ko`

인증 없이 조회할 수 있습니다. `language`는 사용자의 설명 언어(ko/en/ja/zh)를 전달합니다. 캐릭터 이름은 고유 이름을 유지하고 나머지 항목을 번역합니다. 응답은 공통 `{ data: ... }` 래퍼를 사용합니다.

```json
{
  "characterId": "girlfriend",
  "personalityId": "calm",
  "personalityName": "차분",
  "language": "ko",
  "revision": "2026-11-01-v2",
  "profile": {
    "name": "서윤",
    "occupation": "시각디자인 전공 대학생",
    "age": "24세",
    "hobbies": ["독립서점 탐방", "필름 사진", "독서"],
    "favoriteFoods": ["따뜻한 국수", "스콘"],
    "dislikes": ["대답 재촉", "감정 단정"],
    "currentInterests": ["필름 사진", "독립출판물"]
  }
}
```

- `/characters`의 각 `personalities[]`에도 한국어 원본 `cardProfile`이 추가됩니다. 기존 `profile`은 호환성을 위해 유지하지만 카드에서는 짧은 항목 API를 사용하세요.
- 배열은 칩 또는 ` · `로 연결할 수 있습니다. 카드 항목 순서/레이아웃은 FE가 자유롭게 선택할 수 있습니다.
- 캐릭터/성격/언어 변경 시 이전 응답을 버리세요. 오류는 재시도할 수 있고, 다른 언어의 프로필로 대체하지 않습니다.
- 상세 성격·말투 프롬프트는 BE의 `src/personas/*.json`에 유지됩니다. 카드용 프로필도 같은 파일에서 성격별로 편집합니다.

### 감정 이미지와 효과

현재 대사는 `session.npc.render.imageUrl`, 답변 직후 반응은 `turn.render.imageUrl`을 표시합니다. 학습 심볼 O/△/X/?로 표정을 추측하지 말고 `turn.emotion`을 사용하세요. 현재 DB 이미지는 투명 배경 WebP입니다.

이 FE 변경에는 서버 이미지 연결, 새 이미지 사전 로딩, 짧은 등장 효과, 캐릭터 오른쪽의 감정 말풍선과 효과음이 포함됩니다. 효과음은 기기별로 저장되는 `soundEffects` 설정을 따르며, 대사 다시 듣기로 효과를 반복 재생하지 않습니다. 모션 감소 설정에서는 움직임을 없앱니다.

### 대화 종료

마지막 두 발화 구간에서 작별 인사에 자연스럽게 응답하면 BE가 대화를 완료할 수 있습니다. `네! 조심히 들어가세요!`처럼 짧은 인사로도 종료할 수 있으며, 이미 합의한 다음 만남 주제를 다시 말하도록 요구하지 않습니다. 부적절한 답변·의미 불명·모국어 재도전은 이 종료 조건을 통과하지 않습니다.

FE는 문장 키워드로 종료를 추측하지 않고 기존대로 `session.status`와 `result`를 따릅니다. 마지막 음성이 끝난 뒤 결과 화면으로 이동합니다. 학습 도중의 답변은 계속 비차단 피드백 배지로 표시합니다.
