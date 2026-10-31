import type { ImageSourcePropType } from 'react-native';
import type { Emotion } from './api';

export type CharId = 'seoyun' | 'junho' | 'boss' | 'prof';
export type PersonaId = 'tease' | 'picky' | 'calm';
export type Place = 'office' | 'cafe' | 'street';

export const IMG = {
  char: {
    seoyun: require('../../assets/img/char-seoyun.png'),
    junho: require('../../assets/img/char-junho.png'),
    boss: require('../../assets/img/char-boss.png'),
    prof: require('../../assets/img/char-prof.png'),
  } as Record<CharId, ImageSourcePropType>,
  card: {
    seoyun: require('../../assets/img/card-seoyun.png'),
    junho: require('../../assets/img/card-junho.png'),
    boss: require('../../assets/img/card-boss.png'),
    prof: require('../../assets/img/card-prof.png'),
  } as Record<CharId, ImageSourcePropType>,
  bg: {
    office: require('../../assets/img/bg-office.png'),
    cafe: require('../../assets/img/bg-cafe.png'),
    street: require('../../assets/img/bg-street.png'),
  } as Record<Place, ImageSourcePropType>,
};

export type Character = { id: CharId; name: string; role: string; call: string; free: boolean };
export const CHARACTERS: Character[] = [
  { id: 'seoyun', name: '서윤', role: '여자친구', call: '서윤', free: true },
  { id: 'junho', name: '준호', role: '친구', call: '준호', free: false },
  { id: 'boss', name: '한 부장', role: '부장님', call: '한 부장님', free: false },
  { id: 'prof', name: '윤 교수', role: '교수님', call: '윤 교수님', free: true },
];
export const charById = (id: CharId) => CHARACTERS.find((c) => c.id === id)!;

export type Persona = { id: PersonaId; name: string; short: string; long: string; level: string };
export const PERSONAS: Record<CharId, Persona[]> = {
  boss: [
    { id: 'tease', name: '장난', short: '농담을 섞지만 선은 지켜야 해요', long: '분위기는 가볍지만 일 얘기엔 정확한 답을 원해요.', level: '난이도 보통' },
    { id: 'picky', name: '까탈', short: '디테일까지 짚고 대충 말하면 바로 되물어요', long: '보고서 숫자 하나까지 확인해요. 애매하게 말하면 "그래서 언제요?"라고 바로 되물어요.', level: '난이도 높음' },
    { id: 'calm', name: '차분', short: '천천히 듣고 논리로 물어봐요', long: '끝까지 들어 주지만, 이유와 계획을 차근차근 물어봐요.', level: '난이도 낮음' },
  ],
  seoyun: [
    { id: 'tease', name: '발랄', short: '밝게 장난치지만 서운함은 진짜예요', long: '장난스럽게 넘기는 것 같아도 대충 대답하면 금방 눈치채요.', level: '난이도 보통' },
    { id: 'picky', name: '까탈', short: '말투 하나하나에 예민해요', long: '"아무거나" 같은 말에 바로 서운해해요. 성의 있게 골라 줘야 해요.', level: '난이도 높음' },
    { id: 'calm', name: '차분', short: '조용히 듣고 솔직한 말을 좋아해요', long: '화를 내기보다 차분하게 물어봐요. 솔직하게 말하면 금방 풀려요.', level: '난이도 낮음' },
  ],
  prof: [
    { id: 'tease', name: '친절', short: '따뜻하게 격려하며 이야기를 들어요', long: '편안하게 질문하도록 도와주며, 가벼운 유머를 곁들여 설명해요.', level: '난이도 보통' },
    { id: 'picky', name: '까탈', short: '질문의 의도를 꼼꼼히 물어요', long: '"그거 시험에 나와요?" 같은 질문을 싫어해요. 공부하려는 이유를 말해야 해요.', level: '난이도 높음' },
    { id: 'calm', name: '기본', short: '차분하게 듣고 논리로 물어봐요', long: '학생 말을 끝까지 듣고, 궁금한 점을 차근차근 짚어 줘요.', level: '난이도 낮음' },
  ],
  junho: [
    { id: 'tease', name: '장난', short: '장난이 많고 말이 빨라요', long: '장난은 받아 주되, 약속은 확실하게 해야 해요.', level: '난이도 낮음' },
    { id: 'picky', name: '까탈', short: '약속 시간에 예민해요', long: '늦거나 말을 바꾸면 바로 서운해해요.', level: '난이도 높음' },
    { id: 'calm', name: '차분', short: '고민을 잘 들어 줘요', long: '조용히 들어 주지만 대충 말하면 다시 물어봐요.', level: '난이도 보통' },
  ],
};

