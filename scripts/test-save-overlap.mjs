import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=readFileSync('public/assets/story.js','utf8');
const functions=source.slice(source.indexOf('function updateCloudControls(){'),source.indexOf('async function shrinkImage'));
function setup(){
  const calls=[], deferred=[];
  const status={textContent:''};
  const context=vm.createContext({crypto:{randomUUID:()=> 'stable-new-id'},safeLocal:{setItem(){}},window:{storyforgeAuth:{userId:'a'}},app:{querySelectorAll:()=>[]},$:()=>status,toast(){},showAccountRequired(){},ensureAccount:async()=>true,
    cloudRequest:(path,options,account)=>{calls.push({path,options,account});return new Promise((resolve,reject)=>deferred.push({resolve,reject}))}});
  vm.runInContext(`let project={title:'Original'},draftRevision=0,cloudStoryId=null,cloudBusy=false,savedDraft=null,accountEpoch=0;const pendingDraftIds=new WeakMap();${functions}`,context);
  return {context,calls,deferred,status,run:(code)=>vm.runInContext(code,context)};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
{
 const t=setup();const saving=t.run("runCloudOperation('save-story')");await tick();
 assert.equal(await t.run("runCloudOperation('publish')"),null);assert.equal(t.calls.length,1);
 t.run("project.title='Later';draftRevision++");t.deferred[0].resolve({id:'stable-new-id'});await saving;
 assert.match(t.status.textContent,/Unsaved/);assert.equal(JSON.parse(t.calls[0].options.body).story.title,'Original');
 t.run('updateCloudControls()');assert.match(t.status.textContent,/Unsaved/);
}
{
 const t=setup();const publishing=t.run("runCloudOperation('publish')");await tick();
 t.deferred[0].resolve({id:'stable-new-id'});await tick();assert.equal(t.calls.length,2);
 assert.equal(await t.run("runCloudOperation('save-story')"),null);
 t.run("project.title='Newer';draftRevision++");t.deferred[1].resolve({token:'share-token'});
 const result=await publishing;assert.equal(result.snapshot.title,'Original');assert.match(t.status.textContent,/Unsaved/);
}
for(const change of ["project={title:'Another game'}", "window.storyforgeAuth.userId='b';accountEpoch++", "accountEpoch+=2"]){
 const t=setup();const saving=t.run("runCloudOperation('publish')");await tick();t.run(change);t.deferred[0].resolve({id:'old-id'});
 assert.equal(await saving,null);assert.equal(t.run('cloudStoryId'),null);assert.equal(t.calls.length,1);
}
{
 const t=setup();const saving=t.run("runCloudOperation('save-story')");await tick();t.deferred[0].reject(Error('Network error'));assert.equal(await saving,null);
 const retry=t.run("runCloudOperation('save-story')");await tick();assert.equal(JSON.parse(t.calls[0].options.body).id,JSON.parse(t.calls[1].options.body).id);
 t.deferred[1].resolve({id:'stable-new-id'});await retry;assert.match(t.status.textContent,/Saved privately/);
}
console.log('PASS: serialized save/publish, snapshots, dirty revisions, stale draft/account responses and retry IDs');
