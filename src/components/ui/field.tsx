"use client";

import { useId } from "react";

import { cn } from "@/lib/utils/cn";

/**
 * Form controls in the flat language: no boxes, no fills, no radius. A
 * field is a monospace label over a hairline, and the hairline is the only
 * thing that changes — it inks up on focus and turns accent on error.
 *
 * Errors are wired with aria-describedby and aria-invalid rather than being
 * colour-only, since the accent is the sole visual signal.
 */

const controlBase =
  "w-full border-b bg-transparent pt-2 pb-2 text-body text-ink outline-none transition-colors duration-200 placeholder:text-faint";

function ruleClass(error?: string) {
  return error
    ? "border-accent"
    : "border-rule focus:border-ink hover:border-muted";
}

type BaseProps = {
  label: string;
  error?: string;
  hint?: string;
  className?: string;
};

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
    <div className={cn("min-w-0", className)}>
      <label htmlFor={id} className="label block">
        {label}
      </label>

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
          className={cn(
            controlBase,
            ruleClass(error),
            "resize-y leading-relaxed",
          )}
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
          className={cn(controlBase, ruleClass(error), "touch-target")}
        />
      )}

      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-1.5 font-mono text-micro text-accent lowercase"
        >
          {error}
        </p>
      ) : hint ? (
        <p
          id={`${id}-hint`}
          className="mt-1.5 font-mono text-micro text-faint lowercase"
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type ChoiceFieldProps<T extends string> = BaseProps & {
  options: readonly T[];
  labels: Record<T, string>;
  value: T | null;
  onChange: (value: T) => void;
};

/**
 * Single-select rendered as a radio group of words rather than a <select>.
 * Native selects can't be styled into this language, and with this few
 * options showing all of them is better than hiding them behind a popup.
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
      <legend className="label">{label}</legend>

      <div
        role="radiogroup"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className="mt-2 flex flex-wrap gap-x-5 gap-y-1 border-b border-rule pb-2"
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
                "tap touch-target relative py-1 font-mono text-micro lowercase",
                active ? "text-ink" : "text-faint",
              )}
            >
              {labels[option]}
              {active ? (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-0 block h-px bg-accent"
                />
              ) : null}
            </button>
          );
        })}
      </div>

      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-1.5 font-mono text-micro text-accent lowercase"
        >
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 font-mono text-micro text-faint lowercase">
          {hint}
        </p>
      ) : null}
    </fieldset>
  );
}