// ---- 장면 스크립트 (AI 연결 전 고정 데이터) ----
export type Cue = { k: '표정' | '억양' | '망설임' | '침묵' | '행동'; v: string };
// sub: 선택 언어 자막, audio: 서버가 준 그 대사 음성 URL, turnId: 반응 대사면 해당 턴 (다시 듣기용)
export type Line = { line: string; action?: string; cues?: Cue[]; sub?: string | null; audio?: string | null; turnId?: string; emotion?: Emotion };
export type Turn = Line & {
  byPersona?: Partial<Record<PersonaId, Line>>; // 성격마다 다른 말투·단서
  clue: { focus: string; act: string; ctx: string }; // 힌트 1단계: 주목 표현 · 행동 · 상황 단서
  thought: string; // 힌트 2단계: 실제 속마음
  tip: string;
  sample: string; // 음성 인식 데모용 문장 (STT 연결 전)
  good: string[]; // 들어가면 O
  bad: string[]; // 들어가면 X
  badWhy: string;
  better: string; // 더 나은 한국어 표현
  goodReply: string;
  midReply: string; // △ 일 때 반응
  badReply: string;
  replyEmotions?: { good: Emotion; mid: Emotion; bad: Emotion };
  views: { who: string; meaning: string; cue: string }[]; // 관점 전환: 같은 말을 다른 사람이 하면?
};

export type Scene = { id: string; char: CharId; no: string; title: string; place: Place; situation: string; goal: string; turns: Turn[] };

