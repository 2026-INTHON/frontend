const chapters: Record<string, string[]> = {
 en:['First meeting','Breaking the ice when you first meet','Going to a café','Watching a movie','A weekend date','Making plans and sharing preferences','Making plans','Visiting an exhibition','Choosing dinner','An anniversary','Making up for a forgotten anniversary','A late apology','Preparing a surprise','Meeting friends','Meeting my friends for the first time','Saying hello','Joining the conversation'],
 ja:['初めての出会い','初対面の緊張をほぐす','カフェに行く','映画を見る','週末のデート','約束をして、好みを知る','約束を決める','展示を見に行く','夕食を選ぶ','記念日','忘れてしまった記念日を埋め合わせる','遅くなった謝罪','サプライズを準備する','友達の紹介','私の友達と初めて会う','挨拶する','会話の輪に入る'],
 zh:['初次见面','打破初次见面的拘谨','去咖啡馆','看电影','周末约会','商量安排，了解彼此喜好','约好时间','参观展览','选择晚餐','纪念日','弥补忘记纪念日的失误','迟来的道歉','准备惊喜','介绍朋友','初次见我的朋友','打招呼','融入聊天'],
};
const source=['첫 만남','처음 만난 날, 어색함 깨기','카페 가기','영화 보기','주말 데이트','약속 잡고, 취향 맞추기','약속 정하기','전시 보러 가기','저녁 메뉴 고르기','기념일','깜빡한 기념일 수습하기','늦은 사과','서프라이즈 준비','친구 소개','내 친구들과 처음 만나는 자리','인사하기','분위기 맞추기'];
export function demoChapterText(text:string,lang:string){const i=source.indexOf(text);return i<0?text:chapters[lang]?.[i]??text;}
