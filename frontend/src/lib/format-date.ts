import { format, isToday, isValid, isYesterday, parseISO } from 'date-fns';

/**
 * Best-effort parse of the various date representations that flow through the app
 * (ISO strings from the backend, epoch millis, or Date instances).
 */
export function parseDate(input: string | number | Date | null | undefined): Date | null {
  if (input == null) return null;

  if (input instanceof Date) {
    return isValid(input) ? input : null;
  }

  if (typeof input === 'number') {
    const fromEpoch = new Date(input);
    return isValid(fromEpoch) ? fromEpoch : null;
  }

  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return null;

    let parsed = parseISO(trimmed);
    if (!isValid(parsed)) {
      parsed = new Date(trimmed);
    }
    return isValid(parsed) ? parsed : null;
  }

  return null;
}

export interface FormatMeetingDateOptions {
  /**
   * Use compact absolute dates ("11 Sep 26") suited for tight spaces like the
   * sidebar. When false, uses the long form ("September 11, 2026").
   */
  short?: boolean;
}

/**
 * Formats a meeting timestamp with a relative label for recent days and an
 * absolute date otherwise.
 *
 * - Today:     "Today, 9:00 AM"
 * - Yesterday: "Yesterday, 11:00 PM"
 * - Older:     "11 Sep 26" (short) or "September 11, 2026" (long)
 */
export function formatMeetingDate(
  input: string | number | Date | null | undefined,
  { short = false }: FormatMeetingDateOptions = {},
): string {
  const date = parseDate(input);
  if (!date) return '';

  const time = format(date, 'h:mm a');

  if (isToday(date)) return `Today, ${time}`;
  if (isYesterday(date)) return `Yesterday, ${time}`;

  return short ? format(date, 'd MMM yy') : format(date, 'MMMM d, yyyy');
}

/**
 * Short, filter-friendly key for grouping meetings by calendar day.
 * Returns an ISO date (yyyy-MM-dd) or an empty string when unparseable.
 */
export function meetingDayKey(input: string | number | Date | null | undefined): string {
  const date = parseDate(input);
  if (!date) return '';
  return format(date, 'yyyy-MM-dd');
}
