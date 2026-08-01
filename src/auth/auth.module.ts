import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

import { AccommodationModule } from '../accommodation/accommodation.module';
import { IdentityModule } from '../identity/identity.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './local-auth.guard';
import { LocalStrategy } from './local.strategy';
import { PasswordHasher } from './password-hasher';
import { SessionAuthGuard } from './session-auth.guard';

@Module({
  imports: [AccommodationModule, IdentityModule, PassportModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    LocalAuthGuard,
    LocalStrategy,
    PasswordHasher,
    SessionAuthGuard,
  ],
  exports: [AuthService, SessionAuthGuard],
})
export class AuthModule {}
