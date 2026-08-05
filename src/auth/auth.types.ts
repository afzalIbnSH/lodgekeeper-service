import { UserRole } from '../identity/entities/user.entity';

export interface AuthenticatedPrincipal {
  displayName: string;
  email: string;
  role: UserRole;
  tenantId: string;
  userId: string;
}

export interface IssuedSession {
  expiresAt: Date;
  principal: AuthenticatedPrincipal;
  token: string;
}
