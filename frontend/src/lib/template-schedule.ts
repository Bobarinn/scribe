/**
 * Helpers for the optional "time of day" scheduling attached to meeting
 * templates. When a meeting starts near a template's configured time, the app
 * pre-selects that template as the meeting type.
 *
 * Schedules are a `templateId -> "HH:MM"` (24-hour, local time) map, mirrored
 * from the Rust `api_get_template_schedules` command.
 */

export type TemplateSchedules = Record<string, string>;

/** Parse a `HH:MM` (24-hour) string into minutes since midnight, or null. */
export function parseTimeOfDay(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/**
 * Given a schedule map and a date, return the id of the template whose
 * configured time is closest to that date's local time and within
 * `windowMinutes`. Returns null when nothing is close enough.
 */
export function guessTemplateIdForDate(
  schedules: TemplateSchedules,
  date: Date,
  windowMinutes = 10,
): string | null {
  const target = date.getHours() * 60 + date.getMinutes();
  let best: { id: string; diff: number } | null = null;

  for (const [id, hhmm] of Object.entries(schedules)) {
    const minutes = parseTimeOfDay(hhmm);
    if (minutes == null) continue;
    // Account for wrap-around so 23:55 and 00:03 are treated as ~8 min apart.
    const raw = Math.abs(minutes - target);
    const diff = Math.min(raw, 1440 - raw);
    if (diff <= windowMinutes && (best === null || diff < best.diff)) {
      best = { id, diff };
    }
  }

  return best?.id ?? null;
}
