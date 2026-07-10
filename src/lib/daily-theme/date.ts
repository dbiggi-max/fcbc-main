/**
 * Asia/Tokyo (JST) date boundary and countdown math library.
 */

/**
 * Formats a Date object as a Japan local timezone date string: YYYY-MM-DD
 */
export function getJapanDateKey(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

/**
 * Calculates the exact remaining seconds from the current time in JST to the next JST midnight.
 */
export function getSecondsUntilJapanMidnight(now: Date = new Date()): number {
  // Get JST local time representation
  const jstString = now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" });
  const jstDate = new Date(jstString);

  // Set tomorrow at 00:00:00 in JST string terms
  const tomorrowJst = new Date(jstString);
  tomorrowJst.setDate(jstDate.getDate() + 1);
  tomorrowJst.setHours(0, 0, 0, 0);

  const diffMs = tomorrowJst.getTime() - jstDate.getTime();
  return Math.max(0, Math.floor(diffMs / 1000));
}
