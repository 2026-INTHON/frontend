import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import vm from 'node:vm';
const source = stripTypeScriptTypes(readFileSync(new URL('../src/lib/screen-recorder.ts',import.meta.url),'utf8').replace(/^export /gm,''),{mode:'transform'});
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function setup({surface='browser',audio=true,micDenied=false,mime='video/mp4',deferDisplay=false,deferMic=false,wrongTab=false}={}) {
 const tracks=[], connections=[], downloads=[], revoked=[], recorders=[]; let handle, displayCalls=0,micCalls=0,releaseDisplay,releaseMic;
 class Track { constructor(kind){this.kind=kind;this.stopped=false;this.enabled=true;this.events={};tracks.push(this);} stop(){this.stopped=true;} getSettings(){return {displaySurface:surface};} getCaptureHandle(){return {handle:wrongTab?'another-tab':handle};} addEventListener(k,fn){this.events[k]=fn;} end(){this.events.ended?.();} async cropTo(){this.cropped=true;} }
 class Stream { constructor(ts){this.ts=ts;} getTracks(){return this.ts;} getVideoTracks(){return this.ts.filter(t=>t.kind==='video');} getAudioTracks(){return this.ts.filter(t=>t.kind==='audio');} }
 const video=new Track('video'),tabAudio=new Track('audio'),microphone=new Track('audio');
 const display=new Stream(audio?[video,tabAudio]:[video]),mic=new Stream([microphone]);
 const gains=[];
 class Audio {state='running'; createGain(){const g={gain:{value:1},connect(){}};gains.push(g);return g;} async resume(){} async close(){this.state='closed';} createMediaStreamDestination(){return {stream:new Stream([new Track('audio')])};} createMediaStreamSource(s){return {connect:()=>connections.push(s)};} }
 class Recorder { static isTypeSupported(type){return type.startsWith(mime);} constructor(s,o){this.stream=s;this.mimeType=o.mimeType;this.state='inactive';recorders.push(this);} start(){this.state='recording';} stop(){this.state='inactive';queueMicrotask(()=>{this.ondataavailable({data:new Blob(['real-screen-bytes'])});this.onstop();});} }
 const context=vm.createContext({window:{isSecureContext:true},navigator:{mediaDevices:{
 setCaptureHandleConfig(c){handle=c.handle;}, getDisplayMedia(){displayCalls++;return deferDisplay?new Promise(r=>{releaseDisplay=()=>r(display);}):Promise.resolve(display);},
 getUserMedia(){micCalls++;if(micDenied)return Promise.reject(new Error('denied'));return deferMic?new Promise(r=>{releaseMic=()=>r(mic);}):Promise.resolve(mic);}
 }},MediaRecorder:Recorder,AudioContext:Audio,MediaStream:Stream,Blob,Date,Set,Error,crypto:{randomUUID:()=> 'current-tab-handle'},location:{origin:'https://malo.test'},
 document:{getElementById:()=>({}),createElement:()=>{const a={click:()=>downloads.push(a),remove(){}};return a;},body:{appendChild(){}}},
 URL:{createObjectURL:()=> 'blob:local-recording',revokeObjectURL:u=>revoked.push(u)},setInterval:()=>123,clearInterval(){},CropTarget:{fromElement:async()=>({})}
 });
 vm.runInContext(source+'\nthis.rec = new ScreenRecorder();',context);
 return {rec:context.rec,tracks,connections,gains,downloads,revoked,recorders,video,microphone,display,mic,releaseDisplay:()=>releaseDisplay(),releaseMic:()=>releaseMic(),calls:()=>({displayCalls,micCalls})};
}
test('Records real tab video with tab + microphone audio, stops all resources, and saves without rendering/fetch',async()=>{
 const x=setup();assert.equal(await x.rec.start('scene-1','/scene/today'),true);
 assert.equal(x.rec.getSnapshot().phase,'recording');assert.equal(x.video.cropped,true);
 assert.deepEqual(x.connections,[x.display,x.mic]);assert.equal(x.recorders[0].stream.getVideoTracks()[0],x.video);
 assert.equal(x.recorders[0].stream.getAudioTracks().length,1);
 assert.equal(await x.rec.start('scene-2','/scene/another'),false);
 await Promise.all([x.rec.stop(),x.rec.stop()]);assert.equal(x.rec.getSnapshot().phase,'ready');
 assert.ok(x.tracks.every(t=>t.stopped));assert.equal(x.rec.hasUnsaved(),true);
 x.rec.download();assert.match(x.downloads[0].download,/\.mp4$/);assert.equal(x.rec.hasUnsaved(),false);
 assert.equal(await x.rec.start('scene-2','/scene/another'),false,'Never overwrite even a downloaded clip without explicit discard');
 x.rec.discard();assert.deepEqual(x.revoked,['blob:local-recording']);assert.equal(x.rec.getSnapshot().phase,'idle');
});
test('Window / other tab and missing tab audio are rejected before requesting microphone',async()=>{
 for(const opts of [{surface:'window'},{wrongTab:true},{audio:false}]){
  const x=setup(opts);assert.equal(await x.rec.start('a','/scene/a'),false);assert.equal(x.rec.getSnapshot().phase,'error');
  assert.equal(x.calls().micCalls,0);assert.equal(x.video.stopped,true);
 }
});
test('Denied microphone releases capture and reports the missing permission',async()=>{
 const x=setup({micDenied:true});assert.equal(await x.rec.start('a','/scene/a'),false);assert.equal(x.video.stopped,true);assert.match(x.rec.getSnapshot().error,/마이크/);
});
test('Cancel while the display picker is pending releases any late stream; it cannot revive recording',async()=>{
 const x=setup({deferDisplay:true});const pending=x.rec.start('a','/scene/a');assert.equal(x.calls().displayCalls,1);
 await x.rec.stop();x.releaseDisplay();assert.equal(await pending,false);assert.equal(x.rec.getSnapshot().phase,'idle');assert.equal(x.video.stopped,true);assert.equal(x.calls().micCalls,0);
});
test('Cancel during microphone permission releases both sources when permission eventually resolves',async()=>{
 const x=setup({deferMic:true});const pending=x.rec.start('a','/scene/a');await tick();await x.rec.stop();x.releaseMic();
 assert.equal(await pending,false);assert.equal(x.video.stopped,true);assert.equal(x.microphone.stopped,true);assert.equal(x.rec.getSnapshot().phase,'idle');
});
test('Browser Stop sharing finalizes a downloadable WebM with a matching extension',async()=>{
 const x=setup({mime:'video/webm'});await x.rec.start('a','/scene/a');x.video.end();await tick();
 assert.equal(x.rec.getSnapshot().phase,'ready');x.rec.download();assert.match(x.downloads[0].download,/\.webm$/);
});
test('Browsers offering both containers use VP8/Opus; MP4-only browsers choose their own H.264 profile',async()=>{
 for(const [offered,expected] of [['video/','video/webm;codecs=vp8,opus'],['video/mp4','video/mp4']]){
  const x=setup({mime:offered});await x.rec.start('a','/scene/a');
  assert.equal(x.recorders[0].mimeType,expected);
  await x.rec.stop();assert.equal(x.rec.getSnapshot().mime,expected);
  x.rec.download();assert.ok(x.downloads[0].download.endsWith(expected.includes('webm')?'.webm':'.mp4'));
 }
});
test('Lost microphone stops rather than silently recording mute; the partial recording remains saveable',async()=>{
 const x=setup();await x.rec.start('a','/scene/a');x.microphone.end();await tick();
 assert.equal(x.rec.getSnapshot().phase,'ready');assert.match(x.rec.getSnapshot().notice,/음성/);assert.ok(x.tracks.every(t=>t.stopped));
});
test('Recorder failure finalizes available bytes and explains the partial result',async()=>{
 const x=setup();await x.rec.start('a','/scene/a');x.recorders[0].onerror();await tick();
 assert.equal(x.rec.getSnapshot().phase,'ready');assert.match(x.rec.getSnapshot().notice,/중단/);
});

