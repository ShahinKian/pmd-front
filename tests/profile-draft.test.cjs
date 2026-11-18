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
const numbers=load('lib/number-input.ts');
const time=load('lib/program-profiles/start-time.ts',{'@/lib/number-input':numbers});
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
test('source crew identifiers become editable draft values before the first save',()=>{
  const source={rowId:'source-1',personnelId:'123',personnelName:null,activityTypeId:null,activityTypeName:null,jobId:'4',jobName:null,isPresent:false};
  assert.equal(helpers.isProfileDraft({...draft,crew:[source]}),false);
  const crew=helpers.normalizeDraftCrew(source);
  assert.equal(crew.personnelId,123);
  assert.equal(crew.activityTypeId,0);
  assert.equal(crew.jobId,4);
  assert.equal(crew.personnelName,'');
  assert.equal(crew.isPresent,false);
  assert.equal(helpers.isProfileDraft(JSON.parse(JSON.stringify({...draft,step:1,crew:[crew]}))),true);
  const edited={...crew,personnelName:'نام ویرایش‌شده',activityTypeId:7,activityTypeName:'فعالیت'};
  assert.equal(JSON.stringify(helpers.normalizeDraftCrew(edited)),JSON.stringify(edited));
});
test('manual start time accepts Persian digits and short entries while enforcing clock ranges',()=>{
  for(const [input,expected] of [['۹:۵','09:05'],['٠٩:٣٠','09:30'],['23:59','23:59'],['12:30:45','12:30'],['00:00','00:00']])
    assert.equal(time.normalizeStartTime(input),expected);
  for(const value of ['',':','12:','24:00','12:60','-1:30','12:30:60','abc'])
    assert.equal(time.normalizeStartTime(value),null);
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
