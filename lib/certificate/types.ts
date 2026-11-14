export type Money = `${number}`;

export interface PaymentPeriod {
  id: string;
  fromDate: string;
  toDate: string;
  paymentYear: number;
  paymentMonth: number;
  issuedAt: string | null;
}

export interface PermitSummary {
  id: string;
  periodId: string;
  planId: number;
  status: "Draft" | "Approved" | "SentToFinance";
  episodeCount: number;
  grossAmount: Money;
  deductionAmount: Money;
  netAmount: Money;
  version: string;
}

export interface PersonnelPayment {
  personnelId: number;
  personnelName: string;
  isDutyCrew: boolean;
  attendanceCount: number;
  grossAmount: Money;
  deduction: Money;
  netAmount: Money;
  lines: { episodeNumber: number; activityTypeId: number; activityTypeName: string; rate: Money }[];
}

export interface PermitDetail {
  permit: PermitSummary;
  payments: PersonnelPayment[];
  episodes: { profileId: string; episodeNumber: number; broadcastDate: string }[];
}

export interface DutyCrewMember {
  personnelId: number;
  personnelName: string;
}
