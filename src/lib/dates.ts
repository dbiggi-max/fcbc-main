/**
 * Date boundary and timezone helper library for Daily Theme lookups.
 */

/**
 * Returns the start of today and the start of tomorrow as Date objects
 * in the server's local timezone. Used for strict day-range queries:
 * gte startOfToday, lt startOfTomorrow
 */
export function getTodayDateRange() {
  const now = new Date();
  
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  
  return {
    startOfToday,
    startOfTomorrow,
  };
}

/**
 * Returns a consistent Date object representing today at local midnight.
 * Used for database seeding so dates align perfectly with startOfToday.
 */
export function getTodayAtMidnight() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}
