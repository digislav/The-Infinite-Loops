/**
 * Formats a date-only string (YYYY-MM-DD or TIMESTAMPTZ) to m/d/yy in UTC.
 * Uses UTC to preserve the date exactly as entered (stored as midnight UTC in Supabase).
 */
export function formatDateOnly(dateStr?: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: '2-digit',
    timeZone: 'UTC',
  });
}

/**
 * Formats a full timestamp string to m/d/yy in EST.
 * Used for activity timestamps where local time matters.
 */
export function formatTimestamp(dateStr?: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: '2-digit',
    timeZone: 'America/New_York',
  });
}
