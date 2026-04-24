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
  return date.toLocaleString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/New_York',
  });
}
/**
 * Formats a deadline ISO string to show date and, optionally, time.
 *
 * We detect whether a time was explicitly set by checking the raw string
 * for a "T" component — e.g. "2026-04-21T20:00" has a time, "2026-04-21" does not.
 * This avoids relying on getHours() which shifts by the local UTC offset and
 * causes the wrong time to be shown (or hasTime to be wrong) for EDT users.
 *
 * Display uses the local timezone so the user sees what they entered.
 */
export function formatDeadline(dateStr?: string): string {
  if (!dateStr) return '';

  // Check whether the stored string contains an explicit time component.
  // datetime-local values look like "2026-04-21T20:00" or "2026-04-21T20:00:00".
  // Date-only values look like "2026-04-21" or "2026-04-21T00:00:00+00:00" (midnight UTC).
  const timePortion = dateStr.includes('T') ? dateStr.split('T')[1] : null;
  const hasTime = timePortion !== null && !timePortion.startsWith('00:00');

  const date = new Date(dateStr);

  const datePart = date.toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: '2-digit',
  });

  if (!hasTime) return datePart;

  const formattedTime = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return `${datePart} at ${formattedTime}`;
}

/**
 * Converts a datetime-local string ("2026-04-23T08:00") to a proper ISO
 * string with the browser's local timezone offset ("2026-04-23T08:00:00-04:00").
 *
 * Without this, PostgreSQL interprets the bare datetime string as UTC,
 * shifting the stored time by the user's UTC offset (e.g. EDT = -4h).
 * Appending the offset tells Postgres the exact intended moment in time.
 *
 * For date-only strings (no "T") the string is returned unchanged.
 */
export function toLocalISOWithOffset(datetimeLocalStr: string): string {
  if (!datetimeLocalStr) return datetimeLocalStr;

  // If there is no time component (date-only like "2026-04-23"), default to midnight local.
  // Midnight local with an offset (e.g. "T00:00:00-04:00") avoids the UTC date-shift problem
  // while letting formatDeadline detect "no time set" and show only the date.
  const normalized = datetimeLocalStr.includes('T')
    ? datetimeLocalStr
    : `${datetimeLocalStr}T08:00`;

  const date = new Date(normalized);
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absMinutes = Math.abs(offsetMinutes);
  const hh = String(Math.floor(absMinutes / 60)).padStart(2, '0');
  const mm = String(absMinutes % 60).padStart(2, '0');

  // Build a clean ISO string from the parsed Date to avoid malformed
  // timestamps when the input already contains seconds (e.g. "08:00:00").
  const pad = (n: number) => String(n).padStart(2, '0');
  const iso = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}${sign}${hh}:${mm}`;
  return iso;
}
