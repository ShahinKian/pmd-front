export interface ForecastTopicAxis {
  id: string;
  title: string;
  displayOrder: number;
}

export interface ForecastResponse {
  id: string;
  planId: number;
  planName?: string | null;
  workflow?: { workflowName: string; currentNodeName: string | null; currentNodeRole: string | null; lastAction: string | null } | null;
  networkId: number;
  networkGroupId: number;
  episodeNumber: number;
  broadcastDate: string;
  mainTopic: string;
  hasExpert: boolean;
  status: number;
  topicAxes: ForecastTopicAxis[];
  expertIds: string[];
  userCreatorId: string;
  userCreatorName: string;
  createdDate: string;
}

export interface PaginationMeta {
  TotalCount: number;
  PageNumber: number;
  PageSize: number;
  TotalPages: number;
  HasNext: boolean;
  HasPrevious: boolean;
}

export const FORECAST_STATUS = {
  Draft: 1,
  PendingReview: 2,
  Approved: 3,
  Rejected: 4,
  ReturnedForEdit: 5,
} as const;

export function forecastStatusLabel(status: number): string {
  switch (status) {
    case 1: return "پیش‌نویس";
    case 2: return "در انتظار بررسی";
    case 3: return "تایید‌شده";
    case 4: return "رد شده";
    case 5: return "برگشت برای اصلاح";
    default: return `وضعیت ${status}`;
  }
}