export const SCENES: Scene[] = [
  {
    id: 'boss-report',
    char: 'boss',
    no: 'SCENE 01',
    title: '보고서 마감',
    place: 'office',
    situation: '금요일 오후 4시, 오늘 마감인 보고서가 아직 70%',
    goal: '솔직하게 말하고 새 마감 약속 받기',
    turns: [
      {
        line: '김 대리, 보고서 오늘까지죠? 어디까지 됐어요?',
        action: '(서류를 넘기며 시계를 본다)',
        cues: [{ k: '행동', v: '시계를 봄' }, { k: '억양', v: '"오늘까지죠?" 끝을 올림' }, { k: '침묵', v: '대답을 2초 기다림' }],
        byPersona: {
          tease: { line: '김 대리~ 보고서 오늘까지인 거 알죠? 설마 아직?', action: '(웃으며 의자를 돌린다)', cues: [{ k: '표정', v: '웃고 있지만 눈은 진지함' }, { k: '억양', v: '"설마" 길게 끎' }, { k: '행동', v: '의자를 돌려 마주 봄' }] },
          calm: { line: '김 대리, 보고서 진행 상황 좀 들어볼 수 있을까요?', action: '(펜을 내려놓는다)', cues: [{ k: '행동', v: '펜을 내려놓음' }, { k: '억양', v: '차분하고 낮음' }, { k: '침묵', v: '끝까지 기다려 줌' }] },
        },
        clue: { focus: '"오늘까지죠?" — 확인하는 말투', act: '시계를 본다 → 시간이 신경 쓰임', ctx: '금요일 오후 4시, 마감 당일' },
        thought: '또 미루려나…\n어디까지 됐는지, 언제 되는지만 알면 되는데.',
        tip: '진행 상황이랑 끝낼 시간을 같이 말해 보세요.',
        sample: '죄송합니다, 지금 70% 정도 됐습니다. 내일 오전까지 드려도 될까요?',
        good: ['%', '퍼센트', '내일', '오전', '시까지', '까지 드'],
        bad: ['못 했', '못했', '많아서', '바빠', '바쁘', '몰라'],
        badWhy: '진행 상황 대신 변명부터 해서 책임을 피하는 것처럼 들렸어요.',
        better: '죄송합니다, 지금 70%까지 됐습니다. 내일 오전까지 드려도 될까요?',
        goodReply: '그래요, 내일 10시까지는 꼭 주세요.',
        replyEmotions: { good: 'neutral', mid: 'confused', bad: 'angry' },
        midReply: '음… 그래서 정확히 언제요?',
        badReply: '…그래서 언제 되는데요?',
        views: [
          { who: '친구 준호에게', meaning: '너무 딱딱해서 어색해요. "70% 했어, 내일 오전에 줄게!"면 충분해요.', cue: '반말 · 가벼운 억양' },
          { who: '장난 부장님에게', meaning: '같은 말도 웃으며 하면 분위기가 풀려요. 숫자는 그대로 정확하게.', cue: '웃는 표정이 단서' },
          { who: '윤 교수님에게 (과제)', meaning: '"내일 오전까지 제출해도 될까요?"로 바꾸면 자연스러워요. 이유를 한 줄 덧붙이면 더 좋아요.', cue: '상황 단서가 회사 → 수업으로 바뀜' },
        ],
      },
      {
        line: '좋아요. 그럼 남은 30%는 뭐예요?',
        action: '(펜을 내려놓고 쳐다본다)',
        cues: [{ k: '표정', v: '살짝 누그러짐' }, { k: '행동', v: '펜을 내려놓음' }],
        clue: { focus: '"남은 30%" — 구체적인 내용을 원함', act: '펜을 내려놓는다 → 들을 준비', ctx: '마감은 내일로 합의됨' },
        thought: '구체적으로 뭐가 남았는지만 말해 주면 돼.',
        tip: '남은 일을 한두 개로 콕 집어 말해 보세요.',
        sample: '매출 표 정리랑 결론 요약이 남았습니다. 오늘 표까지는 끝내겠습니다.',
        good: ['표', '요약', '정리', '분석', '남았'],
        bad: ['이것저것', '그냥', '몰라'],
        badWhy: '남은 일이 뭔지 흐려서, 정말 끝낼 수 있을지 믿음이 안 갔어요.',
        better: '매출 표 정리랑 결론 요약이 남았습니다. 오늘 표까지는 끝내겠습니다.',
        goodReply: '알겠어요. 표 먼저 보내 줘요.',
        replyEmotions: { good: 'neutral', mid: 'neutral', bad: 'confused' },
        midReply: '좀 더 구체적으로요.',
        badReply: '이것저것이 뭔데요?',
        views: [
          { who: '팀 동료에게', meaning: '"표랑 요약 남았어요, 표는 오늘 끝낼게요" 정도로 짧게 해도 돼요.', cue: '같은 직급 · 편한 존댓말' },
          { who: '까탈 부장님에게', meaning: '"오늘 6시까지 표 보내드리겠습니다"처럼 시간까지 붙이면 더 좋아요.', cue: '시계를 보는 행동이 단서' },
        ],
      },
    ],
  },
  {
    id: 'seoyun-weekend',
    char: 'seoyun',
    no: 'EP 2-1',
    title: '주말 약속 정하기',
    place: 'cafe',
    situation: '카페에서 만난 서윤이 주말 계획을 물어요',
    goal: '서윤이 원하는 걸 물어보고 약속 정하기',
    turns: [
      {
        line: '이번 주말에 뭐 할래? 너가 정해 봐~',
        action: '(빨대를 돌리며 쳐다본다)',
        cues: [{ k: '억양', v: '"정해 봐~" 끝을 늘림' }, { k: '행동', v: '빨대를 돌림' }, { k: '표정', v: '기대하는 눈빛' }],
        byPersona: {
          picky: { line: '주말에 뭐 해? …또 아무거나라고 하면 안 돼.', action: '(팔짱을 낀다)', cues: [{ k: '행동', v: '팔짱' }, { k: '침묵', v: '말 끝에 1초 멈춤' }, { k: '표정', v: '살짝 뾰로통' }] },
          calm: { line: '이번 주말에 하고 싶은 거 있어?', action: '(컵을 내려놓는다)', cues: [{ k: '억양', v: '부드럽게 올림' }, { k: '표정', v: '편안함' }] },
        },
        clue: { focus: '"너가 정해 봐~" — 성의를 보고 싶어 함', act: '빨대를 돌리며 기다림', ctx: '지난번에도 서윤이 다 정했어요' },
        thought: '또 "아무거나"라고 하면 진짜 서운할 거야.',
        tip: '하고 싶은 걸 하나 말하고, 서윤이 의견도 물어보세요.',
        sample: '토요일 점심에 전시 보러 갈래? 너는 뭐 하고 싶어?',
        good: ['갈래', '어때', '보러', '먹으러', '너는', '하고 싶'],
        bad: ['아무거나', '몰라', '상관없', '알아서'],
        badWhy: '"아무거나"는 고민하기 싫다는 뜻으로 들려서 서운하게 만들었어요.',
        better: '토요일 점심에 전시 보러 갈래? 너는 뭐 하고 싶어?',
        goodReply: '오 전시 좋아! 그럼 끝나고 파스타 먹자.',
        replyEmotions: { good: 'happy', mid: 'confused', bad: 'sad' },
        midReply: '음… 그거 말고 다른 건?',
        badReply: '…또 아무거나야?',
        views: [
          { who: '친구 준호에게', meaning: '"전시 보러 갈래?"만 해도 충분해요. 의견을 꼭 물을 필요는 없어요.', cue: '친구 사이 · 가벼운 말투' },
          { who: '윤 교수님에게', meaning: '교수님께는 주말 약속을 묻지 않아요. "다음 주 면담 가능하실까요?"처럼 바꿔야 해요.', cue: '관계 단서가 완전히 바뀜' },
        ],
      },
    ],
  },
  {
    id: 'prof-question',
    char: 'prof',
    no: 'SCENE 03',
    title: '수업 질문하기',
    place: 'street',
    situation: '수업이 끝나고 교수님을 따라 나와 질문해요',
    goal: '공부하려는 이유를 말하고 자료 추천 받기',
    turns: [
      {
        line: '네, 무슨 질문 있어요?',
        action: '(가방을 고쳐 메며 멈춰 선다)',
        cues: [{ k: '행동', v: '가방을 고쳐 멤 → 바쁨' }, { k: '억양', v: '평평하고 짧음' }],
        clue: { focus: '"무슨 질문" — 요점을 듣고 싶어 함', act: '가방을 고쳐 멘다 → 곧 가야 함', ctx: '수업 끝난 복도' },
        thought: '시험 얘기만 하려는 건 아니겠지?',
        tip: '어떤 부분이 궁금한지, 왜 더 알고 싶은지 말해 보세요.',
        sample: '오늘 배운 부분을 더 공부해 보고 싶은데, 참고할 자료가 있을까요?',
        good: ['공부', '자료', '궁금', '더 알고', '참고'],
        bad: ['시험에 나와', '시험', '점수'],
        badWhy: '시험에만 관심 있는 것처럼 들려서 질문의 의도가 가벼워 보였어요.',
        better: '이 부분 더 공부해 보고 싶은데, 참고할 자료가 있을까요?',
        goodReply: '좋은 질문이에요. 다음 주에 논문 하나 보내 줄게요.',
        replyEmotions: { good: 'happy', mid: 'confused', bad: 'confused' },
        midReply: '어떤 부분이요?',
        badReply: '…시험이 그렇게 궁금해요?',
        views: [
          { who: '선배에게', meaning: '"이 부분 더 보고 싶은데 추천해 줄 자료 있어요?" 정도로 편하게 해도 돼요.', cue: '거리가 가까운 관계' },
          { who: '까탈 교수님에게', meaning: '어느 부분인지 페이지까지 짚어 말하면 더 좋아해요.', cue: '구체성이 단서' },
        ],
      },
    ],
  },
];
export const lineFor = (t: Turn, p: PersonaId): Line => ({ line: t.line, action: t.action, cues: t.cues, ...(t.byPersona?.[p] ?? {}) });
// 데모 모드 전용: 앱 안 대본 찾기. 없으면 undefined (다른 장면으로 몰래 바꾸지 않아요)
export const sceneById = (id: string) => SCENES.find((s) => s.id === id);
// 데모 모드에서 캐릭터에 맞는 첫 장면 (준호는 데모 대본이 없어서 서윤 장면)
export const sceneForChar = (c: CharId) => SCENES.find((s) => s.char === c) ?? SCENES.find((s) => s.char === 'seoyun')!;

