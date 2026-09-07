"use client";

/**
 * Turns a chosen file into something safe to publish.
 *
 * ---------------------------------------------------------------------
 * The point of this file is what it throws away
 * ---------------------------------------------------------------------
 *
 * A photo off a phone is not just an image. It carries EXIF, and EXIF
 * routinely contains:
 *
 *   - GPS latitude, longitude and altitude, to a few metres
 *   - the exact timestamp, to the second
 *   - camera make, model and often a serial number
 *   - on some devices a thumbnail of the *original* frame, which survives
 *     cropping — so a crop that removed something can still contain it
 *
 * On an index of places people would rather keep quiet, uploading a raw
 * camera file is a far larger disclosure than uploading a picture. It can
 * pin down someone's home from a photo taken there earlier, or reveal a
 * spot's true position when the contributor deliberately placed the pin
 * loosely.
 *
 * So the raw file is never uploaded. The image is decoded, drawn onto a
 * canvas, and re-encoded — and a canvas has no way to carry metadata
 * forward, so the output holds pixels and nothing else. That this happens
 * *here*, before any network call, is the part that matters: the file
 * with the GPS in it never leaves the device, so there is no window in
 * which a server, a log or a proxy could have seen it.
 *
 * Downscaling is a privacy measure too, not only a bandwidth one. Fewer
 * pixels means less incidental detail — a doorbell, a number plate, a
 * face at the edge of frame — surviving into something published.
 */

/** Longest edge, in pixels. Enough for a full-width plate on a big screen. */
const MAX_EDGE = 2000;

/** JPEG quality. High enough to look right, low enough to stay small. */
const QUALITY = 0.82;

/** Refused above this, before any decoding is attempted. */
export const MAX_INPUT_BYTES = 12 * 1024 * 1024;

/** What the file input offers, and what the server re-checks. */
export const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

export type PreparedPhoto = {
  /** Re-encoded, metadata-free, ready to upload. */
  blob: Blob;
  /** Object URL for the preview. Callers must revoke it. */
  previewUrl: string;
  width: number;
  height: number;
  bytes: number;
};

export type PrepareFailure =
  "not-an-image" | "too-large" | "unreadable" | "encode-failed";

export const PREPARE_MESSAGES: Record<PrepareFailure, string> = {
  "not-an-image": "That isn't an image file.",
  "too-large": "That image is over 12 MB. Try a smaller one.",
  unreadable: "Couldn't read that image. It may be damaged.",
  "encode-failed": "Couldn't process that image on this device.",
};

function fit(width: number, height: number): { w: number; h: number } {
  const longest = Math.max(width, height);
  if (longest <= MAX_EDGE) return { w: width, h: height };
  const scale = MAX_EDGE / longest;
  return { w: Math.round(width * scale), h: Math.round(height * scale) };
}

/**
 * Decodes without handing the file to the DOM.
 *
 * `createImageBitmap` decodes off the main thread and, critically,
 * applies the EXIF orientation flag itself — otherwise stripping the
 * metadata would leave portrait photos rotated, because the flag saying
 * "rotate this" is exactly what is being removed.
 */
async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(file, { imageOrientation: "from-image" });
  }
  // Older Safari. It applies orientation when painting, so drawing to a
  // canvas gives an upright result the same way.
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function preparePhoto(
  file: File,
): Promise<
  { ok: true; photo: PreparedPhoto } | { ok: false; reason: PrepareFailure }
> {
  if (!file.type.startsWith("image/")) {
    return { ok: false, reason: "not-an-image" };
  }
  if (file.size > MAX_INPUT_BYTES) {
    return { ok: false, reason: "too-large" };
  }

  let source: ImageBitmap | HTMLImageElement;
  try {
    source = await decode(file);
  } catch {
    return { ok: false, reason: "unreadable" };
  }

  const { w, h } = fit(source.width, source.height);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const context = canvas.getContext("2d");
  if (!context) return { ok: false, reason: "encode-failed" };

  // A JPEG has no alpha, so anything transparent would composite against
  // black. Painting white first keeps a transparent PNG looking like the
  // reader expects rather than inverting it.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, w, h);
  context.drawImage(source, 0, 0, w, h);
  if ("close" in source) source.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", QUALITY),
  );
  if (!blob) return { ok: false, reason: "encode-failed" };

  return {
    ok: true,
    photo: {
      blob,
      previewUrl: URL.createObjectURL(blob),
      width: w,
      height: h,
      bytes: blob.size,
    },
  };
}
