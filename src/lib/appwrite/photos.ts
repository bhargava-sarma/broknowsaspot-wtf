import "server-only";

import { ID, Permission, Role, Storage } from "node-appwrite";
// Exported from its own subpath in node-appwrite 28, not from the root.
import { InputFile } from "node-appwrite/file";

import { PHOTO_BUCKET_ID, PHOTO_MAX_BYTES } from "@/lib/appwrite/schema";
import { keyedClient } from "@/lib/appwrite/server";

/**
 * Photo storage.
 *
 * Uploads run on the API key, from a route handler, for the same reason
 * every other write does: no bucket grants create to anyone, so a browser
 * cannot put a file in this project at all. That keeps Turnstile, the
 * rate limiter and the type check on the only path in.
 *
 * The client has already re-encoded the image through a canvas, which
 * strips EXIF — see `lib/photos/prepare.ts`. The server re-checks the
 * type and size anyway, because "the client did it" is not a control: a
 * request can be made without ever loading the page.
 */

const projectId =
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ??
  process.env.APPWRITE_PROJECT_ID;
const endpoint = process.env.APPWRITE_ENDPOINT;

export type StoredPhoto = { id: string; url: string };

/** A JPEG starts FF D8 FF. Checked because a MIME string is a claim. */
function looksLikeJpeg(bytes: Uint8Array): boolean {
  return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

/**
 * The public URL for a stored file.
 *
 * Built here rather than stored on the row: an endpoint or project can
 * move, and a database full of absolute URLs would then be a migration.
 * The id is the durable part, so the id is what gets written down.
 */
export function photoUrl(fileId: string): string {
  return `${endpoint}/storage/buckets/${PHOTO_BUCKET_ID}/files/${fileId}/view?project=${projectId}`;
}

export type UploadFailure =
  "unconfigured" | "too-large" | "not-a-jpeg" | "no-bucket" | "no-permission";

export async function storePhoto(
  bytes: Uint8Array,
  filename: string,
): Promise<
  { ok: true; photo: StoredPhoto } | { ok: false; reason: UploadFailure }
> {
  const client = keyedClient();
  if (!client || !endpoint || !projectId) {
    return { ok: false, reason: "unconfigured" };
  }
  if (bytes.byteLength > PHOTO_MAX_BYTES) {
    return { ok: false, reason: "too-large" };
  }
  if (!looksLikeJpeg(bytes)) {
    return { ok: false, reason: "not-a-jpeg" };
  }

  const storage = new Storage(client);
  let created: { $id: string };
  try {
    created = (await storage.createFile({
      bucketId: PHOTO_BUCKET_ID,
      fileId: ID.unique(),
      file: InputFile.fromBuffer(Buffer.from(bytes), filename),
      // The bucket already grants public read and `fileSecurity` is off,
      // so this is belt-and-braces rather than the enforcement.
      permissions: [Permission.read(Role.any())],
    })) as { $id: string };
  } catch (error) {
    // The two ways this fails in a fresh deployment look identical from
    // the browser and have completely different fixes, so they are named
    // here rather than collapsed into "try again".
    const type = (error as { type?: string }).type ?? "";
    const code = (error as { code?: number }).code ?? 0;

    if (type === "storage_bucket_not_found" || code === 404) {
      console.error(
        `[photos] bucket "${PHOTO_BUCKET_ID}" does not exist. ` +
          "Run `npm run appwrite:provision` against this project.",
      );
      return { ok: false, reason: "no-bucket" };
    }
    if (code === 401 || /scope|unauthorized/i.test(type)) {
      console.error(
        "[photos] the API key cannot write files. Add the storage scopes " +
          "(buckets.read, buckets.write, files.read, files.write) to the " +
          "key in the Appwrite console — see the README.",
        { type, code },
      );
      return { ok: false, reason: "no-permission" };
    }
    throw error;
  }

  return { ok: true, photo: { id: created.$id, url: photoUrl(created.$id) } };
}

/** Removes a stored file. Used when moderation takes a photo down. */
export async function deletePhoto(fileId: string): Promise<boolean> {
  const client = keyedClient();
  if (!client) return false;
  try {
    await new Storage(client).deleteFile({
      bucketId: PHOTO_BUCKET_ID,
      fileId,
    });
    return true;
  } catch (error) {
    console.error(`[photos] could not delete ${fileId}`, error);
    return false;
  }
}
