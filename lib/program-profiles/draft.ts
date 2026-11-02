import { normalizeSearch } from "@/lib/base-info/search";

export type DraftItem = { rowId:string; itemName:string; subject:string; duration:string; productionType:string };
export type DraftCrew = { rowId:string; personnelId:number; personnelName:string; activityTypeId:number; activityTypeName:string; isPresent:boolean; jobId:number; jobName:string };
export type ProfileDraft = {
  version:1; forecastId:string; title:string; step:number; startTime:string; occasion:string;
  items:DraftItem[]; crew:DraftCrew[]; itemsLoaded:boolean; crewLoaded:boolean;
  keywords:string[]; axes:{id:string;title:string}[];
  experts:{expertId:string;topicAxisId:string;duration:string;attendanceType:number;hasPayment:boolean}[];
  issuedProfileId:string|null; completed:boolean;
};
export type SavedProfileDraft = { revision:number; updatedAt:string; data:ProfileDraft };
export type DraftSummary = { forecastId:string; title:string; step:number; updatedAt:string };
export function isSoundOperator(...names:(string|null|undefined)[]) {
  return names.some(name => normalizeSearch(name ?? "").replace(/ /g, "").includes("صدابردار"));
}
export function restoreMissing<T extends {rowId:string}>(current:T[], incoming:T[]):T[] {
  const ids = new Set(current.map(row => row.rowId));
  return [...current, ...incoming.filter(row => { if(ids.has(row.rowId)) return false; ids.add(row.rowId); return true; })];
}
export function isProfileDraft(value:unknown):value is ProfileDraft {
  if(!value || typeof value !== "object") return false;
  const d=value as ProfileDraft;
  const text=(x:unknown):x is string => typeof x==="string" && x.length<=10000;
  const number=(x:unknown) => typeof x==="number" && Number.isFinite(x);
  const list=(x:unknown):x is unknown[] => Array.isArray(x) && x.length<=2000;
  return typeof d.completed==="boolean" && d.version===1 && text(d.forecastId) && text(d.title) && Number.isInteger(d.step) && d.step>=0 && d.step<=6
    && text(d.startTime) && text(d.occasion) && typeof d.itemsLoaded==="boolean" && typeof d.crewLoaded==="boolean"
    && (d.issuedProfileId===null || (text(d.issuedProfileId) && /^[0-9a-f-]{36}$/i.test(d.issuedProfileId)))
    && list(d.items) && d.items.every(x=>x && [x.rowId,x.itemName,x.subject,x.duration,x.productionType].every(text))
    && list(d.crew) && d.crew.every(x=>x && [x.rowId,x.personnelName,x.activityTypeName,x.jobName].every(text) && [x.personnelId,x.activityTypeId,x.jobId].every(number) && typeof x.isPresent==="boolean")
    && list(d.keywords) && d.keywords.every(text)
    && list(d.axes) && d.axes.every(x=>x && text(x.id) && text(x.title))
    && list(d.experts) && d.experts.every(x=>x && [x.expertId,x.topicAxisId,x.duration].every(text) && number(x.attendanceType) && typeof x.hasPayment==="boolean");
}
