import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';

import {
  clearSessionCookie,
  readSessionCookie,
  writeSessionCookie,
} from '../src/auth/session-cookie';

interface RecordedResponse {
  clearCookieCalls: unknown[][];
  cookieCalls: unknown[][];
  response: Response;
}

function config(values: Record<string, unknown>): ConfigService {
  return new ConfigService(values);
}

function requestWithCookie(cookie?: string): Request {
  return {
    headers: cookie ? { cookie } : {},
  } as unknown as Request;
}

function recordedResponse(): RecordedResponse {
  const clearCookieCalls: unknown[][] = [];
  const cookieCalls: unknown[][] = [];
  const response = {
    clearCookie: (...arguments_: unknown[]) => {
      clearCookieCalls.push(arguments_);
      return response;
    },
    cookie: (...arguments_: unknown[]) => {
      cookieCalls.push(arguments_);
      return response;
    },
  } as unknown as Response;

  return { clearCookieCalls, cookieCalls, response };
}

void describe('session cookies', () => {
  const sessionConfig = config({
    AUTH_SESSION_COOKIE_NAME: 'custom_session',
    AUTH_SESSION_COOKIE_SECURE: true,
  });

  void it('reads and decodes the configured cookie', () => {
    const request = requestWithCookie(
      'other=value; custom_session=tenant%2Eopaque-token; final=value',
    );

    assert.equal(
      readSessionCookie(request, sessionConfig),
      'tenant.opaque-token',
    );
  });

  void it('returns undefined for absent or malformed cookie values', () => {
    assert.equal(
      readSessionCookie(requestWithCookie('other=value'), sessionConfig),
      undefined,
    );
    assert.equal(
      readSessionCookie(
        requestWithCookie('custom_session=%E0%A4%A'),
        sessionConfig,
      ),
      undefined,
    );
  });

  void it('writes an HTTP-only cookie with the expected scope and expiry', () => {
    const recorded = recordedResponse();
    const expiresAt = new Date('2026-08-06T12:00:00.000Z');

    writeSessionCookie(
      recorded.response,
      sessionConfig,
      'tenant.opaque-token',
      expiresAt,
    );

    assert.deepEqual(recorded.cookieCalls, [
      [
        'custom_session',
        'tenant.opaque-token',
        {
          expires: expiresAt,
          httpOnly: true,
          path: '/',
          sameSite: 'lax',
          secure: true,
        },
      ],
    ]);
  });

  void it('clears the cookie using the same security and scope options', () => {
    const recorded = recordedResponse();

    clearSessionCookie(recorded.response, sessionConfig);

    assert.deepEqual(recorded.clearCookieCalls, [
      [
        'custom_session',
        {
          httpOnly: true,
          path: '/',
          sameSite: 'lax',
          secure: true,
        },
      ],
    ]);
  });
});
