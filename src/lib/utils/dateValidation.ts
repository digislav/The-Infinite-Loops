export function getTodayDateInputValue(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getMinDateTimeLocalValue(now = new Date()): string {
  const local = new Date(now);
  local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
  return local.toISOString().slice(0, 16);
}

function parseDateInputAsLocal(dateValue: string): Date | null {
  const [year, month, day] = dateValue.split('-').map(Number);
  if (!year || !month || !day) return null;

  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return date;
}

export function isDateInputBeforeToday(dateValue: string, now = new Date()): boolean {
  const selected = parseDateInputAsLocal(dateValue);
  if (!selected) return false;

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return selected < today;
}

export function isDateTimeLocalBeforeNow(dateTimeValue: string, now = new Date()): boolean {
  const selected = new Date(dateTimeValue);
  if (Number.isNaN(selected.getTime())) return false;
  return selected.getTime() < now.getTime();
}

export function isEndDateBeforeStartDate(startDate: string, endDate: string): boolean {
  const start = parseDateInputAsLocal(startDate);
  const end = parseDateInputAsLocal(endDate);
  if (!start || !end) return false;
  return end < start;
}
