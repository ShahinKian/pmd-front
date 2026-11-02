// Run after npm run build. Only the PMD authentication/forecast service is mocked.
const assert=require('node:assert/strict');
const http=require('node:http');
const {spawn}=require('node:child_process');
const {mkdtemp,rm}=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
(async()=>{
 const directory=await mkdtemp(path.join(os.tmpdir(),'pmd-draft-http-'));
 const backend=http.createServer((req,res)=>{
  res.setHeader('Content-Type','application/json');
  if(req.url==='/api/auth/profile')res.end(JSON.stringify({id:req.headers.authorization==='Bearer other'?'other-user':'test-user'}));
  else if(req.url.startsWith('/api/forecasts/'))res.end('{}');
  else{res.statusCode=404;res.end('{}');}
 });
 await new Promise(resolve=>backend.listen(0,'127.0.0.1',resolve));
 const reservation=http.createServer();await new Promise(resolve=>reservation.listen(0,'127.0.0.1',resolve));
 const port=reservation.address().port;await new Promise(resolve=>reservation.close(resolve));
 let server;
 const start=()=>new Promise((resolve,reject)=>{
  server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{env:{...process.env,API_BASE_URL:`http://127.0.0.1:${backend.address().port}`,PROFILE_DRAFTS_DIR:directory},stdio:['ignore','pipe','pipe']});
  const timeout=setTimeout(()=>reject(Error('Next start timed out')),20000);
  server.once('exit',code=>{clearTimeout(timeout);if(code)reject(Error('Next exited '+code));});
  server.stdout.on('data',chunk=>{if(chunk.toString().includes('Ready')){clearTimeout(timeout);resolve();}});
 });
 const stop=()=>new Promise(resolve=>{if(server.exitCode!==null)return resolve();server.once('exit',resolve);server.kill();});
 try{
  await start();
  const url=`http://127.0.0.1:${port}/api/program-profiles/drafts`;
  const fid='33333333-3333-4333-8333-333333333333';
  const headers={'Content-Type':'application/json',Cookie:'pmd_access_token=test',Origin:`http://127.0.0.1:${port}`};
  const data={version:1,forecastId:fid,title:'Integration test',step:2,startTime:'12:00',occasion:'',items:[],crew:[],itemsLoaded:true,crewLoaded:true,keywords:[],axes:[],experts:[],issuedProfileId:null,completed:false};
  assert.equal((await fetch(url)).status,401);
  let response=await fetch(url+'/'+fid,{method:'PUT',headers,body:JSON.stringify({revision:0,data})});assert.equal(response.status,200,await response.text());
  response=await fetch(url+'/'+fid,{headers});assert.equal(response.status,200);assert.equal((await response.json()).data.step,2);
  response=await fetch(url+'/'+fid,{method:'PUT',headers,body:JSON.stringify({revision:0,data})});assert.equal(response.status,409);
  response=await fetch(url+'/'+fid,{method:'PUT',headers:{...headers,Origin:'https://unrelated.example'},body:JSON.stringify({revision:1,data})});assert.equal(response.status,403);
  response=await fetch(url,{headers:{Cookie:'pmd_access_token=other'}});assert.equal((await response.json()).length,0);
  await stop();await start();
  response=await fetch(url+'/'+fid,{headers});assert.equal((await response.json()).data.step,2);
  console.log('PASS: actual Next draft routes enforce authentication, user isolation, same-origin and revision checks; saved steps survive a server restart.');
 }finally{if(server)await stop();await new Promise(resolve=>backend.close(resolve));await rm(directory,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
