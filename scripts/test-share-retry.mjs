import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=readFileSync('public/assets/story.js','utf8');
const helpers=source.slice(source.indexOf('function sharedGamePage(){'),source.indexOf('async function boot(){'));
function setup(fetch){
 let html='';const location={search:'?game=original-token',href:'https://example.com/?game=original-token'};
 const context=vm.createContext({fetch,location,AbortController,setTimeout,clearTimeout,encodeURIComponent,valid:story=>story?.title==='Adventure',blankPlay:()=>({}),render:()=>{html=vm.runInContext('sharedGamePage()',context)}});
 vm.runInContext(`let sharedGameLoad=null,sharedGameRequest=0,view='title',project={title:'Local draft'},selected,play,published=false,featured=false,shareLink;${helpers}`,context);
 return {context,location,html:()=>html,run:code=>vm.runInContext(code,context)};
}
for(const failure of [()=>Promise.reject(Error('Offline')),async()=>({status:503,ok:false}),async()=>({status:200,ok:true,json:async()=>{throw Error('Bad JSON')}}),async()=>({status:200,ok:true,json:async()=>({story:{title:'Invalid'}})})]){
 const t=setup(failure);await t.run("loadSharedGame('original-token')");assert.equal(t.location.search,'?game=original-token');assert.match(t.html(),/>Retry</);assert.equal(t.run('project.title'),'Local draft');
 t.context.fetch=async()=>({status:200,ok:true,json:async()=>({story:{title:'Adventure',opening:'start'}})});
 await t.run("loadSharedGame('original-token')");assert.equal(t.run('view'),'play');assert.equal(t.run('project.title'),'Adventure');assert.equal(t.location.search,'?game=original-token');
}
{
 const t=setup(async()=>({status:404,ok:false}));await t.run("loadSharedGame('original-token')");assert.match(t.html(),/owner may have stopped sharing/);assert.doesNotMatch(t.html(),/>Retry</);assert.equal(t.location.search,'?game=original-token');
}
{
 let resolve;const t=setup(()=>new Promise(r=>resolve=r));const pending=t.run("loadSharedGame('original-token')");assert.match(t.html(),/Opening your adventure/);
 t.location.search='';t.run("view='edit'");resolve({status:200,ok:true,json:async()=>({story:{title:'Adventure',opening:'start'}})});await pending;assert.equal(t.run('view'),'edit');assert.equal(t.run('project.title'),'Local draft');
}
{
 const t=setup((_path,options)=>new Promise((_resolve,reject)=>options.signal.addEventListener('abort',()=>reject(Error('Timeout')))));
 t.context.setTimeout=fn=>{queueMicrotask(fn);return 1};t.context.clearTimeout=()=>{};
 await t.run("loadSharedGame('original-token')");assert.match(t.html(),/>Retry</);assert.equal(t.location.search,'?game=original-token');
}
console.log('PASS: preserved links, retry recovery, 404 messaging, loading state, timeout and stale navigation');