test('Microphone is silent by default, enabled only within speaking intervals, and closed synchronously on stop',async()=>{
 const x=setup();await x.rec.start('a','/scene/a');
 assert.equal(x.microphone.enabled,false);assert.equal(x.gains[0].gain.value,0);
 assert.equal(x.rec.getSnapshot().microphoneActive,false);
 x.rec.setMicrophoneActive('other-scene',true);assert.equal(x.microphone.enabled,false);
 x.rec.setMicrophoneActive('a',true);assert.equal(x.microphone.enabled,true);assert.equal(x.gains[0].gain.value,1);
 x.rec.setMicrophoneActive('a',false);assert.equal(x.microphone.enabled,false);assert.equal(x.gains[0].gain.value,0);
 assert.equal(x.rec.getSnapshot().phase,'recording');assert.equal(x.video.stopped,false);
 assert.equal(x.display.getAudioTracks()[0].enabled,true,'Character/tab audio stays on between learner turns');
 x.rec.setMicrophoneActive('a',true);const stopping=x.rec.stop();
 assert.equal(x.microphone.enabled,false,'Gate closes before asynchronous recorder finalization');assert.equal(x.gains[0].gain.value,0);
 x.rec.setMicrophoneActive('a',true);assert.equal(x.microphone.enabled,false,'Late callbacks cannot reopen a stopped recording');
 await stopping;assert.equal(x.rec.getSnapshot().microphoneActive,false);
});
