import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';

const DEFAULT_COOKIE_NAME = 'lodgekeeper_session';

function cookieName(config: ConfigService): string {
  return config.get<string>('AUTH_SESSION_COOKIE_NAME') ?? DEFAULT_COOKIE_NAME;
}

function cookieSecure(config: ConfigService): boolean {
  return config.get<boolean>('AUTH_SESSION_COOKIE_SECURE') ?? false;
}

function cookieValue(request: Request, name: string): string | undefined {
  const header = request.headers.cookie;

  if (!header) {
    return undefined;
  }

  for (const part of header.split(';')) {
    const separator = part.indexOf('=');

    if (separator === -1 || part.slice(0, separator).trim() !== name) {
      continue;
    }

    try {
      return decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      return undefined;
    }
  }

  return undefined;
}

export function readSessionCookie(
  request: Request,
  config: ConfigService,
): string | undefined {
  return cookieValue(request, cookieName(config));
}

export function writeSessionCookie(
  response: Response,
  config: ConfigService,
  token: string,
  expiresAt: Date,
): void {
  response.cookie(cookieName(config), token, {
    expires: expiresAt,
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: cookieSecure(config),
  });
}

export function clearSessionCookie(
  response: Response,
  config: ConfigService,
): void {
  response.clearCookie(cookieName(config), {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: cookieSecure(config),
  });
}
