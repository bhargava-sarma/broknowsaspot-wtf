/**
 * Report reasons, mirroring the `report_reason` enum in the database.
 *
 * There is deliberately no threshold constant here. A spot auto-hides at a
 * fixed number of distinct reporters, but that number lives only in the
 * database trigger — it is never sent to the client and never shown in the
 * UI, because publishing it turns the count into a progress bar for anyone
 * trying to take an entry down.
 */

export const REPORT_REASONS = [
  "dangerous",
  "illegal_access",
  "private_info",
  "inaccurate",
  "spam",
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  dangerous: "unsafe or wrong in a way that could hurt someone",
  illegal_access: "shouldn't be encouraging access here",
  private_info: "exposes someone's identity or address",
  inaccurate: "wrong, stale, or not there any more",
  spam: "not a real entry",
};

export function isReportReason(value: unknown): value is ReportReason {
  return REPORT_REASONS.includes(value as ReportReason);
}
