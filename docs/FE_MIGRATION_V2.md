# FE Migration V2 — 엔딩 대사·정리 카드·추가 감정 이미지

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

`GET /chapters`의 CH 0는 성격 3종을 합쳐 **한 에피소드**로 내려준다. 성격은 `/sessions`의 `personalityId`로 고른다. 과거 어떤 성격으로 완료했어도 완료 기록을 유지한다. 실제 커리큘럼·개인 생성 챕터를 제목으로 중복 제거하면 안 된다. BE는 조회·쓰기 요청 한도를 분리하고 429에 `Retry-After` 초와 기다릴 시간을 제공한다.

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

