import { NextResponse } from 'next/server';

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
  INSUFFICIENT_CONTEXT: 'Insufficient profile data. Please fill out your Experience, Education, or Skills in your Profile.',
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
