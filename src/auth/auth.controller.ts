import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';

import { AuthService } from './auth.service';
import type { AuthenticatedPrincipal } from './auth.types';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { LoginDto } from './dto/login.dto';
import { LocalAuthGuard } from './local-auth.guard';
import {
  clearSessionCookie,
  readSessionCookie,
  writeSessionCookie,
} from './session-cookie';
import type { AuthenticatedRequest } from './session-auth.guard';
import { SessionAuthGuard } from './session-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  @Post('invitations/accept')
  async acceptInvitation(
    @Body() input: AcceptInvitationDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthenticatedPrincipal> {
    const session = await this.authService.acceptInvitation(input);

    writeSessionCookie(response, this.config, session.token, session.expiresAt);

    return session.principal;
  }

  @Post('login')
  @HttpCode(200)
  @UseGuards(LocalAuthGuard)
  async login(
    @Body() _input: LoginDto,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthenticatedPrincipal> {
    const session = await this.authService.createSession(request.user);

    writeSessionCookie(response, this.config, session.token, session.expiresAt);

    return session.principal;
  }

  @Post('logout')
  @HttpCode(204)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const token = readSessionCookie(request, this.config);

    if (token) {
      await this.authService.revokeSession(token);
    }

    clearSessionCookie(response, this.config);
  }

  @Get('me')
  @UseGuards(SessionAuthGuard)
  me(@Req() request: AuthenticatedRequest): AuthenticatedPrincipal {
    return request.user;
  }
}
