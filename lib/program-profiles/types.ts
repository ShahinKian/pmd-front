export interface ProfileCrewMember {
  id?: string;
  personnelId: number;
  personnelName: string;
  activityTypeId: number;
  activityTypeName: string;
  isPresent: boolean;
}

export interface ProfileItem {
  id?: string;
  itemName: string;
  productionType: string;
  duration: string;
}

export interface ProfileExpert {
  id?: string;
  expertId: string;
  topicAxisId: string;
  duration: string;
  attendanceType: string | number;
  hasPayment: boolean;
}

export interface ProgramProfileResponse {
  id: string;
  forecastId: string;
  planId: number;
  networkId: number;
  networkGroupId: number;
  mainTopic: string;
  duration: string;
  broadcastDate: string;
  productionMethod: string;
  occasion: string;
  floorName: string;
  floorId: number;
  programDegreeName: string;
  programDegreeId: number;
  programStructureName: string;
  programStructureId: number;
  startTime: string;
  hasExpert: boolean;
  programType: number;
  programTypeName: string;
  status: number;
  statusDisplayName: string;
  lastReturnReason?: string | null;
  crewMembers: ProfileCrewMember[];
  items: ProfileItem[];
  experts: ProfileExpert[];
  createdByUserId: string;
  createdByUserName: string;
  createdDate: string;
}

export interface SupervisorComment {
  id: string;
  supervisorUserId: string;
  supervisorName: string;
  comment: string;
  createdDate: string;
}

export const PROFILE_STATUS = {
  Draft: 0,
  PendingGroupManager: 10,
  PendingSupervisor: 20,
  PendingBroadcastManager: 30,
  PendingPlanningManager: 40,
  Approved: 50,
  ReturnedForEdit: 60,
} as const;

export function profileStatusLabel(status: number, displayName?: string): string {
  if (status === 0) return "تهیه‌کننده (پیش‌نویس)";
  if (displayName?.trim()) return displayName;
  switch (status) {
    case 0: return "نزد تهیه‌کننده (پیش‌نویس)";
    case 10: return "منتظر تایید مدیر گروه";
    case 20: return "منتظر تایید ناظر";
    case 30: return "منتظر تایید مدیر پخش";
    case 40: return "منتظر تایید مدیر طرح و برنامه‌ریزی";
    case 50: return "تایید نهایی";
    case 60: return "برگشت برای اصلاح";
    default: return `وضعیت ${status}`;
  }
}
