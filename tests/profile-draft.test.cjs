const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');
function load(file,deps={}){
  const exports={};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,{exports,require:name=>deps[name]??require(name),process});
  return exports;
}
const search=load('lib/base-info/search.ts');
const helpers=load('lib/program-profiles/draft.ts',{'@/lib/base-info/search':search});
const draft={version:1,forecastId:'11111111-1111-4111-8111-111111111111',title:'برنامه',step:2,startTime:'12:00',occasion:'',items:[],crew:[],itemsLoaded:true,crewLoaded:true,keywords:[],axes:[],experts:[],issuedProfileId:null,completed:false};
test('restoring deleted source rows preserves edits and manual rows, without duplicates',()=>{
  const current=[{rowId:'1',name:'edited'},{rowId:'manual',name:'new'}];
  const merged=helpers.restoreMissing(current,[{rowId:'1',name:'source'},{rowId:'2',name:'deleted'},{rowId:'2',name:'duplicate'}]);
  assert.equal(merged.length,3);assert.equal(merged[0].name,'edited');assert.equal(merged[2].name,'deleted');
  assert.equal(helpers.restoreMissing(merged,merged).length,3);
});
test('sound operators are excluded with different Persian spacing',()=>{
  for(const name of ['صدابردار','صدا بردار','صدا‌بردار استودیو'])assert.equal(helpers.isSoundOperator(name),true);
  assert.equal(helpers.isSoundOperator('تهیه‌کننده','گوینده'),false);
});
test('draft validation accepts incomplete work but rejects malformed rows',()=>{
  assert.equal(helpers.isProfileDraft(draft),true);
  assert.equal(helpers.isProfileDraft({...draft,items:[{rowId:'1'}]}),false);
  assert.equal(helpers.isProfileDraft({...draft,step:7}),false);
});
test('disk drafts survive a new store instance, isolate users, reject stale saves, and hide completed work',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'profile-draft-test-'));process.env.PROFILE_DRAFTS_DIR=dir;
  try{
    const store=load('lib/program-profiles/draft-store.ts');
    assert.equal(await store.readDraft('user-a',draft.forecastId),null);
    const saved=await store.writeDraft('user-a',draft,0);assert.equal(saved.revision,1);
    const restarted=load('lib/program-profiles/draft-store.ts');
    assert.equal((await restarted.readDraft('user-a',draft.forecastId)).data.step,2);
    assert.equal(await restarted.readDraft('user-b',draft.forecastId),null);
    const lockPath=path.join(dir,require('node:crypto').createHash('sha256').update('user-a').digest('hex'),draft.forecastId+'.json.lock');
    fs.mkdirSync(lockPath);const old=new Date(Date.now()-30000);fs.utimesSync(lockPath,old,old);
    await store.writeDraft('user-a',draft,1);
    await assert.rejects(store.writeDraft('user-a',draft,0),error=>error instanceof store.DraftConflict);
    const results=await Promise.allSettled([store.writeDraft('user-a',{...draft,step:3},2),store.writeDraft('user-a',{...draft,step:4},2)]);
    assert.equal(results.filter(result=>result.status==='fulfilled').length,1);
    assert.equal((await store.listDrafts('user-a')).length,1);
    await store.writeDraft('user-a',{...draft,completed:true},3);
    assert.equal((await store.listDrafts('user-a')).length,0);
  }finally{delete process.env.PROFILE_DRAFTS_DIR;fs.rmSync(dir,{recursive:true,force:true});}
});
