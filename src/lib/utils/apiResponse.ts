// apiResponse.ts — S3-018: updated with logAndReturn helper.
// Standardizes all API route responses per S1-001 §6.2.
// logAndReturn combines logger.error() + apiError() into a single call
// so route handlers stay concise and logging is never accidentally omitted.
//
// Per S1-001 §6.3 — error messages returned to the client are always
// human-friendly strings from ERROR_MESSAGES, never raw DB/JS errors.

import { NextResponse } from 'next/server';
import { logger } from './logger';

const ERROR_MESSAGES: Record<string, string> = {
  AUTH_REQUIRED: 'Authentication required',
  FORBIDDEN: 'You do not have permission to access this resource',
  NOT_FOUND: 'Resource not found',
  VALIDATION_ERROR: 'Validation failed',
  INTERNAL_ERROR: 'An unexpected error occurred',
  DUPLICATE_EMAIL: 'Email address is already registered',
  INVALID_CREDENTIALS: 'Invalid email or password',
  TOKEN_EXPIRED: 'Token has expired',
  INVALID_STAGE: 'Invalid pipeline stage transition',
  AI_UNAVAILABLE: 'AI service is temporarily unavailable',
  INSUFFICIENT_CONTEXT:
    'Insufficient profile data. Please fill out your Experience, Education, or Skills in your Profile.',
};

export function apiSuccess<T>(data: T, status = 200, meta?: object) {
  return NextResponse.json({ success: true, data, ...(meta && { meta }) }, { status });
}

export function apiError(code: string, status: number, fields?: object) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message: ERROR_MESSAGES[code] ?? code,
        ...(fields && { fields }),
      },
    },
    { status },
  );
}

// logAndReturn — S3-018 helper.
// Logs the error server-side via the centralized logger then returns the
// appropriate apiError response. Use this in catch blocks so logging is
// never accidentally skipped.
//
// Example:
//   } catch (err) {
//     return logAndReturn('GET /api/jobs', 'DB query failed', err, 'INTERNAL_ERROR', 500);
//   }
export function logAndReturn(
  route: string,
  message: string,
  err: unknown,
  code: string,
  status: number,
  fields?: object,
) {
  logger.error(route, message, err);
  return apiError(code, status, fields);
}
