export interface BaseInfoItem {
  Value: string;
  Text: string;
  Selected: boolean;
  Disabled: boolean;
  Group: unknown | null;
}

export interface BaseInfoResponse<T = BaseInfoItem[]> {
  IsSuccess: boolean;
  Message: string | null;
  Data: T;
}

export interface SelectOption<T = number> {
  value: T;
  label: string;
  disabled?: boolean;
}

export type BaseInfoErrorCode =
  | "CONFIGURATION"
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "UPSTREAM"
  | "INVALID_RESPONSE"
  | "TIMEOUT"
  | "NETWORK";

export class BaseInfoError extends Error {
  constructor(
    public readonly code: BaseInfoErrorCode,
    message: string,
    public readonly status: number = 502,
  ) {
    super(message);
    this.name = "BaseInfoError";
  }
}
