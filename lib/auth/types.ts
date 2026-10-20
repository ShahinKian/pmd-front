export interface AuthResponse {
  userName: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  roles: string[];
  networkIds: number[];
  networkGroupId: number | null;
  providerId: number | null;
}

export interface MeResponse {
  userId: string;
  email: string;
  roles: string[];
}

export interface UserProfileResponse {
  id: string;
  fullName: string;
  userName: string;
  email: string;
  phoneNumber: string | null;
  profilePictureUrl: string | null;
  roles: string[];
  networkIds: number[];
  networkGroupId: number | null;
  providerId: number | null;
}

export interface RoleResponse {
  id: string;
  name: string;
}

export interface RegisterRequest {
  fullName: string;
  userName: string;
  password: string;
  roles?: string[];
  networkIds?: number[];
  networkGroupId?: number | null;
  providerId?: number | null;
}