// 서버 ID ↔ 앱 표시용 키 (BE DB: girlfriend/friend/manager/professor, playful/strict/calm)
export const SERVER_CHAR: Record<CharId, string> = { seoyun: 'girlfriend', junho: 'friend', boss: 'manager', prof: 'professor' };
export const SERVER_PERSONA: Record<PersonaId, string> = { tease: 'playful', picky: 'strict', calm: 'calm' };
export const charFromServer = (id?: string | null, fb: CharId = 'seoyun'): CharId => (Object.keys(SERVER_CHAR) as CharId[]).find((k) => SERVER_CHAR[k] === id || k === id) ?? fb;
export const personaFromServer = (id?: string | null, fb: PersonaId = 'calm'): PersonaId => (Object.keys(SERVER_PERSONA) as PersonaId[]).find((k) => SERVER_PERSONA[k] === id || k === id) ?? fb;
export const PLACE_OF: Record<CharId, Place> = { boss: 'office', seoyun: 'cafe', prof: 'street', junho: 'street' };

export const LANGS = [
  { id: 'en', name: 'English', ko: '영어' },
  { id: 'ja', name: '日本語', ko: '일본어' },
  { id: 'zh', name: '中文 (简体)', ko: '중국어' },
  { id: 'vi', name: 'Tiếng Việt', ko: '베트남어' },
  { id: 'es', name: 'Español', ko: '스페인어' },
  { id: 'id', name: 'Bahasa Indonesia', ko: '인도네시아어' },
  { id: 'ko', name: '한국어', ko: '한국어' },
];

