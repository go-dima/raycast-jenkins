/**
 * Date and time utility functions
 */

/**
 * Formats a duration from a start timestamp to a human-readable string
 * @param startedAt - The timestamp when the job started (in milliseconds)
 * @returns A formatted duration string (e.g., "5m", "2h 30m", "45s")
 */
export function formatDuration(startedAt: number): string {
  const duration = Math.floor((Date.now() - startedAt) / 1000);

  if (duration < 60) return `${duration}s`;
  if (duration < 3600) return `${Math.floor(duration / 60)}m`;
  return `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`;
}

/**
 * Formats a timestamp to a human-readable date string
 * @param timestamp - The timestamp to format (in milliseconds)
 * @returns A formatted date string
 */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

/**
 * Calculates the time ago from a timestamp
 * @param timestamp - The timestamp to calculate from (in milliseconds)
 * @returns A string representing time elapsed (e.g., "2 minutes ago", "1 hour ago")
 */
export function getTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  return `${seconds} second${seconds > 1 ? "s" : ""} ago`;
}
