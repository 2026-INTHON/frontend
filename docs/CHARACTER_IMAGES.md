# 캐릭터 표정과 몸짓 이미지 연결 요청

> 최신 엔딩 API·정리 카드·추가 감정 이미지 연결은 [FE Migration V2](FE_MIGRATION_V2.md)를 먼저 확인하세요.

캐릭터는 GLB·리깅 대신 **미리 생성한 동일 인물의 이미지 여러 장을 전환**한다. BE/AI가 가상의 캐릭터 감정·몸짓을 판정하고, BE가 실제로 존재하는 이미지 중 하나를 선택해 FE에 보낸다. FE 앱 소스 수정은 이 문서에 포함하지 않는다.

## 미리 받을 이미지 목록

`GET /api/v1/assets/characters` → `{data:{renderMode:"image_variants",runtimeImageApiCalls:false,items:[...]},meta}`

```ts
type Variant = {
  assetKey: string;
  characterId: 'girlfriend'|'friend'|'manager'|'professor';
  emotion: 'neutral'|'happy'|'confused'|'sad'|'angry';
  gesture: 'idle'|'nod'|'tilt'|'thinking'|'open_hand'|'arms_crossed';
  imageUrl: string|null;
};
```

현재 **여자친구 13개·교수 11개, 친구·부장 각 5개 = 34개 이미지 항목**이다. 교수 이미지 하나는 같은 파일을 가리키는 별칭이므로 DB 업로드분의 고유 파일은 23개다. 실제 파일 URL의 접근도 확인했다. nod 같은 코드가 있다고 모든 캐릭터의 해당 몸짓 이미지가 있다는 뜻은 아니다.

처음에는 선택 캐릭터의 이미지 URL만 우선 prefetch하고, 나머지는 이후에 불러온다. 실제 이미지 URL은 콘텐츠 해시를 사용하므로 캐시하고 재사용할 수 있다. 앱이 시작하거나 한 턴 진행할 때마다 이미지 생성 API를 호출하지 않는다. 기존 `/assets/personas`도 기본 5표정용으로 유지한다.

## 대화 응답에서 고를 이미지

`session.npc.render`는 현재 대사용, `turn.render`는 사용자의 답에 대한 반응용 이미지다.

```ts
render: {
  characterId: 'girlfriend',
  requestedEmotion: 'happy',
  requestedGesture: 'nod',
  emotion: 'happy',
  gesture: 'idle',
  assetKey: 'characters/girlfriend/happy',
  imageUrl: 'https://.../api/v1/images/i_...'
}
```

위 예시는 nod 이미지가 아직 없어 같은 인물의 happy 기본 이미지를 선택한 경우다. FE는 요청 감정으로 URL을 직접 조립하지 않고, **render.assetKey 또는 render.imageUrl을 그대로 사용**한다.

BE의 선택 순서는 같은 캐릭터 안에서 `AI가 고른 유효한 같은 감정의 키 → 감정·몸짓 일치(기본 우선) → 같은 감정의 기본 이미지 → 같은 인물의 중립 이미지 → 해당 캐릭터 기본 이미지`다. 다른 캐릭터 이미지로 대체하지 않는다. 감정은 가상 인물의 연출 상태이며 사용자의 심리를 진단한 값이 아니다.

기존 대사 레이아웃에 캐릭터 이미지를 배치하고, 원문·자막·음성과 함께 전환한다. 대사 반응에는 turn.render, 다음 노드로 넘어갈 때에는 session.npc.render를 쓴다. 이전 대사 이미지가 뒤늦게 로드돼 현재 표정을 덮어쓰지 않도록 대사/turn ID가 바뀌었는지 확인한다.

배경 이미지는 BE에서 흐림 처리한 버전을 보내므로 추가 블러를 주지 않는다. 캐릭터·글자·버튼까지 함께 흐려지는 부모 View 블러는 사용하지 않는다. GLB 다운로드·본·모프·입모양 애니메이션 연결은 구현 범위에서 제외한다.

