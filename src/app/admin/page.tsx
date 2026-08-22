import { ModerationRow } from "@/components/admin/moderation-row";
import { NoteRow } from "@/components/admin/note-row";
import { SignOut } from "@/components/admin/sign-out";
import { PageHeader } from "@/components/layout/page-header";
import { ArrowRight, ButtonLink } from "@/components/ui/button";
import {
  readQueue,
  readLog,
  readNoteQueue,
  type QueueEntry,
} from "@/lib/admin/queue";
import { readAdminGate } from "@/lib/admin/session";
import { formatTimestamp } from "@/lib/utils/date";

/**
 * The moderation queue.
 *
 * The proxy has already bounced visitors with no session cookie, but this
 * re-checks anyway — that check is routing, not authorisation. It reads a
 * cookie's presence and cannot tell a real session from a forged one. The
 * queue itself is read with the caller's own session, so Appwrite refuses
 * it outright unless this account is in the admins team.
 */

const PAST_TENSE: Record<string, string> = {
  hide: "hid",
  restore: "restored",
  remove: "removed",
};

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <section className="shell py-[clamp(2rem,1.4rem+3vw,4rem)]">
      <div className="glass max-w-[46rem] rounded-[var(--radius-xl)] p-[clamp(1.5rem,1.2rem+1.4vw,2.25rem)]">
        <h2 className="text-h3 text-ink">{title}</h2>
        <p className="mt-4 max-w-[52ch] text-body text-muted">{body}</p>
      </div>
    </section>
  );
}

/** One section heading, so the queue and the log look like one thing. */
function Heading({
  children,
  note,
}: {
  children: React.ReactNode;
  note?: string;
}) {
  return (
    <div className="mb-5">
      <p className="eyebrow">{children}</p>
      {note ? (
        <p className="mt-3 max-w-[52ch] text-small text-muted">{note}</p>
      ) : null}
    </div>
  );
}

