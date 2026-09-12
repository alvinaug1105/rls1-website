/* eslint-disable typescript/no-implied-eval -- Transpile and execute only checked-in local test modules without adding a runtime dependency. */
import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cache = new Map();
function load(file) {
  const full = path.resolve(root, file);
  if (cache.has(full)) return cache.get(full);
  const exports = {};
  cache.set(full, exports);
  const source = ts.transpileModule(fs.readFileSync(full, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  new Function('exports', 'require', source)(exports, (p) =>
    load(path.relative(root, path.resolve(path.dirname(full), p + '.ts'))),
  );
  return exports;
}
const png=load('app/result-png.ts');
const calls=[];
const ctx={font:'24px Arial',measureText(s){const size=Number(this.font.match(/(\d+)px/)[1]);return {width:Array.from(s).length*size*.65};},fillText(s,x,y){calls.push({s,x,y,width:this.measureText(s).width});},fillRect(){}};
const canvas={width:0,height:0,getContext(){return ctx;}};
const rows=Array.from({length:8},(_,i)=>({driver:`Driver ${i+1} `+'VeryLongUnbrokenName'.repeat(5),team:'A long racing team name '.repeat(8),ms:60000+i*1000,attempts:3,points:25-i,duelMs:62000+i*1000}));
function bounds(){for(const t of calls){assert(t.x+t.width<=canvas.width,`Right clipping: ${t.s}`);assert(t.y+24<canvas.height,`Bottom clipping: ${t.s}`);}calls.length=0;}
const qual=png.qualifyingGraphic(6,rows);assert.equal(qual.rows.length,8);assert.equal(qual.rows[1].cells[4],'+1.000');assert.equal(qual.rows[0].cells[2],'3/3');
png.drawResultGraphic(canvas,qual);bounds();
const race=png.raceGraphic(5,rows);assert.equal(race.rows[0].cells[3],'25');assert(race.footer[0].includes(rows[0].driver));png.drawResultGraphic(canvas,race);bounds();
const record={round:6,qualifyingBody:'',winners:{QF1:rows[0].driver,QF2:rows[3].driver,QF3:rows[1].driver,QF4:rows[2].driver,SF1:rows[0].driver,SF2:rows[1].driver,FINAL:rows[0].driver},laps:{[rows[0].driver]:62000}};
png.drawDuelGraphic(canvas,6,rows,record);assert(calls.some(t=>t.s.includes('QUARTER-FINALS')));bounds();
for(const width of [320,375,1440]){globalThis.innerWidth=width;png.drawResultGraphic(canvas,qual);assert.equal(canvas.width,1200);bounds();png.drawDuelGraphic(canvas,6,rows,record);assert.equal(canvas.width,1500);bounds();}
ctx.font='24px Arial';assert.equal(png.wrapText(ctx,rows[0].driver,100).join(''),rows[0].driver);
console.log('PASS: qualifying/race data, full Duel bracket, long names without truncation, canvas bounds and viewport-independent export dimensions.');
