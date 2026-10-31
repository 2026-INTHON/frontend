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

현재 실제 서버에서 **4명 × 5표정 = 20개 이미지**를 확인했다. 현재 등록된 기본 이미지의 gesture는 idle이다. nod 등은 선택 가능한 몸짓 코드이며, 해당 이미지가 등록됐다는 뜻은 아니다. 추가 몸짓 이미지를 등록하면 같은 목록에 나타난다. 없는 이미지를 생성된 것처럼 보내지 않는다.

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

BE의 선택 순서는 같은 캐릭터 안에서 `감정+몸짓 일치 → 같은 감정의 기본 몸짓 → 기본 표정·몸짓 → 해당 캐릭터의 기본 PNG`다. 다른 캐릭터 이미지로 대체하지 않는다. 감정은 가상 인물의 연출 상태이며 사용자의 심리를 진단한 값이 아니다.

기존 대사 레이아웃에 선명한 투명 배경 캐릭터 이미지를 겹치고, 원문·자막·음성과 함께 전환한다. 대사 반응에는 turn.render, 다음 노드로 넘어갈 때에는 session.npc.render를 쓴다. 이전 대사 이미지가 뒤늦게 로드돼 현재 표정을 덮어쓰지 않도록 대사/turn ID가 바뀌었는지 확인한다.

배경 이미지는 BE에서 흐림 처리한 버전을 보내므로 추가 블러를 주지 않는다. 캐릭터·글자·버튼까지 함께 흐려지는 부모 View 블러는 사용하지 않는다. GLB 다운로드·본·모프·입모양 애니메이션 연결은 구현 범위에서 제외한다.

자막과 음성 필드 및 온보딩 8발화 연결은 [대화 API 요청사항](BE_SUBTITLE_AUDIO_HANDOFF.md), 나머지 FE 작업은 [전체 인수인계](FE_INTEGRATION.md)를 따른다.
