import type { ImageSourcePropType } from 'react-native';

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
    { id: 'tease', name: '장난', short: '놀리듯 말하지만 서운함은 진짜예요', long: '장난스럽게 넘기는 것 같아도 대충 대답하면 금방 눈치채요.', level: '난이도 보통' },
    { id: 'picky', name: '까탈', short: '말투 하나하나에 예민해요', long: '"아무거나" 같은 말에 바로 서운해해요. 성의 있게 골라 줘야 해요.', level: '난이도 높음' },
    { id: 'calm', name: '차분', short: '조용히 듣고 솔직한 말을 좋아해요', long: '화를 내기보다 차분하게 물어봐요. 솔직하게 말하면 금방 풀려요.', level: '난이도 낮음' },
  ],
  prof: [
    { id: 'tease', name: '장난', short: '유머는 있지만 예의는 확실히', long: '농담을 받아 주지만 선을 넘으면 바로 표정이 바뀌어요.', level: '난이도 보통' },
    { id: 'picky', name: '까탈', short: '질문의 의도를 꼼꼼히 물어요', long: '"그거 시험에 나와요?" 같은 질문을 싫어해요. 공부하려는 이유를 말해야 해요.', level: '난이도 높음' },
    { id: 'calm', name: '차분', short: '천천히 듣고 논리로 물어봐요', long: '학생 말을 끝까지 듣고, 궁금한 점을 차근차근 짚어 줘요.', level: '난이도 낮음' },
  ],
  junho: [
    { id: 'tease', name: '장난', short: '장난이 많고 말이 빨라요', long: '장난은 받아 주되, 약속은 확실하게 해야 해요.', level: '난이도 낮음' },
    { id: 'picky', name: '까탈', short: '약속 시간에 예민해요', long: '늦거나 말을 바꾸면 바로 서운해해요.', level: '난이도 높음' },
    { id: 'calm', name: '차분', short: '고민을 잘 들어 줘요', long: '조용히 들어 주지만 대충 말하면 다시 물어봐요.', level: '난이도 보통' },
  ],
};

// ---- 장면 스크립트 (AI 연결 전 고정 데이터) ----
export type Turn = {
  line: string; // 캐릭터 대사
  action: string; // (지문)
  thought: string; // 속마음
  tip: string; // 힌트
  sample: string; // 음성 인식 데모용 문장 (STT 연결 전)
  good: string[]; // 이런 말이 들어가면 성공
  bad: string[]; // 이런 말이 들어가면 말실수
  badWhy: string; // 왜 문제였을까
  better: string; // 더 나은 말
  goodReply: string; // 성공했을 때 캐릭터 반응
  badReply: string; // 실수했을 때 캐릭터 반응
};

