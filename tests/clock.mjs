/* eslint-disable typescript/no-implied-eval -- Execute checked-in pure clock module. */
import ts from 'typescript';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const mod = {};
new Function('exports', ts.transpileModule(fs.readFileSync('lib/league-clock.ts','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(mod);
const trueTime=Date.parse('2026-09-09T20:59:59+08:00');
for(const skew of [0,300000,-300000,3600000,-3600000]) {
 let mono=0, failed=false, timers=0, requests=0, callback;
 const clock=mod.createLeagueClock({wall:()=>trueTime+skew+mono,mono:()=>mono,server:async()=>{requests++;if(failed)throw Error('offline');mono+=200;return trueTime+mono-100;},interval:fn=>{callback=fn;timers++;return 1;},clear:()=>timers--});
 const stop=clock.subscribe(()=>{}), stop2=clock.subscribe(()=>{});
 await clock.sync();assert.equal(timers,1);assert.equal(requests,1);
 assert.equal(clock.now(),trueTime+200);
 mono=1000;callback();assert.equal(clock.snapshot(),Date.parse('2026-09-09T21:00:00+08:00'));
 mono=2000;assert.equal(clock.now(),trueTime+2000);
 failed=true;await clock.sync();assert.equal(clock.now(),trueTime+2000);
 mono=302000;failed=false;clock.resume();await clock.sync();assert.equal(clock.now(),trueTime+mono);
 stop();assert.equal(timers,1);stop2();assert.equal(timers,0);
}
let t=0;
const fallback=mod.createLeagueClock({wall:()=>1234,mono:()=>t,server:async()=>{throw Error('offline');},interval:()=>1,clear:()=>{}});
await fallback.sync();assert.equal(fallback.now(),1234);t=60000;fallback.resume();await fallback.sync();assert(Number.isFinite(fallback.now()));
console.log('PASS: skew, latency, shared interval, exact HKT boundary, offline fallback, retry and resume.');
