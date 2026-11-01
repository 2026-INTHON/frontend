import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import vm from 'node:vm';
const source=readFileSync(new URL('../src/components/screen-recording.tsx',import.meta.url),'utf8');
// Exercise the report's real effect without requiring a DOM or a media permission prompt.
const effect=stripTypeScriptTypes(source.slice(source.indexOf('export function RecordingResult'),source.indexOf('  // An old report')).replace('export ','')+'}',{mode:'transform'});
function setup(){
 let now=0,serial=0,calls=0,deps,cleanup,state={owner:'recording-a',phase:'recording',bytes:1};const timers=new Map();
 const ctx=vm.createContext({useScreenRecording:()=>state,screenRecorder:{stop:()=>{calls++;}},
  setTimeout:(fn,ms)=>{const id=++serial;timers.set(id,{at:now+ms,fn});return id;},clearTimeout:id=>timers.delete(id),
  useEffect:(fn,next)=>{if(deps&&next.every((v,i)=>Object.is(v,deps[i])))return;cleanup?.();deps=next;cleanup=fn();}
 });
 vm.runInContext(effect,ctx);
 return {render:(owner='recording-a',patch={})=>{state={...state,...patch};ctx.RecordingResult({owner});},
  advance:ms=>{now+=ms;for(const [id,t] of timers){if(t.at<=now){timers.delete(id);t.fn();}}},unmount:()=>cleanup?.(),calls:()=>calls};
}
test('Report stops recording at three seconds; arriving video chunks do not extend the deadline',()=>{
 const x=setup();x.render();x.advance(2000);x.render('recording-a',{bytes:1000});x.advance(999);assert.equal(x.calls(),0);
 x.advance(1);assert.equal(x.calls(),1);x.advance(10000);assert.equal(x.calls(),1);
});
test('Manual stop and report unmount cancel the pending automatic stop',()=>{
 for(const action of ['manual','unmount']){const x=setup();x.render();x.advance(1000);
  if(action==='manual')x.render('recording-a',{phase:'ready'});else x.unmount();
  x.advance(3000);assert.equal(x.calls(),0);
 }
});
test('A previous report cannot stop another recording, including when its owner changes',()=>{
 const x=setup();x.render('previous-recording');x.advance(3000);assert.equal(x.calls(),0);
 x.render();x.advance(1000);x.render('recording-a',{owner:'new-recording'});x.advance(3000);assert.equal(x.calls(),0);
});
