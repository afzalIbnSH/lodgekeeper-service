import { ExecutionContext, Injectable, ValidationPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';

import { LoginDto } from './dto/login.dto';

const LOGIN_VALIDATION_PIPE = new ValidationPipe({
  forbidNonWhitelisted: true,
  transform: true,
  whitelist: true,
});

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {
  override async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const body = request.body as unknown;

    request.body = (await LOGIN_VALIDATION_PIPE.transform(body, {
      metatype: LoginDto,
      type: 'body',
    })) as LoginDto;

    return (await super.canActivate(context)) as boolean;
  }
}
