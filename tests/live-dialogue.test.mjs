import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import vm from 'node:vm';

test('Live dialogue carries the actual reply, image and agreed register through advance, clarification and correction',async()=>{
 const opening={id:'session',sceneId:'gf-3-4',characterId:'girlfriend',personalityId:'calm',nodeIndex:0,nodeCount:8,lives:3,status:'active',npc:{text:'음식 괜찮아요?',speechLevel:'polite'}};
 let current=opening;
 const context=vm.createContext({Date,Math,SERVER_PERSONA:{calm:'calm'},PLACE_OF:{seoyun:'cafe'},sceneById:()=>null,charFromServer:()=> 'seoyun',personaFromServer:()=> 'calm',absUrl:x=>x,subtitleText:x=>x?.text||null,
  api:{speech:async()=>{throw Object.assign(new Error('quota'),{code:'DAILY_QUOTA_EXCEEDED'});},start:async()=>opening,correct:async()=>opening,turn:async()=>({session:current,turn:{text:'답변',npcReply:current.npc.text,npcSpeechLevel:current.npc.speechLevel,emotion:'happy',render:{imageUrl:'https://img.test/happy.webp'},evaluation:{mark:current.nodeIndex?'O':'?',progression:current.nodeIndex?'advance':'retry'},feedback:{},lifeDelta:0}})},
 });
 const source=stripTypeScriptTypes(readFileSync(new URL('../src/lib/engine.ts',import.meta.url),'utf8').replace(/^import .*;$/gm,'').replace(/^export /gm,''),{mode:'transform'});
 vm.runInContext(source+'\nthis.liveEngine=liveEngine;',context);
 const engine=await context.liveEngine('gf-3-4',{pack:'ko',lang:'ko',char:'seoyun',persona:'calm'});
 assert.equal(engine.line.speechLevel,'polite');
 await assert.rejects(engine.voiceUrl(),error=>error.code==='DAILY_QUOTA_EXCEEDED');
 for(const [index,text,level] of [[1,'네, 따뜻하고 담백한 국수를 좋아해요.','polite'],[0,'어떤 음식 말씀하시는 거예요?','polite'],[2,'좋아, 우리 이제 편하게 말하자.','casual']]){
  current={...opening,nodeIndex:index,npc:{text,speechLevel:level,render:{imageUrl:'https://img.test/happy.webp'}}};
  const response=await engine.submit('답변');
  assert.equal(response.replyLine.line,text);assert.equal(response.replyLine.speechLevel,level);
  engine.next();assert.equal(engine.line.line,text);assert.equal(engine.line.speechLevel,level);assert.equal(engine.render,'https://img.test/happy.webp');
 }
 context.api.turn=async()=>({session:{...current,repair:null},turn:{text:'무례하게 말해서 미안해',repairAction:'resolved',npcReply:'사과는 받아들일게. 아까 이야기로 돌아가 볼까?',evaluation:{mark:'O',progression:'retry',goalAchieved:false},feedback:{}}});
 const apology=await engine.submit('무례하게 말해서 미안해');
 assert.equal(apology.mark,'O');assert.equal(apology.ok,true);assert.equal(apology.advance,false);assert.equal(apology.done,false);
 await engine.correct();assert.equal(engine.line.line,opening.npc.text);assert.equal(engine.line.speechLevel,'polite');
});