export default async function AdminPage() {
  const gate = await readAdminGate();

  if (gate.state === "unconfigured") {
    return (
      <>
        <PageHeader eyebrow="Restricted" title="Moderation" />
        <Notice
          title="Not configured here"
          body="This environment has no Appwrite credentials, so there is no database to moderate."
        />
      </>
    );
  }

  if (gate.state === "signed-out") {
    return (
      <>
        <PageHeader eyebrow="Restricted" title="Moderation" />
        <section className="shell py-[clamp(2rem,1.4rem+3vw,4rem)]">
          <ButtonLink href="/admin/login" tone="ember">
            Sign in
            <ArrowRight />
          </ButtonLink>
        </section>
      </>
    );
  }

  if (gate.state === "not-admin") {
    // Deliberately not a redirect to /admin/login: this account *is*
    // signed in, and sending it back to a login screen it just came from
    // would loop and would misdescribe what happened.
    return (
      <>
        <PageHeader eyebrow="Restricted" title="Moderation" />
        <section className="shell py-[clamp(2rem,1.4rem+3vw,4rem)]">
          <div className="glass max-w-[46rem] rounded-[var(--radius-xl)] p-[clamp(1.5rem,1.2rem+1.4vw,2.25rem)]">
            <h2 className="text-h3 text-ink">Not an admin</h2>
            <p className="mt-4 max-w-[52ch] text-body text-muted">
              You&rsquo;re signed in as {gate.email}, but that account has no
              moderation rights. Having an account and being a moderator are
              separate things here.
            </p>
            <div className="mt-7">
              <SignOut email={gate.email} />
            </div>
          </div>
        </section>
      </>
    );
  }

  // The session secret only exists on the Appwrite path, where the queue
  // is read as the admin rather than on an API key.
  const secret = gate.secret;
  const [queue, notes, log] = await Promise.all([
    readQueue(secret),
    readNoteQueue(secret),
    readLog(20, secret),
  ]);

  if (!queue.ok) {
    return (
      <>
        <PageHeader eyebrow="Moderation" title="The queue" />
        <Notice title="Couldn't load the queue" body={queue.message} />
      </>
    );
  }

  const needsAttention = queue.entries.filter(
    (entry: QueueEntry) => entry.state !== "visible" || entry.reportCount > 0,
  );
  const quiet = queue.entries.filter(
    (entry: QueueEntry) => entry.state === "visible" && entry.reportCount === 0,
  );

  return (
    <>
      <PageHeader
        eyebrow="Moderation"
        title="The queue"
        lede="Everything in the index, hidden entries included. Hiding and removing are both reversible, and both leave a record."
      >
        <SignOut email={gate.email} />
      </PageHeader>

      {/* ------------------------------------------------------ readout */}
      <section className="shell">
        {/* One tile per figure rather than one panel with dividers: the
            divider bookkeeping across three breakpoints was the only
            complicated thing on this page, and panes are the vocabulary
            everywhere else anyway. */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { label: "In the index", value: queue.entries.length },
            {
              label: "Live",
              value: queue.entries.filter((e) => e.state === "visible").length,
            },
            {
              label: "Hidden",
              value: queue.entries.filter((e) => e.state === "hidden").length,
            },
            {
              label: "Removed",
              value: queue.entries.filter((e) => e.state === "removed").length,
            },
            {
              label: "Notes",
              value: notes.ok ? notes.entries.length : "—",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="glass rounded-[var(--radius-lg)] px-5 py-[clamp(1.1rem,0.9rem+0.8vw,1.6rem)]"
            >
              <p className="font-[family-name:var(--font-display)] text-h2 text-ink tabular-nums">
                {stat.value}
              </p>
              <p className="eyebrow mt-2.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------- the queue */}
      <section className="shell mt-[clamp(2rem,1.5rem+2vw,3.5rem)]">
        <Heading>Needs a decision</Heading>

        {needsAttention.length > 0 ? (
          <ul className="grid gap-3">
            {needsAttention.map((entry) => (
              <ModerationRow key={entry.slug} entry={entry} />
            ))}
          </ul>
        ) : (
          <p className="glass max-w-[46rem] rounded-[var(--radius-lg)] p-6 text-body text-muted">
            Nothing reported and nothing hidden. Every entry below is live.
          </p>
        )}
      </section>

      {/* ----------------------------------------------------- the rest */}
      {quiet.length > 0 ? (
        <section className="shell mt-[clamp(2rem,1.5rem+2vw,3.5rem)]">
          <Heading>Everything else</Heading>
          <ul className="grid gap-3">
            {quiet.map((entry) => (
              <ModerationRow key={entry.slug} entry={entry} />
            ))}
          </ul>
        </section>
      ) : null}

      {/* ---------------------------------------------------- the notes */}
      <section className="shell mt-[clamp(2rem,1.5rem+2vw,3.5rem)]">
        <Heading note="Newest first, hidden ones included.">
          Community notes
        </Heading>

        {!notes.ok ? (
          <p className="glass max-w-[46rem] rounded-[var(--radius-lg)] p-6 text-body text-muted">
            {notes.message}
          </p>
        ) : notes.entries.length > 0 ? (
          <ul className="grid gap-3">
            {notes.entries.map((note) => (
              <NoteRow key={note.id} entry={note} />
            ))}
          </ul>
        ) : (
          <p className="glass max-w-[46rem] rounded-[var(--radius-lg)] p-6 text-body text-muted">
            Nobody has left a note yet.
          </p>
        )}
      </section>

      {/* ------------------------------------------------------ the log */}
      <section className="shell mt-[clamp(2rem,1.5rem+2vw,3.5rem)]">
        <Heading>Recent decisions</Heading>

        {!log.ok ? (
          <p className="glass max-w-[46rem] rounded-[var(--radius-lg)] p-6 text-body text-muted">
            {log.message}
          </p>
        ) : log.entries.length > 0 ? (
          <ul className="glass overflow-hidden rounded-[var(--radius-lg)]">
            {log.entries.map((row, i) => (
              <li
                key={row.id}
                className={[
                  "grid gap-x-5 gap-y-1 px-5 py-4 sm:grid-cols-12",
                  i > 0 ? "border-t border-[var(--glass-rim)]" : "",
                ].join(" ")}
              >
                <p className="text-tiny text-faint tabular-nums sm:col-span-3">
                  {formatTimestamp(row.at)}
                </p>
                <p className="text-small text-ink sm:col-span-5">
                  {row.actor ?? "Someone"}{" "}
                  {PAST_TENSE[row.action] ?? row.action}{" "}
                  <span className="font-medium">{row.slug}</span>
                </p>
                <p className="text-small text-muted sm:col-span-4">
                  {row.reason ?? "—"}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="glass max-w-[46rem] rounded-[var(--radius-lg)] p-6 text-body text-muted">
            Nothing yet. Automatic hides don&rsquo;t appear here — this is a
            record of decisions people made.
          </p>
        )}
      </section>
    </>
  );
}
