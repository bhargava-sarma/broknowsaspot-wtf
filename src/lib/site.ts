/**
 * The site's identity, in one place.
 *
 * This used to be the string "broknowsaspot.wtf" typed into nine files —
 * page metadata, OG tags, the footer wordmark, the admin lede. Moving from
 * .wtf to .app meant finding all nine, which is exactly the kind of thing
 * that gets found eight times.
 */

/** Without the TLD. The wordmark splits on this so the suffix can carry
 *  the accent colour. */
export const SITE_NAME = "broknowsaspot";

/** The TLD, dot included. */
export const SITE_TLD = ".app";

/** How the site refers to itself in prose and metadata. */
export const SITE_TITLE = `${SITE_NAME}${SITE_TLD}`;

/**
 * Absolute URLs in OG tags have to match wherever this is actually served,
 * so the deployment sets it. The fallback is the production domain, which
 * keeps local builds and preview deploys producing sane metadata rather
 * than relative nonsense.
 *
 * `.app` is on the HSTS preload list — browsers refuse plain HTTP to it —
 * so there is no http:// variant of this to worry about.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? `https://${SITE_TITLE}`;

export const SITE_DESCRIPTION =
  "a crowdsourced index of hidden, offbeat and adventurous places, for people who don't stick to the tourist path.";

/** The shorter one, for cards where the long version wraps badly. */
export const SITE_DESCRIPTION_SHORT =
  "a crowdsourced index of hidden, offbeat and adventurous places.";
