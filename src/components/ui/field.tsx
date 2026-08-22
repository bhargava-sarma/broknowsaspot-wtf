"use client";

import { useId } from "react";

import { cn } from "@/lib/utils/cn";

/**
 * Form controls as wells: cut INTO the surface rather than raised off it.
 *
 * That direction is deliberate. Everything else in the app floats — cards,
 * nav, sheets — and if a field floated too, a form would read as a stack
 * of panes with no hierarchy. A recessed control says "your text goes in
 * here" without needing a border colour to say it, and it keeps the glass
 * pane the form sits on as the only thing in front of the page.
 *
 * The focus ring is on the wrapper (`.well:focus-within` in globals.css)
 * rather than on the input, so the whole recess lights rather than a line
 * under it — and there is no focus state to track in React.
 *
 * Errors are wired with aria-describedby and aria-invalid rather than
 * being colour-only, since the accent is the sole visual signal.
 */

const controlBase =
  "w-full bg-transparent text-body text-ink outline-none placeholder:text-faint";

type BaseProps = {
  label: string;
  error?: string;
  hint?: string;
  className?: string;
};

/** Label, message and the shared wrapper — identical for every control. */
function FieldShell({
  id,
  label,
  error,
  hint,
  className,
  children,
}: BaseProps & { id: string; children: React.ReactNode }) {
  return (
    <div className={cn("min-w-0", className)}>
      <label htmlFor={id} className="eyebrow block">
        {label}
      </label>
      {children}
      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-2 text-tiny font-medium text-accent"
        >
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-2 text-tiny text-faint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type TextFieldProps = BaseProps & {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  /** Renders a textarea instead of a single-line input. */
  multiline?: boolean;
  rows?: number;
  maxLength?: number;
  inputMode?: "text" | "decimal";
};

export function TextField({
  label,
  value,
  onChange,
  onBlur,
  error,
  hint,
  placeholder,
  multiline = false,
  rows = 5,
  maxLength,
  inputMode = "text",
  className,
}: TextFieldProps) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <FieldShell
      id={id}
      label={label}
      error={error}
      hint={hint}
      className={className}
    >
      <div
        className={cn(
          "well mt-2.5 rounded-[var(--radius-md)] px-4 py-3",
          error && "border-accent",
        )}
      >
        {multiline ? (
          <textarea
            id={id}
            value={value}
            rows={rows}
            maxLength={maxLength}
            onChange={(event) => onChange(event.target.value)}
            onBlur={onBlur}
            placeholder={placeholder}
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy}
            className={cn(controlBase, "resize-y leading-relaxed")}
          />
        ) : (
          <input
            id={id}
            type="text"
            inputMode={inputMode}
            value={value}
            maxLength={maxLength}
            onChange={(event) => onChange(event.target.value)}
            onBlur={onBlur}
            placeholder={placeholder}
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy}
            className={cn(controlBase, "block h-6")}
          />
        )}
      </div>
    </FieldShell>
  );
}

type ChoiceFieldProps<T extends string> = BaseProps & {
  options: readonly T[];
  labels: Record<T, string>;
  value: T | null;
  onChange: (value: T) => void;
};

/**
 * Single-select rendered as a segmented control rather than a `<select>`.
 * Native selects can't be styled into this language, and with this few
 * options showing all of them is better than hiding them behind a popup.
 *
 * The chosen segment is a lit key sitting in the well — the same figure
 * as the active tab in the mobile bar, so the two read as one idea.
 */
export function ChoiceField<T extends string>({
  label,
  options,
  labels,
  value,
  onChange,
  error,
  hint,
  className,
}: ChoiceFieldProps<T>) {
  const id = useId();

  return (
    <fieldset className={cn("min-w-0", className)}>
      <legend className="eyebrow">{label}</legend>

      <div
        role="radiogroup"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(
          "well mt-2.5 flex flex-wrap gap-1 rounded-[var(--radius-md)] p-1.5",
          error && "border-accent",
        )}
      >
        {options.map((option) => {
          const active = option === value;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(option)}
              className={cn(
                "press touch-target flex-1 rounded-[var(--radius-xs)] px-3 py-2 text-tiny whitespace-nowrap",
                active
                  ? "bg-ink font-semibold text-paper shadow-[inset_0_1px_0_var(--glass-specular)]"
                  : "font-medium text-muted hover:text-ink",
              )}
            >
              {labels[option]}
            </button>
          );
        })}
      </div>

      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-2 text-tiny font-medium text-accent"
        >
          {error}
        </p>
      ) : hint ? (
        <p className="mt-2 text-tiny text-faint">{hint}</p>
      ) : null}
    </fieldset>
  );
}
