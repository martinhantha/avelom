export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  isSuperadmin: boolean;
}

export interface AuthMembership {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  role: "ADMIN" | "STAFF" | "END_CUSTOMER";
}

export interface AuthSession {
  user: AuthUser;
  memberships: AuthMembership[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
