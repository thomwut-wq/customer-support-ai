export const TZ = "Asia/Bangkok";

const dateTimeFmt = new Intl.DateTimeFormat("th-TH", { timeZone: TZ, day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const dateFmt = new Intl.DateTimeFormat("th-TH", { timeZone: TZ, day: "numeric", month: "short", year: "numeric" });
const timeFmt = new Intl.DateTimeFormat("th-TH", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
const dayKeyFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const shortDayFmt = new Intl.DateTimeFormat("th-TH", { timeZone: TZ, day: "numeric", month: "short" });
const numberFmt = new Intl.NumberFormat("th-TH");

export const formatDateTime = (d: string | Date) => dateTimeFmt.format(new Date(d));
export const formatDate = (d: string | Date) => dateFmt.format(new Date(d));
export const formatTime = (d: string | Date) => timeFmt.format(new Date(d));
export const formatNumber = (n: number) => numberFmt.format(n);
/** YYYY-MM-DD in Bangkok time. */
export const bangkokDayKey = (d: string | Date) => dayKeyFmt.format(new Date(d));
export const shortDay = (d: string | Date) => shortDayFmt.format(new Date(d));

export function relativeTime(d: string | Date): string {
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 60) return "เมื่อสักครู่";
  if (diff < 3600) return `${Math.floor(diff / 60)} นาทีที่แล้ว`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ชั่วโมงที่แล้ว`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} วันที่แล้ว`;
  return formatDate(d);
}

/** Last `n` Bangkok calendar days (oldest first) as YYYY-MM-DD keys plus a Date anchored at noon Bangkok. */
export function lastNDays(n: number): { key: string; date: Date }[] {
  const todayKey = bangkokDayKey(new Date());
  const [y, m, d] = todayKey.split("-").map(Number);
  const out: { key: string; date: Date }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const date = new Date(Date.UTC(y, m - 1, d - i, 5, 0, 0));
    out.push({ key: bangkokDayKey(date), date });
  }
  return out;
}

/** ISO timestamp for the start of the Bangkok day `daysAgo` days back. */
export function bangkokStartOfDayISO(daysAgo = 0): string {
  const [y, m, d] = bangkokDayKey(new Date()).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d - daysAgo, -7, 0, 0)).toISOString();
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
