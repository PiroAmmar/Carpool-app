/**
 * Formats a date string (YYYY-MM-DD or ISO) into DD-MM-YYYY format for all notifications & emails.
 * E.g. "2026-08-19" -> "19-08-2026"
 */
export function formatNotificationDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  const clean = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.trim();
  const parts = clean.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
}

/**
 * Formats a time string (e.g. "07:50:00", "07:50", "15:30") into readable 12-hour format without leading zeros (e.g. "7:50 AM", "3:30 PM").
 */
export function formatNotificationTime(timeStr?: string | null): string {
  if (!timeStr) return '';
  try {
    const clean = timeStr.trim();
    // If it's already in 12-hour format (e.g. "07:45 AM" or "7:45 AM"), strip leading zeros
    if (/am|pm/i.test(clean)) {
      return clean.replace(/^0(\d:)/, '$1');
    }
    const parts = clean.split(':');
    let hour = parseInt(parts[0], 10);
    const minute = parts[1] || '00';
    if (isNaN(hour)) return timeStr;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    if (hour === 0) hour = 12;
    return `${hour}:${minute} ${ampm}`;
  } catch {
    return timeStr;
  }
}
