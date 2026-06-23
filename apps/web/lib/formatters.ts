/**
 * Format milliseconds elapsed as MM:SS.
 * Used for serving patient stopwatch.
 */
export function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Format a token number as zero-padded 3-digit string.
 * Examples: 1 → "001", 47 → "047", 100 → "100"
 */
export function formatToken(n: number): string {
  return String(n).padStart(3, '0');
}

/**
 * Format a Date object as "DD MMM YYYY".
 * Example: "23 Jun 2026"
 */
export function formatDate(date: Date): string {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const day = String(date.getDate()).padStart(2, '0');
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Format a Date object as "DD MMM YYYY, HH:MM".
 * Example: "23 Jun 2026, 14:30"
 */
export function formatDateTime(date: Date): string {
  const dateStr = formatDate(date);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${dateStr}, ${hours}:${minutes}`;
}

/**
 * Format a Unix ms timestamp as relative time.
 * Examples: "Just now", "2 min ago", "1 hr ago"
 */
export function formatTimeAgo(timestampMs: number): string {
  const diffMs = Date.now() - timestampMs;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);

  if (diffSeconds < 10) return 'Just now';
  if (diffSeconds < 60) return `${diffSeconds}s ago`;
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  if (diffHours < 24) return `${diffHours} hr ago`;

  return formatDate(new Date(timestampMs));
}

/**
 * Format a duration in minutes as human-readable.
 * Examples: "8.5 min", "0 min"
 */
export function formatMinutes(minutes: number): string {
  return `${Math.round(minutes * 10) / 10} min`;
}

/**
 * Get today's date as YYYY-MM-DD string.
 */
export function getTodayDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}