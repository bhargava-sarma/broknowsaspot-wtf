"use client";

import { useActionState } from "react";

import { IDLE } from "@/lib/admin/action-state";
import { signInAction } from "@/lib/admin/actions";

/**
 * The same flat language as the submission form: a mono label over a
 * hairline, no boxes. Native inputs with real types, so password managers
 * and autofill behave.
 */
export function LoginForm() {
  const [state, formAction, pending] = useActionState(signInAction, IDLE);

  const control =
    "w-full border-b border-rule bg-transparent pt-2 pb-2 text-body text-ink outline-none transition-colors duration-200 hover:border-muted focus:border-ink placeholder:text-faint touch-target";

  return (
    <form action={formAction} className="max-w-[34rem]">
      <div className="grid gap-[clamp(1.5rem,1.2rem+1.2vw,2.25rem)]">
        <div>
          <label htmlFor="admin-email" className="label block">
            email
          </label>
          <input
            id="admin-email"
            name="email"
            type="email"
            autoComplete="username"
            required
            aria-invalid={state.status === "error"}
            className={control}
          />
        </div>

        <div>
          <label htmlFor="admin-password" className="label block">
            password
          </label>
          <input
            id="admin-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            aria-invalid={state.status === "error"}
            className={control}
          />
        </div>
      </div>

      {state.status === "error" ? (
        <p
          role="alert"
          className="mt-6 font-mono text-micro text-accent lowercase"
        >
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="tap touch-target mt-9 inline-flex items-center gap-3 border-b border-rule-strong pb-2 font-mono text-tiny tracking-[0.04em] text-ink lowercase disabled:opacity-50"
      >
        {pending ? "checking…" : "sign in"}
        <span aria-hidden="true">→</span>
      </button>
    </form>
  );
}
