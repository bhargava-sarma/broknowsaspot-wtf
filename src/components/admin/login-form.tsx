"use client";

import { useActionState } from "react";

import { IDLE } from "@/lib/admin/action-state";
import { signInAction } from "@/lib/admin/actions";
import { ArrowRight, Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

/**
 * The same flat language as the submission form: a mono label over a
 * hairline, no boxes. Native inputs with real types, so password managers
 * and autofill behave.
 */
export function LoginForm() {
  const [state, formAction, pending] = useActionState(signInAction, IDLE);

  const control = "w-full bg-transparent text-body text-ink outline-none";
  const well = "well mt-2.5 rounded-[var(--radius-md)] px-4 py-3";

  return (
    <form
      action={formAction}
      className="glass mx-auto max-w-[26rem] rounded-[var(--radius-xl)] p-[clamp(1.5rem,1.2rem+1.4vw,2.25rem)]"
    >
      <div className="grid gap-5">
        <div>
          <label htmlFor="admin-email" className="eyebrow block">
            Email
          </label>
          <div className={well}>
            <input
              id="admin-email"
              name="email"
              type="email"
              autoComplete="username"
              required
              aria-invalid={state.status === "error"}
              className={cn(control, "block h-6")}
            />
          </div>
        </div>

        <div>
          <label htmlFor="admin-password" className="eyebrow block">
            Password
          </label>
          <div className={well}>
            <input
              id="admin-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              aria-invalid={state.status === "error"}
              className={cn(control, "block h-6")}
            />
          </div>
        </div>
      </div>

      {state.status === "error" ? (
        <p role="alert" className="mt-5 text-tiny font-medium text-accent">
          {state.message}
        </p>
      ) : null}

      <Button
        type="submit"
        tone="ember"
        disabled={pending}
        className="mt-7 w-full"
      >
        {pending ? "Checking…" : "Sign in"}
        <ArrowRight />
      </Button>
    </form>
  );
}
