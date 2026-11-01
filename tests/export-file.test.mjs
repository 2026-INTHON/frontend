import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import vm from 'node:vm';
const source=stripTypeScriptTypes(readFileSync(new URL('../src/lib/export-file.ts',import.meta.url),'utf8').replace(/^import .*;$/gm,'').replace(/^export /gm,''),{mode:'transform'});
test('Web exports download on tap without prefetching the file or opening a share dialog; stale tickets refresh',async()=>{
 let clicks=0,tickets=0,now=0;const anchors=[];
 const context=vm.createContext({Platform:{OS:'web'},Date:{now:()=>now},
  api:{exportDownload:async()=>({url:'https://app.test/private?token='+ ++tickets,filename:'malo.mp4',mimeType:'video/mp4'})},
  fetch:()=>assert.fail('The browser, not JS memory, must stream the download'),
  navigator:{share:()=>assert.fail('Download must not open OS share')},
  document:{createElement:()=>{const a={click:()=>clicks++,remove:()=>{}};anchors.push(a);return a;},body:{appendChild:()=>{}}},
 });
 vm.runInContext(source+'\nthis.prepare=prepareExport',context);
 const file=await context.prepare('own-job','video');assert.equal(clicks,0);assert.equal(tickets,1);
 assert.equal(await file.save(),'downloaded');assert.equal(clicks,1);assert.equal(tickets,1);
 assert.equal(anchors[0].download,'malo.mp4');assert.equal(anchors[0].referrerPolicy,'no-referrer');
 now=10*60*1000;await file.save();assert.equal(tickets,2);assert.match(anchors[1].href,/token=2$/);
 file.dispose();
});
