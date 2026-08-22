import {
  ACCESS_LABELS,
  CATEGORY_LABELS,
  DIFFICULTIES,
  DIFFICULTY_LABELS,
  type Access,
  type Category,
  type Difficulty,
} from "@/lib/types/spot";
import { cn } from "@/lib/utils/cn";

/**
 * Difficulty as a four-segment readout rather than a word — it compares at
 * a glance down a list, which a word doesn't.
 */
export function DifficultyMeter({
  value,
  className,
}: {
  value: Difficulty;
  className?: string;
}) {
  const level = DIFFICULTIES.indexOf(value) + 1;

  return (
    <span
      className={cn("inline-flex items-center gap-2", className)}
      title={`Difficulty: ${DIFFICULTY_LABELS[value]}`}
    >
      <span aria-hidden="true" className="inline-flex items-center gap-[3px]">
        {DIFFICULTIES.map((_, index) => (
          <span
            key={index}
            className={cn(
              "block h-[3px] w-[9px] rounded-full",
              index < level
                ? // Only the top rung earns the accent.
                  value === "serious"
                  ? "bg-accent"
                  : "bg-ink"
                : "bg-ink/15",
            )}
          />
        ))}
      </span>
      <span className="text-tiny text-faint">{DIFFICULTY_LABELS[value]}</span>
    </span>
  );
}

/**
 * How open a place is, as a colour the eye reads before the word.
 *
 * Green means walk in; amber means there is a gate, a fee or a permit;
 * ember means somebody may object to you being there. Kept out of the
 * `--tone-*` namespace on purpose — these are status dots, never text.
 */
const ACCESS_DOT: Record<Access, string> = {
  open: "bg-[#2f8f56] dark:bg-[#6ee7a8]",
  permit: "bg-[#96690a] dark:bg-[#ffd166]",
  grey: "bg-accent",
  private: "bg-accent",
};

export function AccessTag({
  value,
  className,
}: {
  value: Access;
  className?: string;
}) {
  // `private` and `grey` are the two we actively flag.
  const marked = value === "private" || value === "grey";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-tiny",
        marked ? "text-accent" : "text-muted",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn("block size-[6px] rounded-full", ACCESS_DOT[value])}
      />
      {ACCESS_LABELS[value]}
    </span>
  );
}

/** A category, as a glass chip that can sit on a photo. */
export function CategoryTag({
  value,
  className,
}: {
  value: Category;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "glass-1 inline-flex items-center rounded-[var(--radius-xs)] px-2.5 py-1 text-[0.6875rem] font-semibold tracking-[0.14em] text-muted uppercase",
        className,
      )}
    >
      {CATEGORY_LABELS[value]}
    </span>
  );
}
