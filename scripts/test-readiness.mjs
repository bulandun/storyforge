import ts from 'typescript';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const dir=mkdtempSync(path.join(process.cwd(),'.readiness-test-'));
try {
  writeFileSync(path.join(dir,'store.mjs'), 'export function storyDb(){return globalThis.__readyDb()}');
  const source=readFileSync('app/api/ready/route.ts','utf8').replace("'@/lib/story-store'","'./store.mjs'").replace("'next/server'","'next/server.js'").replace('const PROBE_TIMEOUT_MS = 3000','const PROBE_TIMEOUT_MS = 20');
  writeFileSync(path.join(dir,'ready.mjs'),ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);
  const {GET}=await import(pathToFileURL(path.join(dir,'ready.mjs')));
  let queries=[];
  globalThis.__readyDb=async()=>({execute:async sql=>queries.push(sql)});
  let response=await GET();assert.equal(response.status,200);assert.deepEqual(await response.json(),{ready:true});assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(queries.length,2);
  for(const failure of [async()=>{throw Error('secret token')},async()=>({execute:async()=>{throw Error('missing table')}})]){
    globalThis.__readyDb=failure;response=await GET();assert.equal(response.status,503);assert.deepEqual(await response.json(),{ready:false});assert.equal(response.headers.get('cache-control'),'no-store');
  }
  let resolve,calls=0;
  globalThis.__readyDb=()=>{calls++;return new Promise(r=>resolve=r)};
  const failures=await Promise.all([GET(),GET()]);assert.equal(calls,1);assert.ok(failures.every(r=>r.status===503));
  resolve({execute:async()=>{}});await new Promise(r=>setImmediate(r));
  globalThis.__readyDb=async()=>({execute:async()=>{}});assert.equal((await GET()).status,200);
  assert.match(readFileSync('render.yaml','utf8'),/healthCheckPath: \/api\/ready/);
  console.log('PASS: database readiness, failures, bounded timeout, shared probes, recovery and Render configuration');
} finally {delete globalThis.__readyDb;rmSync(dir,{recursive:true,force:true})}
