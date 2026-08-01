import { Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';

import { AuthService } from './auth.service';
import { AuthenticatedPrincipal } from './auth.types';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {
    super({
      passwordField: 'password',
      usernameField: 'email',
    });
  }

  async validate(
    email: string,
    password: string,
  ): Promise<AuthenticatedPrincipal> {
    return this.authService.validateCredentials(email, password);
  }
}
