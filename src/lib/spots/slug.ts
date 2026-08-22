/**
 * Slugify.
 *
 * A slug is a spot's permanent URL, so this has to stay stable: changing
 * how it folds a character breaks every link to every spot whose name
 * contains one.
 *
 * Accent folding happens first, and is not decoration — this index is
 * mostly places whose names carry diacritics. Strip non-[a-z0-9] before
 * folding and "vlorë" becomes "vlor", "å" disappears entirely.
 *
 * `normalize("NFD")` decomposes a letter into its base plus a combining
 * mark, so removing the marks leaves the base behind. That handles every
 * accented form of an ASCII letter without a lookup table.
 */
function slugify(input: string): string {
  return (
    (input ?? "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      // Letters NFD cannot decompose, because they are not accented
      // forms of an ASCII letter — these need naming one by one.
      .replace(/ø/g, "o")
      .replace(/đ|ð/g, "d")
      .replace(/þ/g, "t")
      .replace(/ß/g, "s")
      .replace(/æ/g, "a")
      .replace(/œ/g, "o")
      .replace(/ł/g, "l")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/-{2,}/g, "-")
      .replace(/^-+|-+$/g, "")
  );
}

/**
 * Appwrite caps a row ID at 36 characters, and a slug is not the row ID
 * partly because of that. It is still worth a ceiling: a slug is a URL
 * people type and share, and an 80-character name should not produce an
 * 80-character path.
 */
const SLUG_MAX = 60;

/**
 * The slug for a *new* submission.
 *
 * Note that the seeded spots' slugs are editorial, not generated —
 * "gjipe cove" is filed under `gjipe-beach-approach` because that is what
 * people search for. Twelve of the fourteen differ from what this would
 * produce, which is correct and deliberate: the seeder writes the slug it
 * is given and never regenerates one. A slug is a permanent URL, so it is
 * chosen once and then left alone.
 */
export function toSlug(name: string): string {
  const base = slugify(name).slice(0, SLUG_MAX).replace(/-+$/, "");
  // Every name in the index is at least three characters, but a name made
  // entirely of characters this strips would otherwise produce "".
  return base || "spot";
}
