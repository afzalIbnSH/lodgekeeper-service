import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

import { AuthService } from './auth.service';
import { AuthenticatedPrincipal } from './auth.types';
import { readSessionCookie } from './session-cookie';

export type AuthenticatedRequest = Request & {
  user: AuthenticatedPrincipal;
};

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = readSessionCookie(request, this.config);

    if (!token) {
      throw new UnauthorizedException();
    }

    const principal = await this.authService.authenticateSession(token);

    Object.assign(request, { user: principal });
    return true;
  }
}
