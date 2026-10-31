import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import vm from 'node:vm';
const source=stripTypeScriptTypes(readFileSync(new URL('../src/lib/export-file.ts',import.meta.url),'utf8').replace(/^import .*;$/gm,'').replace(/^export /gm,''),{mode:'transform'});
test('Web export prepares privately, shares only on tap and cancellation never starts a download',async()=>{
 let shares=0,clicks=0,revoked=0;
 const context=vm.createContext({Platform:{OS:'web'},File,Error,
  api:{exportDownload:async()=>({url:'https://app.test/private?token=test',filename:'malo.mp4',mimeType:'video/mp4'})},
  fetch:async()=>new Response('video'),
  URL:{createObjectURL:()=> 'blob:test',revokeObjectURL:()=>revoked++},
  navigator:{canShare:()=>true,share:async()=>{shares++;throw Object.assign(new Error('cancel'),{name:'AbortError'});}},
  document:{createElement:()=>({click:()=>clicks++,remove:()=>{}}),body:{appendChild:()=>{}}},
 });
 vm.runInContext(source+'\nthis.prepare=prepareExport',context);
 const file=await context.prepare('own-job','video');assert.equal(shares,0);assert.equal(clicks,0);
 assert.equal(await file.save(),'cancelled');assert.equal(shares,1);assert.equal(clicks,0);
 file.dispose();assert.equal(revoked,1);
});
