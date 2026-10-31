const copy = {
  ko: { koreanPractice: '한국어 회화 연습', chooseLanguage: '설명과 자막을 볼 언어', languageHelp: '대화는 한국어로, 설명과 번역 자막은 선택한 언어로 보여드려요. 설정에서 언제든 바꿀 수 있어요.', next: '다음', save: '저장', partner: '대화 상대', situation: '상황', goal: '학습 목표', start: '대화 시작', chapters: '챕터', loading: '챕터 불러오는 중…', loadError: '챕터를 불러오지 못했어요.', retry: '다시 시도' },
  en: { koreanPractice: 'Korean conversation practice', chooseLanguage: 'Choose your guide language', languageHelp: 'Practise speaking Korean. Read explanations and translated subtitles in your language. You can change it in Settings.', next: 'Continue', save: 'Save', partner: 'Your partner', situation: 'Situation', goal: 'Learning goal', start: 'Start conversation', chapters: 'Chapters', loading: 'Loading chapters…', loadError: 'Could not load chapters.', retry: 'Try again' },
  ja: { koreanPractice: '韓国語の会話練習', chooseLanguage: '説明と字幕の言語を選択', languageHelp: '会話は韓国語で、説明と翻訳字幕は選んだ言語で表示します。設定からいつでも変更できます。', next: '次へ', save: '保存', partner: '会話の相手', situation: '状況', goal: '学習目標', start: '会話を始める', chapters: 'チャプター', loading: 'チャプターを読み込み中…', loadError: 'チャプターを読み込めませんでした。', retry: '再試行' },
  zh: { koreanPractice: '韩语会话练习', chooseLanguage: '选择说明和字幕语言', languageHelp: '使用韩语对话，以你选择的语言阅读说明和翻译字幕。可随时在设置中更改。', next: '下一步', save: '保存', partner: '对话对象', situation: '情境', goal: '学习目标', start: '开始对话', chapters: '章节', loading: '正在加载章节…', loadError: '无法加载章节。', retry: '重试' },
};
export const learningCopy = (lang: string) => copy[lang as keyof typeof copy] ?? copy.en;

// Never display subtitles left over from another selected language.
export const subtitleText = (value: { language: string; text: string } | null | undefined, lang: string) =>
  lang !== 'ko' && value?.language === lang ? value.text : null;
