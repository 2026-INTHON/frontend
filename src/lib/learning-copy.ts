const copy = {
  ko: { koreanPractice: '한국어 회화 연습', chooseLanguage: '설명과 자막을 볼 언어', languageHelp: '대화는 한국어로, 설명과 번역 자막은 선택한 언어로 보여드려요. 설정에서 언제든 바꿀 수 있어요.', next: '다음', save: '저장', partner: '대화 상대', situation: '상황', goal: '학습 목표', start: '대화 시작', chapters: '챕터', loading: '챕터 불러오는 중…', loadError: '챕터를 불러오지 못했어요.', retry: '다시 시도' },
  en: { koreanPractice: 'Korean conversation practice', chooseLanguage: 'Choose your guide language', languageHelp: 'Practise speaking Korean. Read explanations and translated subtitles in your language. You can change it in Settings.', next: 'Continue', save: 'Save', partner: 'Your partner', situation: 'Situation', goal: 'Learning goal', start: 'Start conversation', chapters: 'Chapters', loading: 'Loading chapters…', loadError: 'Could not load chapters.', retry: 'Try again' },
  ja: { koreanPractice: '韓国語の会話練習', chooseLanguage: '説明と字幕の言語を選択', languageHelp: '会話は韓国語で、説明と翻訳字幕は選んだ言語で表示します。設定からいつでも変更できます。', next: '次へ', save: '保存', partner: '会話の相手', situation: '状況', goal: '学習目標', start: '会話を始める', chapters: 'チャプター', loading: 'チャプターを読み込み中…', loadError: 'チャプターを読み込めませんでした。', retry: '再試行' },
  zh: { koreanPractice: '韩语会话练习', chooseLanguage: '选择说明和字幕语言', languageHelp: '使用韩语对话，以你选择的语言阅读说明和翻译字幕。可随时在设置中更改。', next: '下一步', save: '保存', partner: '对话对象', situation: '情境', goal: '学习目标', start: '开始对话', chapters: '章节', loading: '正在加载章节…', loadError: '无法加载章节。', retry: '重试' },
};
export const learningCopy = (lang: string) => copy[lang as keyof typeof copy] ?? copy.en;

const reactions = {
  ko: { happy:'기쁨', angry:'화남', sad:'슬픔', confused:'혼란', neutral:'차분', effects:'반응 효과음', on:'효과음 켜짐', off:'효과음 꺼짐' },
  en: { happy:'Happy', angry:'Angry', sad:'Sad', confused:'Confused', neutral:'Calm', effects:'Reaction sounds', on:'Sounds on', off:'Sounds off' },
  ja: { happy:'うれしい', angry:'怒り', sad:'悲しい', confused:'戸惑い', neutral:'穏やか', effects:'リアクション効果音', on:'効果音オン', off:'効果音オフ' },
  zh: { happy:'开心', angry:'生气', sad:'难过', confused:'困惑', neutral:'平静', effects:'反应音效', on:'音效已开启', off:'音效已关闭' },
};
export const reactionCopy = (lang:string) => reactions[lang as keyof typeof reactions] ?? reactions.en;

const profiles={
 ko:{title:'프로필',name:'이름',occupation:'직업',age:'나이',hobbies:'취미',favoriteFoods:'좋아하는 음식',dislikes:'싫어하는 것',currentInterests:'요즘 관심사',loading:'프로필 불러오는 중…',error:'프로필을 불러오지 못했어요.',retry:'다시 불러오기',open:'프로필 보기',close:'프로필 닫기'},
 en:{title:'Profile',name:'Name',occupation:'Occupation',age:'Age',hobbies:'Hobbies',favoriteFoods:'Favorite foods',dislikes:'Dislikes',currentInterests:'Current interests',loading:'Loading profile…',error:'Could not load the profile.',retry:'Try again',open:'View profile',close:'Close profile'},
 ja:{title:'プロフィール',name:'名前',occupation:'職業',age:'年齢',hobbies:'趣味',favoriteFoods:'好きな食べ物',dislikes:'苦手なこと',currentInterests:'最近の関心',loading:'プロフィールを読み込み中…',error:'プロフィールを読み込めませんでした。',retry:'再読み込み',open:'プロフィールを見る',close:'プロフィールを閉じる'},
 zh:{title:'个人资料',name:'姓名',occupation:'职业',age:'年龄',hobbies:'爱好',favoriteFoods:'喜欢的食物',dislikes:'不喜欢的事',currentInterests:'最近的兴趣',loading:'正在加载个人资料…',error:'无法加载个人资料。',retry:'重试',open:'查看个人资料',close:'关闭个人资料'},
};
export const profileCopy=(lang:string)=>profiles[lang as keyof typeof profiles]??profiles.en;

// Never display subtitles left over from another selected language.
export const subtitleText = (value: { language: string; text: string } | null | undefined, lang: string) =>
  lang !== 'ko' && value?.language === lang ? value.text : null;
