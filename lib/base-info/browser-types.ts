export interface BaseInfoOption {
  Value: string;
  Text: string;
  Selected: boolean;
  Disabled: boolean;
  Group: unknown | null;
}

export interface BaseInfoListResponse {
  IsSuccess: boolean;
  Message: string | null;
  Data: BaseInfoOption[];
}
