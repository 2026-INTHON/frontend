# 캐릭터 표정과 몸짓 이미지 연결 요청

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

현재 **교수·여자친구 각 10개, 친구·부장 각 5개 = 30개 이미지 항목**이다. 교수 이미지 하나는 같은 파일을 가리키는 별칭이므로 DB 업로드분의 고유 파일은 19개다. 실제 파일 URL의 접근도 확인했다. nod 같은 코드가 있다고 모든 캐릭터의 해당 몸짓 이미지가 있다는 뜻은 아니다.

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

기존 대사 레이아웃에 선명한 투명 배경 캐릭터 이미지를 겹치고, 원문·자막·음성과 함께 전환한다. 대사 반응에는 turn.render, 다음 노드로 넘어갈 때에는 session.npc.render를 쓴다. 이전 대사 이미지가 뒤늦게 로드돼 현재 표정을 덮어쓰지 않도록 대사/turn ID가 바뀌었는지 확인한다.

배경 이미지는 BE에서 흐림 처리한 버전을 보내므로 추가 블러를 주지 않는다. 캐릭터·글자·버튼까지 함께 흐려지는 부모 View 블러는 사용하지 않는다. GLB 다운로드·본·모프·입모양 애니메이션 연결은 구현 범위에서 제외한다.

자막과 음성 필드 및 온보딩 8발화 연결은 [대화 API 요청사항](BE_SUBTITLE_AUDIO_HANDOFF.md), 나머지 FE 작업은 [전체 인수인계](FE_INTEGRATION.md)를 따른다.

## DB 원본과 상황별 선택

`malo_catalog`의 character 문서에 저장된 `imageVariants`를 우선 사용한다. 등록된 교수·여자친구는 기존 5표정 세트와 섞지 않는다. 각 항목의 `label`, `reaction`, `pose`, `useWhen`, `tags`, `defaultForEmotion`도 `/assets/characters`로 제공하며 `source=supabase_catalog`로 구분한다. 절대 Supabase Storage URL에 API 호스트를 다시 붙이지 않는다.

BE가 해당 캐릭터의 후보와 사용 조건을 AI에 전달한다. AI가 현재 반응·감정·몸짓에 맞는 키를 선택하고, BE는 후보·인물·감정 일치를 확인한 뒤 `turn.render`에 실제 선택을 넣는다. 교수의 시계 확인·자료 설명·격려, 여자친구의 수줍음·웃음·서운함 등을 같은 감정 안에서도 구분할 수 있다. 이미지의 `reaction`은 연기용 이름이며 학습 판정이 아니다. 예를 들어 `corrective`가 X를 뜻하지 않고 시계 확인이 화남을 뜻하지 않는다.

FE는 모든 선택 규칙을 다시 만들지 않고 `render.assetKey/imageUrl`을 표시한다. 시작·복귀의 `session.npc.render`, 답변 직후 `turn.render`를 사용한다. 같은 세트가 바뀌면 60초 캐시 후 반영하며, 카탈로그 재시드는 업로드 이미지·메타데이터를 보존한다. 신규 생성 API 호출은 없다. 새 DB 세트는 `/assets/characters`가 원본이며 `/assets/personas`는 기존 클라이언트 호환용이다.

학습 판정은 `evaluation.mark`의 O·△·X·?이며 캐릭터 감정과 독립적이다. 감정 이미지로 학습 판정을 대신 표시하지 않는다.
