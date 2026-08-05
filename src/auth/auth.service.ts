import { LockMode } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';
import {
  BadRequestException,
  Injectable,
  Inject,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { TenantTransaction } from '../database/tenant-transaction';
import { AuthSession } from '../identity/entities/auth-session.entity';
import { UserInvitation } from '../identity/entities/user-invitation.entity';
import { User, UserStatus } from '../identity/entities/user.entity';
import {
  createSessionToken,
  hashOpaqueToken,
  tenantIdFromSessionToken,
} from './auth-token';
import { AuthenticatedPrincipal, IssuedSession } from './auth.types';
import { PasswordHasher } from './password-hasher';

const GENERIC_LOGIN_ERROR = 'Invalid email or password';

interface NewSession {
  entity: AuthSession;
  rawToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(EntityManager) private readonly entityManager: EntityManager,
    @Inject(TenantTransaction)
    private readonly tenantTransaction: TenantTransaction,
    @Inject(PasswordHasher) private readonly passwordHasher: PasswordHasher,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  async acceptInvitation(input: {
    displayName: string;
    password: string;
    tenantId: string;
    token: string;
  }): Promise<IssuedSession> {
    const displayName = input.displayName.trim();

    if (!displayName) {
      throw new BadRequestException('displayName must not be blank');
    }

    const passwordHash = await this.passwordHasher.hash(input.password);
    const tokenHash = hashOpaqueToken(input.token);
    const now = new Date();

    return this.tenantTransaction.run(input.tenantId, async (transaction) => {
      const invitation = await transaction.findOne(
        UserInvitation,
        {
          acceptedAt: null,
          tokenHash,
        },
        {
          lockMode: LockMode.PESSIMISTIC_WRITE,
          populate: ['user'],
        },
      );

      if (!invitation || invitation.expiresAt <= now) {
        throw new UnprocessableEntityException(
          'Invitation is invalid or has expired',
        );
      }

      const user = invitation.user;

      if (
        (user.status as UserStatus) !== UserStatus.INVITED ||
        user.passwordHash !== null
      ) {
        throw new UnprocessableEntityException(
          'Invitation has already been completed',
        );
      }

      user.displayName = displayName;
      user.passwordHash = passwordHash;
      user.emailVerifiedAt = now;
      user.status = UserStatus.ACTIVE;
      user.activatedAt = now;
      invitation.acceptedAt = now;

      const session = this.newSession(transaction, user, now);

      await transaction.flush();

      return {
        expiresAt: session.entity.expiresAt,
        principal: this.activePrincipal(user),
        token: session.rawToken,
      };
    });
  }

  async validateCredentials(
    email: string,
    password: string,
  ): Promise<AuthenticatedPrincipal> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.entityManager.fork().findOne(User, {
      email: normalizedEmail,
      status: UserStatus.ACTIVE,
    });

    if (!user?.passwordHash) {
      await this.passwordHasher.consumeEquivalentWork(password);
      throw new UnauthorizedException(GENERIC_LOGIN_ERROR);
    }

    if (!(await this.passwordHasher.verify(password, user.passwordHash))) {
      throw new UnauthorizedException(GENERIC_LOGIN_ERROR);
    }

    return this.activePrincipal(user);
  }

  async createSession(
    principal: AuthenticatedPrincipal,
  ): Promise<IssuedSession> {
    return this.tenantTransaction.run(
      principal.tenantId,
      async (transaction) => {
        const user = await transaction.findOne(User, {
          id: principal.userId,
          status: UserStatus.ACTIVE,
          tenant: principal.tenantId,
        });

        if (!user) {
          throw new UnauthorizedException(GENERIC_LOGIN_ERROR);
        }

        const session = this.newSession(transaction, user, new Date());

        await transaction.flush();

        return {
          expiresAt: session.entity.expiresAt,
          principal: this.activePrincipal(user),
          token: session.rawToken,
        };
      },
    );
  }

  async authenticateSession(token: string): Promise<AuthenticatedPrincipal> {
    const tenantId = tenantIdFromSessionToken(token);

    if (!tenantId) {
      throw new UnauthorizedException();
    }

    const tokenHash = hashOpaqueToken(token);
    const now = new Date();

    return this.tenantTransaction.run(tenantId, async (transaction) => {
      const session = await transaction.findOne(
        AuthSession,
        {
          revokedAt: null,
          tokenHash,
        },
        { populate: ['user'] },
      );

      if (
        !session ||
        session.expiresAt <= now ||
        (session.user.status as UserStatus) !== UserStatus.ACTIVE
      ) {
        throw new UnauthorizedException();
      }

      if (now.getTime() - session.lastSeenAt.getTime() >= 5 * 60 * 1_000) {
        session.lastSeenAt = now;
        await transaction.flush();
      }

      return this.activePrincipal(session.user);
    });
  }

  async revokeSession(token: string): Promise<void> {
    const tenantId = tenantIdFromSessionToken(token);

    if (!tenantId) {
      return;
    }

    await this.tenantTransaction.run(tenantId, async (transaction) => {
      const session = await transaction.findOne(AuthSession, {
        revokedAt: null,
        tokenHash: hashOpaqueToken(token),
      });

      if (session) {
        session.revokedAt = new Date();
        await transaction.flush();
      }
    });
  }

  private newSession(
    transaction: EntityManager,
    user: User,
    now: Date,
  ): NewSession {
    const tenantId = user.tenant.id;
    const rawToken = createSessionToken(tenantId);
    const ttlSeconds =
      this.config.get<number>('AUTH_SESSION_TTL_SECONDS') ?? 604_800;
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1_000);
    const session = transaction.create(AuthSession, {
      expiresAt,
      lastSeenAt: now,
      tenant: user.tenant,
      tokenHash: hashOpaqueToken(rawToken),
      user,
    });

    transaction.persist(session);

    return { entity: session, rawToken };
  }

  private activePrincipal(user: User): AuthenticatedPrincipal {
    return {
      displayName: user.displayName!,
      email: user.email,
      role: user.role,
      tenantId: user.tenant.id,
      userId: user.id,
    };
  }
}
