/**
 * Shared shape for every admin form's result.
 *
 * Kept out of actions.ts because a `"use server"` module may only export
 * async functions — a plain constant there is a build error, not a style
 * preference. Types are erased, but `IDLE` is a real value.
 */
export type ActionState = {
  status: "idle" | "ok" | "error";
  message: string;
};

export const IDLE: ActionState = { status: "idle", message: "" };
