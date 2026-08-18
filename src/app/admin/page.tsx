import { ModerationRow } from "@/components/admin/moderation-row";
import { SignOut } from "@/components/admin/sign-out";
import { PageHeader } from "@/components/layout/page-header";
import { ActionLink } from "@/components/ui/action-link";
import { readQueue, readLog, type QueueEntry } from "@/lib/admin/queue";
import { readAdminGate } from "@/lib/admin/session";
import { formatTimestamp } from "@/lib/utils/date";

/**
 * The moderation queue.
 *
 * Middleware has already bounced signed-out visitors, but this re-checks
 * anyway — middleware is routing, not authorisation, and the queue query
 * itself is refused by Postgres if this account is not an admin.
 */

const PAST_TENSE: Record<string, string> = {
  hide: "hid",
  restore: "restored",
  remove: "removed",
};

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <section className="shell py-[clamp(2.5rem,1.8rem+4vw,5rem)]">
      <h2 className="text-h3 font-light text-ink lowercase">{title}</h2>
      <p className="mt-4 max-w-[46ch] text-body text-muted">{body}</p>
    </section>
  );
}

export default async function AdminPage() {
  const gate = await readAdminGate();

  if (gate.state === "unconfigured") {
    return (
      <>
        <PageHeader eyebrow="restricted" title="admin" />
        <Notice
          title="not configured here"
          body="this environment has no supabase credentials, so there is no database to moderate."
        />
      </>
    );
  }

  if (gate.state === "signed-out") {
    return (
      <>
        <PageHeader eyebrow="restricted" title="admin" />
        <section className="shell py-[clamp(2.5rem,1.8rem+4vw,5rem)]">
          <ActionLink href="/admin/login" tone="accent">
            sign in
          </ActionLink>
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
        <PageHeader eyebrow="restricted" title="admin" />
        <section className="shell py-[clamp(2.5rem,1.8rem+4vw,5rem)]">
          <h2 className="text-h3 font-light text-ink lowercase">
            not an admin
          </h2>
          <p className="mt-4 max-w-[46ch] text-body text-muted">
            you&rsquo;re signed in as {gate.email}, but that account has no
            moderation rights. having an account and being a moderator are
            separate things here.
          </p>
          <div className="mt-9">
            <SignOut email={gate.email} />
          </div>
        </section>
      </>
    );
  }

  const [queue, log] = await Promise.all([readQueue(), readLog()]);

  if (!queue.ok) {
    return (
      <>
        <PageHeader eyebrow="moderation" title="admin" />
        <Notice title="couldn't load the queue" body={queue.message} />
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
        eyebrow="moderation"
        title="admin"
        lede="everything in the index, hidden entries included. hiding and removing are both reversible, and both leave a record."
      >
        <SignOut email={gate.email} />
      </PageHeader>

      {/* ------------------------------------------------------ readout */}
      <section className="rule-b">
        <div className="shell grid grid-cols-2 gap-y-6 py-[clamp(1.5rem,1.2rem+1.2vw,2.25rem)] sm:grid-cols-4">
          {[
            { label: "in the index", value: queue.entries.length },
            {
              label: "live",
              value: queue.entries.filter((e) => e.state === "visible").length,
            },
            {
              label: "hidden",
              value: queue.entries.filter((e) => e.state === "hidden").length,
            },
            {
              label: "removed",
              value: queue.entries.filter((e) => e.state === "removed").length,
            },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="label">{stat.label}</p>
              <p className="mt-2 font-mono text-h3 text-ink">{stat.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------- the queue */}
      <section>
        <div className="shell rule-b py-[clamp(1.5rem,1.2rem+1.2vw,2.25rem)]">
          <p className="label flex items-center gap-3">
            <span className="text-accent">{"///"}</span>
            needs a decision
          </p>
        </div>

        {needsAttention.length > 0 ? (
          <ul>
            {needsAttention.map((entry) => (
              <ModerationRow key={entry.slug} entry={entry} />
            ))}
          </ul>
        ) : (
          <div className="shell rule-b py-[clamp(2rem,1.5rem+2vw,3.5rem)]">
            <p className="max-w-[46ch] text-body text-muted">
              nothing reported and nothing hidden. every entry below is live.
            </p>
          </div>
        )}
      </section>

      {/* ----------------------------------------------------- the rest */}
      {quiet.length > 0 ? (
        <section>
          <div className="shell rule-b py-[clamp(1.5rem,1.2rem+1.2vw,2.25rem)]">
            <p className="label">everything else</p>
          </div>
          <ul>
            {quiet.map((entry) => (
              <ModerationRow key={entry.slug} entry={entry} />
            ))}
          </ul>
        </section>
      ) : null}

      {/* ------------------------------------------------------ the log */}
      <section className="pb-[clamp(4rem,3rem+6vw,9rem)]">
        <div className="shell rule-b py-[clamp(1.5rem,1.2rem+1.2vw,2.25rem)]">
          <p className="label">recent decisions</p>
        </div>

        {!log.ok ? (
          <div className="shell py-[clamp(2rem,1.5rem+2vw,3.5rem)]">
            <p className="max-w-[46ch] text-body text-muted">{log.message}</p>
          </div>
        ) : log.entries.length > 0 ? (
          <ul className="shell">
            {log.entries.map((row) => (
              <li
                key={row.id}
                className="grid gap-x-[var(--gutter)] gap-y-1 border-b border-rule py-4 sm:grid-cols-12"
              >
                <p className="font-mono text-micro text-faint lowercase sm:col-span-3">
                  {formatTimestamp(row.at)}
                </p>
                <p className="text-small text-ink sm:col-span-5">
                  {row.actor ?? "someone"}{" "}
                  {PAST_TENSE[row.action] ?? row.action}{" "}
                  <span className="font-mono text-tiny">{row.slug}</span>
                </p>
                <p className="text-small text-muted sm:col-span-4">
                  {row.reason ?? "—"}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <div className="shell py-[clamp(2rem,1.5rem+2vw,3.5rem)]">
            <p className="max-w-[46ch] text-body text-muted">
              nothing yet. automatic hides don&rsquo;t appear here — this is a
              record of decisions people made.
            </p>
          </div>
        )}
      </section>
    </>
  );
}
