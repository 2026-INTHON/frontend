import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import vm from 'node:vm';
const source=file=>stripTypeScriptTypes(readFileSync(new URL('../src/lib/'+file,import.meta.url),'utf8').replace(/^import .*;$/gm,'').replace(/^export /gm,''),{mode:'transform'});
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
function setup(handler,initial=null){
 let token=initial;
 const context=vm.createContext({process:{env:{}},Platform:{OS:'web'},URLSearchParams,FormData,AbortController,setTimeout,clearTimeout,
  getTokens:async()=>token,setTokens:async t=>{token=t;},fetch:async(url,init)=>handler(new URL(url).pathname.replace('/api/v1',''),init,new URL(url).searchParams),
 });
 vm.runInContext(source('api.ts')+'\nthis.client={api,guest,refresh};',context);
 return context.client;
}
test('Concurrent first requests create one guest and one in-flight session',async()=>{
 let guests=0,starts=0;const gate=deferred();
 const {api}=setup(async path=>{
  if(path==='/auth/guest'){guests++;await gate.promise;return Response.json({accessToken:'guest',refreshToken:'refresh'});}
  starts++;await new Promise(r=>setTimeout(r,5));return Response.json({id:'session'});
 });
 const calls=Array.from({length:8},()=>api.start('scene',{personalityId:'calm'}));
 gate.resolve();const results=await Promise.all(calls);
 assert.equal(guests,1);assert.equal(starts,1);assert.ok(results.every(r=>r.id==='session'));
 await api.start('scene',{personalityId:'calm'});assert.equal(starts,2);
});
test('Concurrent expired requests rotate the refresh token once',async()=>{
 let refreshes=0;const gate=deferred();
 const {api}=setup(async(path,init)=>{
  if(path==='/auth/refresh'){refreshes++;await gate.promise;return Response.json({accessToken:'new',refreshToken:'rotated'});}
  if(init.headers.Authorization==='Bearer old')return Response.json({error:{message:'expired'}},{status:401});
  assert.equal(init.headers.Authorization,'Bearer new');return Response.json({ok:true});
 },{accessToken:'old',refreshToken:'single-use',user:{isGuest:false}});
 const calls=Array.from({length:8},()=>api.get('/me'));setTimeout(gate.resolve,10);
 await Promise.all(calls);assert.equal(refreshes,1);
});
test('Failed scene creation clears the in-flight entry so retry can succeed',async()=>{
 let starts=0;const {api}=setup(async()=>++starts===1?Response.json({error:{message:'wait'}},{status:429}):Response.json({id:'retried'}),{accessToken:'token'});
 await assert.rejects(api.start('scene',{}));assert.equal((await api.start('scene',{})).id,'retried');assert.equal(starts,2);
});
test('A temporary refresh failure preserves the login for retry',async()=>{
 let refreshes=0;const {api}=setup(async(path,init)=>{
  assert.notEqual(path,'/auth/guest');
  if(path==='/auth/refresh')return ++refreshes===1?Response.json({error:{message:'unavailable'}},{status:503}):Response.json({accessToken:'new',refreshToken:'rotated'});
  return init.headers.Authorization==='Bearer old'?Response.json({error:{message:'expired'}},{status:401}):Response.json({ok:true});
 },{accessToken:'old',refreshToken:'kept',user:{isGuest:false}});
 await assert.rejects(api.get('/me'));assert.equal((await api.get('/me')).ok,true);assert.equal(refreshes,2);
});
test('Concurrent token readers wait for native storage before creating auth requests',async()=>{
 let reads=0;const gate=deferred();
 const context=vm.createContext({Platform:{OS:'ios'},SecureStore:{getItemAsync:()=>{reads++;return gate.promise;},setItemAsync:async()=>{},deleteItemAsync:async()=>{}}});
 vm.runInContext(source('tokens.ts')+'\nthis.tokens={getTokens,setTokens};',context);
 const first=context.tokens.getTokens(),second=context.tokens.getTokens(),write=context.tokens.setTokens({accessToken:'fresh'});
 gate.resolve(JSON.stringify({accessToken:'stored'}));
 assert.equal((await first).accessToken,'stored');assert.equal((await second).accessToken,'stored');
 await write;assert.equal((await context.tokens.getTokens()).accessToken,'fresh');assert.equal(reads,1);
});

 test('Report reads, generation and retry use UI language independently of learning pack',async()=>{
  const seen=[];const {api}=setup(async(path,init,query)=>{seen.push({path,language:query.get('language')});return Response.json({status:'queued'});},{accessToken:'token'});
  await api.report('session','ja');await api.makeReport('session','en');await api.retryReport('session','zh');
  assert.deepEqual(seen,[{path:'/sessions/session/report',language:'ja'},{path:'/sessions/session/report',language:'en'},{path:'/sessions/session/report/retry',language:'zh'}]);
 });
