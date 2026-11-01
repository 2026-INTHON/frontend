import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import vm from 'node:vm';

const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
class ApiError extends Error {constructor(status,retryAfter){super('limited');this.status=status;this.retryAfter=retryAfter;}}
function setup(issue){
 const sockets=[];let calls=0,now=0;
 class Socket {
  readyState=0;
  constructor(){sockets.push(this);queueMicrotask(()=>{if(this.readyState===0){this.readyState=1;this.onopen();}});}
  close(){this.readyState=3;this.onclose?.();}
  send(data){if(JSON.parse(data).type==='input_audio_buffer.commit')queueMicrotask(()=>{
   this.onmessage({data:JSON.stringify({type:'input_audio_buffer.committed',item_id:'recorded'})});
   this.onmessage({data:JSON.stringify({type:'conversation.item.input_audio_transcription.completed',item_id:'recorded',transcript:'안녕하세요.'})});
  });}
 }
 const context=vm.createContext({api:{realtimeSession:async()=>{calls++;await issue?.();return {websocketUrl:'wss://example.test',value:'test'};}},ApiError,WebSocket:Socket,Date:{now:()=>now},setTimeout,clearTimeout});
 const source=readFileSync(new URL('../src/lib/realtime.ts',import.meta.url),'utf8').replace(/^import .*;$/gm,'').replace(/^export /gm,'');
 vm.runInContext(stripTypeScriptTypes(source,{mode:'transform'})+'\nthis.Transcriber=RealtimeTranscriber;',context);
 return {rt:new context.Transcriber('ko'),sockets,calls:()=>calls,advance:ms=>now+=ms};
}
test('Simultaneous preparations issue once and recorded turns keep the same socket',async()=>{
 const gate=deferred(),a=setup(()=>gate.promise);
 const first=a.rt.prepare(),second=a.rt.prepare();assert.equal(first,second);assert.equal(a.calls(),1);
 gate.resolve();await first;
 assert.equal(await a.rt.stop(),'안녕하세요.');
 await a.rt.prepare();assert.equal(a.calls(),1);assert.equal(a.sockets[0].readyState,1);
 a.rt.close();assert.equal(a.sockets[0].readyState,3);
});
test('Leaving during credential issuance prevents a late connection',async()=>{
 const gate=deferred(),a=setup(()=>gate.promise),pending=a.rt.prepare();a.rt.close();gate.resolve();
 await assert.rejects(pending,/closed/);assert.equal(a.sockets.length,0);
 await a.rt.prepare();assert.equal(a.calls(),2);a.rt.close();
});
test('429 respects Retry-After, including file fallback cleanup',async()=>{
 let limited=true;const a=setup(()=>{if(limited)throw new ApiError(429,90);});
 await assert.rejects(a.rt.prepare());a.rt.close();
 a.advance(60000);await assert.rejects(a.rt.prepare(),/cooldown/);assert.equal(a.calls(),1);
 limited=false;a.advance(30001);await a.rt.prepare();assert.equal(a.calls(),2);a.rt.close();
});
test('A disconnected session reconnects only when explicitly prepared',async()=>{
 const a=setup();await a.rt.prepare();a.sockets[0].close();assert.equal(a.calls(),1);
 await a.rt.prepare();assert.equal(a.calls(),2);a.rt.close();
});
