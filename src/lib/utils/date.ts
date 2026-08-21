const dayFormat = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const minuteFormat = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

/** `14 Aug 2026`. */
export function formatDate(iso: string): string {
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? iso : dayFormat.format(parsed);
}

/**
 * `14 Aug 2026, 09:31 UTC`. Pinned to UTC rather than the viewer's zone:
 * these render in moderation records, where two people comparing notes
 * need to be reading the same clock. It also keeps the server and client
 * renders identical, which a local-time format would not.
 */
export function formatTimestamp(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return `${minuteFormat.format(parsed)} UTC`;
}
