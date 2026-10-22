export enum EducationLevel {
  Diploma = 1,
  AssociateDegree = 2,
  Bachelor = 3,
  Master = 4,
  Doctorate = 5,
}

export interface ExpertResponse {
  id: string;
  firstName: string;
  lastName: string;
  specialty: string;
  education: EducationLevel;
  workplace: string;
  mobilePhone: string;
  nationalCode: string;
  workPhone: string | null;
  isActive: boolean;
  networkIds: number[];
  createdAt: string;
}

export interface ExpertPayload {
  firstName: string;
  lastName: string;
  specialty: string;
  education: EducationLevel;
  workplace: string;
  mobilePhone: string;
  nationalCode: string;
  workPhone: string | null;
  networkIds: number[];
}

export interface ExpertUpdatePayload extends ExpertPayload {
  id: string;
  isActive: boolean;
}

export const educationLevelLabels: Record<number, string> = {
  1: "دیپلم",
  2: "فوق دیپلم",
  3: "لیسانس",
  4: "فوق لیسانس",
  5: "دکترا",
};
