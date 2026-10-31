import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import vm from 'node:vm';
test('Today scene resolves without translation and only uses the requested language',async()=>{
 let translation;
 const context=vm.createContext({SERVER_CHAR:{seoyun:'girlfriend'},SERVER_PERSONA:{calm:'calm'},api:{chapters:async()=>[{subs:[{sceneId:'gf-1-1',title:'자기소개',state:'open',translation}]}]}});
 const source=stripTypeScriptTypes(readFileSync(new URL('../src/lib/engine.ts',import.meta.url),'utf8').replace(/^import .*;$/gm,'').replace(/^export /gm,''),{mode:'transform'});
 vm.runInContext(source+'\nthis.resolve=resolveTodayScene;',context);
 assert.equal((await context.resolve('seoyun','calm','ko')).title,'자기소개');
 translation={language:'ja',title:'自己紹介'};
 assert.equal((await context.resolve('seoyun','calm','ko','ja')).title,'自己紹介');
 assert.equal((await context.resolve('seoyun','calm','ko','en')).title,'자기소개');
});
