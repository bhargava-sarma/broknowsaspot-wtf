import {
  REPORT_REASON_LABELS,
  type ReportDetail,
  type ReportReason,
} from "@/lib/spots/reports";

/**
 * What was reported, tallied by reason, with whatever people wrote.
 *
 * The count alone cannot be acted on: "reported ten times" is the same
 * number whether ten people think it is dangerous or ten think it is
 * spam, and those are opposite decisions. The tally is the decision, and
 * the free text is usually the thing that settles it.
 *
 * There is no reporter here and there is not meant to be — see
 * `readReports`. The text is written by the public, so it is displayed as
 * text and never as markup.
 */
export function ReportBreakdown({ reports }: { reports: ReportDetail[] }) {
  if (reports.length === 0) {
    // Reported, but the rows are not readable — which on this surface
    // means the session is not an admin. Say so rather than implying
    // nobody gave a reason.
    return <p className="mt-3 text-tiny text-faint">Reasons unavailable</p>;
  }

  const tally = new Map<ReportReason, number>();
  for (const report of reports) {
    tally.set(report.reason, (tally.get(report.reason) ?? 0) + 1);
  }
  const ranked = [...tally.entries()].sort((a, b) => b[1] - a[1]);
  const notes = reports.filter((report) => report.detail);

  return (
    <div className="mt-3">
      <ul className="space-y-1">
        {ranked.map(([reason, count]) => (
          <li
            key={reason}
            className="flex items-baseline justify-between gap-3 rounded-[var(--radius-xs)] bg-ink/[0.05] px-3 py-2"
          >
            <span className="max-w-[30ch] text-tiny leading-snug text-muted">
              {REPORT_REASON_LABELS[reason] ?? reason}
            </span>
            <span className="shrink-0 text-tiny font-semibold text-ink tabular-nums">
              {count}
            </span>
          </li>
        ))}
      </ul>

      {notes.length > 0 ? (
        <div className="mt-3">
          <p className="eyebrow">What they said</p>
          <ul className="mt-2.5 space-y-2">
            {notes.map((report, index) => (
              <li
                key={`${report.at}-${index}`}
                className="max-w-[34ch] border-l-2 border-accent/40 pl-3 text-tiny leading-snug text-muted"
              >
                {report.detail}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
