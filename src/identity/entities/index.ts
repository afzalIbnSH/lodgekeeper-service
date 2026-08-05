import { AuthSession } from './auth-session.entity';
import { UserInvitation } from './user-invitation.entity';
import { User } from './user.entity';

export const identityEntities = [User, UserInvitation, AuthSession] as const;

export { AuthSession, User, UserInvitation };
