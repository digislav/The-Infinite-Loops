// logger.ts — S3-018: Centralized Error Handling and Logging.
// Single utility for all server-side logging across API routes.
// Replaces ad-hoc console.error() calls with a consistent structured format
// that includes route context, error type, and a timestamp.
//
// Per S1-001 §6.3 — errors must never expose internal details to the client.
//   This logger is server-only — it writes to stdout (captured by the runtime)
//   and never sends data to the browser.
// Per S1-003 §9.1 — never log user_id, tokens, passwords, or PII.
//
// Usage:
//   import { logger } from '@/lib/utils/logger';
//   logger.error('GET /api/jobs', 'DB query failed', error);
//   logger.warn('POST /api/documents', 'File size near limit', { size });
//   logger.info('POST /api/jobs', 'Job created', { jobId });

type LogLevel = 'info' | 'warn' | 'error';

// Sanitize an error value into a plain string safe for logging.
// Strips any object keys that look like they could contain PII or secrets.
function sanitizeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

// Sanitize a context object — removes any keys that should never be logged
// per S1-003 §9.1 (user_id, token, password, email, key, secret).
function sanitizeContext(ctx?: object): object | undefined {
  if (!ctx) return undefined;
  const BLOCKED_KEYS = [
    'user_id',
    'userId',
    'token',
    'password',
    'email',
    'key',
    'secret',
    'authorization',
  ];
  return Object.fromEntries(
    Object.entries(ctx).filter(([k]) => !BLOCKED_KEYS.includes(k.toLowerCase())),
  );
}

function log(level: LogLevel, route: string, message: string, errOrCtx?: unknown) {
  const timestamp = new Date().toISOString();
  const context =
    errOrCtx instanceof Error
      ? { error: sanitizeError(errOrCtx) }
      : errOrCtx && typeof errOrCtx === 'object'
        ? sanitizeContext(errOrCtx as object)
        : undefined;

  // Structured log line — each field is consistently named so logs are
  // easy to grep and parse in any log aggregator.
  const entry = {
    level,
    timestamp,
    route,
    message,
    ...(context && { context }),
  };

  // Route to the appropriate console method so log levels are preserved
  // in any runtime that differentiates them (Vercel, AWS, etc.).
  if (level === 'error') {
    console.error(JSON.stringify(entry));
  } else if (level === 'warn') {
    console.warn(JSON.stringify(entry));
  } else {
    console.info(JSON.stringify(entry));
  }
}

export const logger = {
  // Log an error — use for unexpected failures, DB errors, auth failures.
  error: (route: string, message: string, errOrCtx?: unknown) =>
    log('error', route, message, errOrCtx),

  // Log a warning — use for recoverable issues or near-limit conditions.
  warn: (route: string, message: string, ctx?: object) => log('warn', route, message, ctx),

  // Log an info event — use for significant successful actions.
  info: (route: string, message: string, ctx?: object) => log('info', route, message, ctx),
};