자막과 음성 필드 및 온보딩 8발화 연결은 [대화 API 요청사항](BE_SUBTITLE_AUDIO_HANDOFF.md), 나머지 FE 작업은 [전체 인수인계](FE_INTEGRATION.md)를 따른다.

## DB 원본과 상황별 선택

`malo_catalog`의 character 문서에 저장된 `imageVariants`를 우선 사용한다. 등록된 교수·여자친구는 기존 5표정 세트와 섞지 않는다. 각 항목의 `label`, `reaction`, `pose`, `useWhen`, `tags`, `defaultForEmotion`도 `/assets/characters`로 제공하며 `source=supabase_catalog`로 구분한다. 절대 Supabase Storage URL에 API 호스트를 다시 붙이지 않는다.

BE가 해당 캐릭터의 후보와 사용 조건을 AI에 전달한다. AI가 현재 반응·감정·몸짓에 맞는 키를 선택하고, BE는 후보·인물·감정 일치를 확인한 뒤 `turn.render`에 실제 선택을 넣는다. 교수의 시계 확인·자료 설명·격려, 여자친구의 수줍음·웃음·서운함 등을 같은 감정 안에서도 구분할 수 있다. 이미지의 `reaction`은 연기용 이름이며 학습 판정이 아니다. 예를 들어 `corrective`가 X를 뜻하지 않고 시계 확인이 화남을 뜻하지 않는다.

FE는 모든 선택 규칙을 다시 만들지 않고 `render.assetKey/imageUrl`을 표시한다. 시작·복귀의 `session.npc.render`, 답변 직후 `turn.render`를 사용한다. 같은 세트가 바뀌면 60초 캐시 후 반영하며, 카탈로그 재시드는 업로드 이미지·메타데이터를 보존한다. 신규 생성 API 호출은 없다. 새 DB 세트는 `/assets/characters`가 원본이며 `/assets/personas`는 기존 클라이언트 호환용이다.

학습 판정은 `evaluation.mark`의 O·△·X·?이며 캐릭터 감정과 독립적이다. 감정 이미지로 학습 판정을 대신 표시하지 않는다.

## 추가 감정 4종과 배드엔딩

새 원본은 무손실 WebP로 등록했다. 원본의 픽셀·포즈·불투명 배경을 보존했으므로 투명 PNG로 가정하지 않는다.

| 인물 | 표현 | 호환 emotion | reaction / 키 끝부분 |
|---|---|---|---|
| 여자친구 | 경멸 | angry | contempt |
| 여자친구 | 강한 분노 | angry | furious |
| 교수 | 분노·단호한 지적 | angry | furious_pointing |
| 여자친구 | 슬픔·눈물 | sad | sobbing |

키는 `characters/{characterId}/user-20261101/{reaction}` 형식이지만 FE는 직접 조립하지 않고 서버 render를 사용한다. 새 항목의 `endingPreferred=true`는 강한 감정의 엔딩용 우선 후보라는 뜻이다. O·△·X·? 학습 판정이 아니다. 평소의 약한 불만·서운함에는 기존 이미지도 사용한다.

체력 소진으로 대화가 종료되면 같은 인물의 부정적 감정과 적절한 엔딩용 이미지를 사용한다. 요청이 정중하게 보류되는 deferred 결말은 과도한 분노 대신 차분한 슬픔도 가능하다. 요청이 거절돼도 표현 자체가 적절했다면 O와 높은 점수를 유지한다.

`result.ending`에 `emotion`과 `render`가 추가됐다. 결과·엔딩 화면에서는 **`result.ending.render.imageUrl`을 우선 표시**한다. 과거 기록에서 null이면 마지막 turn.render → session.npc.render 순서로 대체한다. GET `/sessions/{id}/result`에도 같은 종료 이미지가 보존된다.

`render`는 기존 필드 외에 `reaction`, `label`, `pose`를 선택적으로 제공한다. 경멸은 기존 Emotion enum을 유지하기 위해 angry + reaction=contempt로 표현한다. 별도의 contempt 학습 판정이나 필수 enum 추가는 필요 없다. 새 이미지 네 장의 파일 접근과 여자친구·교수의 실제 배드엔딩 API를 검증했다.