export type Scene = {
  id: string;
  char: CharId;
  no: string;
  title: string;
  place: Place;
  situation: string;
  goal: string;
  turns: Turn[];
};

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
        thought: '또 미루려나…\n어디까지 됐는지, 언제 되는지만 알면 되는데.',
        tip: '진행 상황이랑 끝낼 시간을 같이 말해 보세요.',
        sample: '죄송합니다, 지금 70% 정도 됐습니다. 내일 오전까지 드려도 될까요?',
        good: ['%', '퍼센트', '내일', '오전', '시까지', '까지 드'],
        bad: ['못 했', '못했', '많아서', '바빠', '바쁘', '몰라'],
        badWhy: '진행 상황 대신 변명부터 해서 책임을 피하는 것처럼 들렸어요.',
        better: '죄송합니다, 지금 70%까지 됐습니다. 내일 오전까지 드려도 될까요?',
        goodReply: '그래요, 내일 10시까지는 꼭 주세요.',
        badReply: '…그래서 언제 되는데요?',
      },
      {
        line: '좋아요. 그럼 남은 30%는 뭐예요?',
        action: '(펜을 내려놓고 쳐다본다)',
        thought: '구체적으로 뭐가 남았는지만 말해 주면 돼.',
        tip: '남은 일을 한두 개로 콕 집어 말해 보세요.',
        sample: '매출 표 정리랑 결론 요약이 남았습니다. 오늘 표까지는 끝내겠습니다.',
        good: ['표', '요약', '정리', '분석', '남았'],
        bad: ['이것저것', '그냥', '좀', '몰라'],
        badWhy: '남은 일이 뭔지 흐려서, 정말 끝낼 수 있을지 믿음이 안 갔어요.',
        better: '매출 표 정리랑 결론 요약이 남았습니다. 오늘 표까지는 끝내겠습니다.',
        goodReply: '알겠어요. 표 먼저 보내 줘요.',
        badReply: '이것저것이 뭔데요?',
      },
    ],
  },
  {
    id: 'seoyun-weekend',
    char: 'seoyun',
    no: 'EP 2',
    title: '주말 약속 정하기',
    place: 'cafe',
    situation: '카페에서 만난 서윤이 주말 계획을 물어요',
    goal: '서윤이 원하는 걸 물어보고 약속 정하기',
    turns: [
      {
        line: '이번 주말에 뭐 할래? 너가 정해 봐~',
        action: '(빨대를 돌리며 쳐다본다)',
        thought: '또 "아무거나"라고 하면 진짜 서운할 거야.',
        tip: '하고 싶은 걸 하나 말하고, 서윤이 의견도 물어보세요.',
        sample: '토요일 점심에 전시 보러 갈래? 너는 뭐 하고 싶어?',
        good: ['갈래', '어때', '보러', '먹으러', '너는', '하고 싶'],
        bad: ['아무거나', '몰라', '상관없', '알아서'],
        badWhy: '"아무거나"는 고민하기 싫다는 뜻으로 들려서 서운하게 만들었어요.',
        better: '토요일 점심에 전시 보러 갈래? 너는 뭐 하고 싶어?',
        goodReply: '오 전시 좋아! 그럼 끝나고 파스타 먹자.',
        badReply: '…또 아무거나야?',
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
        thought: '시험 얘기만 하려는 건 아니겠지?',
        tip: '어떤 부분이 궁금한지, 왜 더 알고 싶은지 말해 보세요.',
        sample: '오늘 배운 부분을 더 공부해 보고 싶은데, 참고할 자료가 있을까요?',
        good: ['공부', '자료', '궁금', '더 알고', '참고'],
        bad: ['시험에 나와', '시험', '점수'],
        badWhy: '시험에만 관심 있는 것처럼 들려서 질문의 의도가 가벼워 보였어요.',
        better: '이 부분 더 공부해 보고 싶은데, 참고할 자료가 있을까요?',
        goodReply: '좋은 질문이에요. 다음 주에 논문 하나 보내 줄게요.',
        badReply: '…시험이 그렇게 궁금해요?',
      },
    ],
  },
];
export const sceneById = (id: string) => SCENES.find((s) => s.id === id) ?? SCENES[0];
export const sceneForChar = (c: CharId) => SCENES.find((s) => s.char === c) ?? SCENES[0];

export const LANGS = [
  { id: 'en', name: 'English', ko: '영어' },
  { id: 'ja', name: '日本語', ko: '일본어' },
  { id: 'zh', name: '中文 (简体)', ko: '중국어' },
  { id: 'vi', name: 'Tiếng Việt', ko: '베트남어' },
  { id: 'es', name: 'Español', ko: '스페인어' },
  { id: 'id', name: 'Bahasa Indonesia', ko: '인도네시아어' },
  { id: 'ko', name: '한국어', ko: '한국어' },
];

export const EPISODES = [
  { no: 1, title: '첫 카페 데이트', state: 'done', badge: '완료 · A-' },
  { no: 2, title: '주말 약속 정하기', state: 'now', badge: '진행 중 2/5', scene: 'seoyun-weekend' },
  { no: 3, title: '기념일을 깜빡했다', state: 'locked', badge: '구독하면 열림' },
  { no: 4, title: '친구들한테 소개하기', state: 'locked', badge: '구독하면 열림' },
] as const;

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
