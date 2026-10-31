import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import vm from 'node:vm';

// Exercise the actual shared player with provider/native seams stubbed; no device or paid API.
function setup(preview){
 const calls=[],handlers=[],players=[];
 const context=vm.createContext({
  api:{previewSpeech:async body=>{calls.push(body);return preview?preview(body):{audioUrl:'https://audio.test/sample.mp3'};}},
  absUrl:x=>x,SERVER_CHAR:{seoyun:'girlfriend'},SERVER_PERSONA:{picky:'strict',calm:'calm'},
  Speech:{stop:async()=>{},speak:()=>assert.fail('Device narrator must never be used')},
  createAudioPlayer:()=>{const player={play:()=>player.played=true,remove:()=>player.removed=true,addListener:(_,fn)=>handlers.push(fn)};players.push(player);return player;},
 });
 const source=readFileSync(new URL('../src/lib/voice.ts',import.meta.url),'utf8').replace(/^import .*;$/gm,'').replace(/^export /gm,'');
 vm.runInContext(stripTypeScriptTypes(source)+'\nthis.voice={speak,stopSpeak};',context);
 return {voice:context.voice,calls,handlers,players};
}
test('Demo and practice use the selected server voice; playback errors never use device narration',async()=>{
 const a=setup();let done=0,errors=0;
 await a.voice.speak('이번 주말에 하고 싶은 거 있어?',{char:'seoyun',persona:'picky',emotion:'sad',onDone:()=>done++,onError:()=>errors++});
 assert.equal(a.calls[0].personalityId,'strict');assert.equal(a.calls[0].emotion,'sad');assert.equal(a.players[0].played,true);
 a.handlers[0]({error:'MP3 unavailable'});assert.equal(errors,1);assert.equal(done,0);
 const b=setup(async()=>{throw new Error('offline');});await b.voice.speak('다시 듣기',{onError:()=>errors++});assert.equal(errors,2);assert.equal(b.players.length,0);
});
test('A voice arriving after stop cannot play or overwrite the next dialogue',async()=>{
 let resolve;const pending=new Promise(r=>resolve=r),a=setup(()=>pending);
 const playing=a.voice.speak('이전 대사');a.voice.stopSpeak();resolve({audioUrl:'https://audio.test/old.mp3'});await playing;
 assert.equal(a.players.length,0);
});
