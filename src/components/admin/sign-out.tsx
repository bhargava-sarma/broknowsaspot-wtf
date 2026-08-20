import { signOutAction } from "@/lib/admin/actions";

/** Server component: a plain form, so it works without JavaScript. */
export function SignOut({ email }: { email: string }) {
  return (
    <form
      action={signOutAction}
      className="flex flex-wrap items-baseline gap-4"
    >
      <span className="font-mono text-micro text-faint lowercase">{email}</span>
      <button
        type="submit"
        className="press touch-target border-b border-rule pb-1 font-mono text-micro text-muted lowercase"
      >
        sign out
      </button>
    </form>
  );
}
