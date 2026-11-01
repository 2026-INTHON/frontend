import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
const file=readFileSync(new URL('../src/app/scene/[id].tsx',import.meta.url),'utf8');
const block=file.slice(file.indexOf('  async function micDown() {'),file.indexOf('  // ----- 보내기'));
function deferred(){let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};}
function setup(){
 const start=deferred(),stop=deferred(),events=[];let starts=0,stops=0;
 const ctx=vm.createContext({recordingId:'own-scene',micActive:{current:false},micStarting:{current:false},micRequest:{current:0},recMode:{current:'file'},rt:{current:null},
  rec:{start:()=>{starts++;return start.promise;},stop:()=>{stops++;return stop.promise;}},
  screenRecorder:{setMicrophoneActive:(owner,on)=>events.push([owner,on])},
  canRealtime:()=>false,stopPlay(){},haptic:{tap(){}},t:x=>x,setNotice(){},setPreview(){},setMicPreparing(){},setPhase(){},
  myAudio:{current:null},setRtHeard(){},setHeard(){},setTid(){},setEditHeard(){},setPause(){},
  eng:{current:{transcribe:async()=>({text:'hello'})}},SceneError:class extends Error{}
 });
 vm.runInContext(stripTypeScriptTypes(block,{mode:'transform'}),ctx);return {ctx,events,start,stop,counts:()=>({starts,stops})};
}
test('Tap-to-speak opens video microphone only after input is ready; stop closes it before transcription',async()=>{
 const x=setup(),pending=x.ctx.micDown();await x.ctx.micDown();assert.equal(x.counts().starts,1);assert.equal(x.events.length,0);
 x.start.resolve(true);await pending;assert.deepEqual(x.events.at(-1),['own-scene',true]);
 const stopped=x.ctx.micStop();assert.deepEqual(x.events.at(-1),['own-scene',false]);
 await x.ctx.micStop();assert.equal(x.counts().stops,1,'Duplicate stop cannot retranscribe');
 x.stop.resolve('blob:input');await stopped;assert.equal(x.ctx.micActive.current,false);
});
test('Leaving or changing input during microphone preparation never reopens the video microphone',async()=>{
 const x=setup(),pending=x.ctx.micDown();x.ctx.cancelMic();x.stop.resolve(null);x.start.resolve(true);await pending;
 assert.equal(x.ctx.micActive.current,false);assert.ok(x.events.every(([,on])=>on===false));
});
test('Failed microphone permission cannot enable voice in the video',async()=>{
 const x=setup(),pending=x.ctx.micDown();x.start.resolve(false);await pending;
 assert.equal(x.ctx.micActive.current,false);assert.ok(x.events.every(([,on])=>on===false));
});
test('Opening pause ends an active speaking interval immediately',async()=>{
 const x=setup(),pending=x.ctx.micDown();x.start.resolve(true);await pending;x.ctx.openPause();
 assert.equal(x.ctx.micActive.current,false);assert.deepEqual(x.events.at(-1),['own-scene',false]);x.stop.resolve('blob:input');
});
