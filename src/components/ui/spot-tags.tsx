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
 * a glance down a list, which a word doesn't, and it reads like a level
 * meter on a piece of hardware.
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
      title={`difficulty: ${DIFFICULTY_LABELS[value]}`}
    >
      <span aria-hidden="true" className="inline-flex items-center gap-[3px]">
        {DIFFICULTIES.map((_, index) => (
          <span
            key={index}
            className={cn(
              "block h-[7px] w-[3px]",
              index < level
                ? // Only the top rung earns the accent.
                  value === "serious"
                  ? "bg-accent"
                  : "bg-ink"
                : "bg-rule",
            )}
          />
        ))}
      </span>
      <span className="font-mono text-micro text-faint lowercase">
        {DIFFICULTY_LABELS[value]}
      </span>
    </span>
  );
}

export function AccessTag({
  value,
  className,
}: {
  value: Access;
  className?: string;
}) {
  // `private` is the one access type we actively discourage, so it is the
  // one that gets marked.
  const marked = value === "private" || value === "grey";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-mono text-micro lowercase",
        marked ? "text-accent" : "text-faint",
        className,
      )}
    >
      <span aria-hidden="true">{marked ? "▲" : "●"}</span>
      {ACCESS_LABELS[value]}
    </span>
  );
}

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
        "font-mono text-micro tracking-[0.13em] text-faint lowercase",
        className,
      )}
    >
      {CATEGORY_LABELS[value]}
    </span>
  );
}
