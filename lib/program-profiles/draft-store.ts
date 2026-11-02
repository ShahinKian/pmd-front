import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, rename, unlink, readdir } from "node:fs/promises";
import path from "node:path";
import lockfile from "proper-lockfile";
import type { ProfileDraft, SavedProfileDraft, DraftSummary } from "./draft";

function directory(userId:string) {
  // Outside the deployment directory in production; shared persistent volume for multiple instances.
  const root=process.env.PROFILE_DRAFTS_DIR || path.join(process.cwd(), ".data", "profile-drafts");
  return path.join(/* turbopackIgnore: true */ root, createHash("sha256").update(userId).digest("hex"));
}
function filePath(userId:string, forecastId:string) {
  if(!/^[0-9a-f-]{36}$/i.test(forecastId)) throw new Error("Invalid forecast ID");
  return path.join(directory(userId), forecastId.toLowerCase()+".json");
}
export async function readDraft(userId:string, forecastId:string):Promise<SavedProfileDraft|null> {
  try { return JSON.parse(await readFile(/* turbopackIgnore: true */ filePath(userId,forecastId), "utf8")); }
  catch(error) { if((error as NodeJS.ErrnoException).code==="ENOENT") return null; throw error; }
}
export class DraftConflict extends Error {}
export async function writeDraft(userId:string, data:ProfileDraft, revision:number):Promise<SavedProfileDraft> {
  const file=filePath(userId,data.forecastId);
  await mkdir(directory(userId), {recursive:true,mode:0o700});
  let release:()=>Promise<void>;
  let compromised:Error|null=null;
  try { release=await lockfile.lock(file,{realpath:false,stale:10000,retries:0,onCompromised:error=>{compromised=error;}}); }
  catch(error) { if((error as NodeJS.ErrnoException).code==="ELOCKED") throw new DraftConflict(); throw error; }
  const temporary=file+"."+randomUUID()+".tmp";
  try {
    const current=await readDraft(userId,data.forecastId);
    if((current?.revision ?? 0)!==revision) throw new DraftConflict();
    const saved={revision:revision+1,updatedAt:new Date().toISOString(),data};
    await writeFile(temporary,JSON.stringify(saved),{mode:0o600});
    if(compromised)throw compromised;
    await rename(temporary,file);
    return saved;
  } finally {
    await unlink(temporary).catch(()=>{});
    await release();
  }
}
export async function listDrafts(userId:string):Promise<DraftSummary[]> {
  let names:string[];
  try { names=await readdir(/* turbopackIgnore: true */ directory(userId)); }
  catch(error) { if((error as NodeJS.ErrnoException).code==="ENOENT") return []; throw error; }
  const drafts=await Promise.all(names.filter(name=>/^[0-9a-f-]{36}\.json$/i.test(name)).map(name=>readDraft(userId,name.slice(0,-5))));
  return drafts.filter((d):d is SavedProfileDraft=>!!d && !d.data.completed).map(d=>({forecastId:d.data.forecastId,title:d.data.title,step:d.data.step,updatedAt:d.updatedAt})).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
}
