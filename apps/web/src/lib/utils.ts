import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * A Date whose UTC fields read as IST wall-clock time — so `toISOString()`,
 * `getUTCMonth()` etc. yield the Indian calendar date wherever the code runs.
 *
 * The business operates in IST, but the server and the browser may sit in any
 * timezone, so this must never depend on the host offset. An earlier version
 * added `getTimezoneOffset()` on top of the +5:30 shift; since `getTime()` is
 * already UTC-based that double-corrected, and on a UTC-7 host it rolled the
 * date a day forward — the dashboard then queried a day with no bills.
 */
export function istNow(now: Date = new Date()): Date {
  return new Date(now.getTime() + 5.5 * 3600_000);
}

/** Today's date in IST as 'YYYY-MM-DD'. */
export function istToday(now: Date = new Date()): string {
  return istNow(now).toISOString().slice(0, 10);
}

export function fmtCurrency(
  paise: number,
  currency = "INR",
  locale = "en-IN"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

export function fmtDate(date: string | Date, fmt = "dd MMM yyyy"): string {
  return format(new Date(date), fmt);
}

export function fmtRelative(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function fmtNumber(n: number, locale = "en-IN"): string {
  return new Intl.NumberFormat(locale).format(n);
}

export function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