export type Sub = { id: string; title: string; state: 'done' | 'now' | 'open' | 'locked'; grade?: string; scene?: string };
export type Chapter = { no: number; title: string; desc: string; locked: boolean; subs: Sub[] };
export const CHAPTERS: Chapter[] = [
  { no: 1, title: '첫 만남', desc: '처음 만난 날, 어색함 깨기', locked: false, subs: [
    { id: '1-1', title: '카페 가기', state: 'done', grade: 'A-' },
    { id: '1-2', title: '영화 보기', state: 'done', grade: 'B' },
  ] },
  { no: 2, title: '주말 데이트', desc: '약속 잡고, 취향 맞추기', locked: false, subs: [
    { id: '2-1', title: '약속 정하기', state: 'now', scene: 'seoyun-weekend' },
    { id: '2-2', title: '전시 보러 가기', state: 'open', scene: 'seoyun-weekend' },
    { id: '2-3', title: '저녁 메뉴 고르기', state: 'open', scene: 'seoyun-weekend' },
  ] },
  { no: 3, title: '기념일', desc: '깜빡한 기념일 수습하기', locked: true, subs: [
    { id: '3-1', title: '늦은 사과', state: 'locked' },
    { id: '3-2', title: '서프라이즈 준비', state: 'locked' },
  ] },
  { no: 4, title: '친구 소개', desc: '내 친구들과 처음 만나는 자리', locked: true, subs: [
    { id: '4-1', title: '인사하기', state: 'locked' },
    { id: '4-2', title: '분위기 맞추기', state: 'locked' },
  ] },
];

export const WARDROBE = {
  옷: [
    { id: 'knit', name: '크롭 니트', price: 200, color: '#E9DCC9' },
    { id: 'check', name: '체크 셔츠', price: 150, color: '#C9D3DE' },
    { id: 'varsity', name: '바시티 재킷', price: 300, color: '#2F3A4A' },
    { id: 'dress', name: '니트 원피스', price: 250, color: '#D8C7D4' },
    { id: 'hood', name: '후드 집업', price: 180, color: '#B9C2A7' },
  ],
  머리: [
    { id: 'long', name: '긴 생머리', price: 0, color: '#4A3A30' },
    { id: 'bob', name: '단발', price: 200, color: '#5A4636' },
    { id: 'pony', name: '포니테일', price: 150, color: '#3E3129' },
    { id: 'wave', name: '웨이브', price: 250, color: '#6B5242' },
  ],
  배경: [
    { id: 'cafe', name: '카페', price: 0, color: '#EEE6DB' },
    { id: 'office', name: '사무실', price: 100, color: '#DCE0E5' },
    { id: 'street', name: '겨울 거리', price: 100, color: '#D9DEE8' },
  ],
} as const;
export type WardrobeTab = keyof typeof WARDROBE;
