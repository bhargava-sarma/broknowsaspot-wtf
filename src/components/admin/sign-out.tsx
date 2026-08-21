import { signOutAction } from "@/lib/admin/actions";

/** Server component: a plain form, so it works without JavaScript. */
export function SignOut({ email }: { email: string }) {
  return (
    <form
      action={signOutAction}
      className="glass flex flex-wrap items-center gap-4 rounded-[var(--radius-lg)] px-4 py-3"
    >
      <span className="text-tiny text-faint">{email}</span>
      <button
        type="submit"
        className="press touch-target text-tiny font-semibold text-accent"
      >
        Sign out
      </button>
    </form>
  );
}
