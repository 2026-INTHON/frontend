// Short introductions for the three bundled offline examples.
const briefs: Record<string, Record<string, {title:string;partner:string;situation:string;goal:string}>> = {
 'seoyun-weekend': {
  ko:{title:'주말 약속 정하기',partner:'서윤',situation:'카페에서 만난 서윤이 당신에게 주말 계획을 물었습니다.',goal:'서로 하고 싶은 일을 이야기하고 함께 만날 약속을 정합니다.'},
  en:{title:'Making weekend plans',partner:'Seoyun',situation:'You meet Seoyun at a café, and she asks about your weekend plans.',goal:'Discuss what you both want to do and arrange a time to meet.'},
  ja:{title:'週末の約束',partner:'ソユン',situation:'カフェで会ったソユンに、週末の予定を聞かれました。',goal:'お互いにしたいことを話し、会う約束をします。'},
  zh:{title:'约好周末见面',partner:'瑞允',situation:'你在咖啡馆遇到瑞允，她问起了你的周末计划。',goal:'聊聊彼此想做的事，并约好见面的时间。'},
 },
 'boss-report': {
  ko:{title:'보고서 마감',partner:'한 부장',situation:'금요일 오후, 오늘까지 제출할 보고서를 아직 다 끝내지 못했습니다.',goal:'진행 상황을 솔직하게 설명하고 현실적인 새 마감 일정을 제안합니다.'},
  en:{title:'A report deadline',partner:'Manager Han',situation:'It is Friday afternoon, and you have not finished the report due today.',goal:'Explain your progress honestly and propose a realistic new deadline.'},
  ja:{title:'報告書の締め切り',partner:'ハン部長',situation:'金曜の午後、今日が締め切りの報告書がまだ完成していません。',goal:'進み具合を正直に説明し、現実的な提出日時を提案します。'},
  zh:{title:'报告截止日期',partner:'韩部长',situation:'周五下午，今天要提交的报告还没有完成。',goal:'如实说明进度，并提出可行的新截止时间。'},
 },
 'prof-question': {
  ko:{title:'수업 질문하기',partner:'윤 교수',situation:'수업을 마친 당신은 더 공부하고 싶은 내용이 있어 교수님께 질문하려고 합니다.',goal:'관심 있는 내용을 설명하고 도움이 될 자료를 정중하게 추천받습니다.'},
  en:{title:'A question after class',partner:'Professor Yoon',situation:'After class, you want to ask your professor about a topic you would like to study further.',goal:'Explain your interest and politely ask for useful study materials.'},
  ja:{title:'授業後の質問',partner:'ユン教授',situation:'授業後、もっと勉強したい内容について教授に質問しようとしています。',goal:'興味のある内容を説明し、役立つ資料を丁寧に尋ねます。'},
  zh:{title:'课后提问',partner:'尹教授',situation:'下课后，你想向教授请教自己想进一步学习的内容。',goal:'说明你感兴趣的内容，并礼貌地请教授推荐学习资料。'},
 },
};
export const demoBrief = (id:string,language:string) => briefs[id]?.[language] ?? briefs[id]?.en;
