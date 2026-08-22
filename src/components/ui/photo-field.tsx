"use client";

import Image from "next/image";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import {
  ACCEPTED_TYPES,
  preparePhoto,
  PREPARE_MESSAGES,
  type PrepareFailure,
} from "@/lib/photos/prepare";
import { cn } from "@/lib/utils/cn";

/**
 * Attaching photos, with the stripping done before anything is sent.
 *
 * The order of operations is the privacy story, and it is worth stating
 * plainly because it is invisible from the outside: a chosen file is
 * decoded and re-encoded through a canvas *in this component*, and only
 * the re-encoded bytes are uploaded. The original — with its GPS, its
 * timestamp and its camera serial — is read and discarded without ever
 * touching the network.
 *
 * Uploading happens as each photo is added rather than at submit, so the
 * reader watches them land instead of discovering at the end that a
 * four-megabyte upload failed. What the parent form eventually submits is
 * a list of ids.
 */

export type AttachedPhoto = {
  /** Local id, for list keys and removal before upload finishes. */
  key: string;
  status: "working" | "ready" | "failed";
  previewUrl: string;
  /** Storage id, once the upload has returned. */
  id?: string;
  error?: string;
};

type PhotoFieldProps = {
  label: string;
  hint?: string;
  max: number;
  photos: AttachedPhoto[];
  onChange: (next: AttachedPhoto[]) => void;
  /** Passed through to the upload route, which enforces it server-side. */
  turnstileToken?: string;
  className?: string;
};

let counter = 0;
const nextKey = () => `photo-${(counter += 1)}`;

export function PhotoField({
  label,
  hint,
  max,
  photos,
  onChange,
  turnstileToken,
  className,
}: PhotoFieldProps) {
  const inputId = useId();
  const [notice, setNotice] = useState<string | null>(null);
  // Object URLs are a manual resource; letting them accumulate is a leak
  // that only shows up after a long session with many attempts.
  const urls = useRef<string[]>([]);

  useEffect(() => {
    const held = urls.current;
    return () => held.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const latest = useRef(photos);
  useEffect(() => {
    latest.current = photos;
  });

  const update = useCallback(
    (key: string, patch: Partial<AttachedPhoto>) => {
      onChange(
        latest.current.map((photo) =>
          photo.key === key ? { ...photo, ...patch } : photo,
        ),
      );
    },
    [onChange],
  );

  const handleFiles = useCallback(
    async (files: FileList) => {
      setNotice(null);
      const room = max - latest.current.length;
      if (room <= 0) {
        setNotice(`That's the limit — ${max} photos.`);
        return;
      }
      const chosen = Array.from(files).slice(0, room);
      if (files.length > room) {
        setNotice(`Only the first ${room} were added — ${max} is the limit.`);
      }

      for (const file of chosen) {
        // Strips metadata. Nothing has been sent at this point.
        const prepared = await preparePhoto(file);
        if (!prepared.ok) {
          setNotice(PREPARE_MESSAGES[prepared.reason as PrepareFailure]);
          continue;
        }

        const key = nextKey();
        urls.current.push(prepared.photo.previewUrl);
        onChange([
          ...latest.current,
          { key, status: "working", previewUrl: prepared.photo.previewUrl },
        ]);

        try {
          const body = new FormData();
          body.append("photo", prepared.photo.blob, "photo.jpg");
          if (turnstileToken) body.append("turnstileToken", turnstileToken);

          const response = await fetch("/api/photos", {
            method: "POST",
            body,
          });
          const result = (await response.json()) as {
            ok: boolean;
            id?: string;
            message?: string;
          };

          if (!response.ok || !result.ok || !result.id) {
            update(key, {
              status: "failed",
              error: result.message ?? "Upload failed.",
            });
            continue;
          }
          update(key, { status: "ready", id: result.id });
        } catch {
          update(key, { status: "failed", error: "Upload failed." });
        }
      }
    },
    [max, onChange, turnstileToken, update],
  );

  const remove = useCallback(
    (key: string) => {
      onChange(latest.current.filter((photo) => photo.key !== key));
    },
    [onChange],
  );

  const full = photos.length >= max;

  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="eyebrow">{label}</p>
        <p className="text-tiny text-faint tabular-nums">
          {photos.length} / {max}
        </p>
      </div>

      <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {photos.map((photo) => (
          <li key={photo.key} data-photo-preview="" className="relative">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-md)] border border-[var(--glass-rim)] bg-paper-raised">
              {/* Unoptimised: this is a local object URL for a blob the
                  browser already holds, so there is nothing for the image
                  pipeline to fetch or cache. */}
              <Image
                src={photo.previewUrl}
                alt=""
                fill
                unoptimized
                className={cn(
                  "object-cover transition-opacity duration-500",
                  photo.status === "working" && "opacity-40",
                )}
              />

              {photo.status === "working" ? (
                <span className="absolute inset-x-0 bottom-0 block h-0.5 animate-pulse bg-accent" />
              ) : null}

              {/* The one badge worth the space: it says the stripping
                  already happened, on this device, before the upload. */}
              {photo.status === "ready" ? (
                <span className="glass-1 absolute bottom-2 left-2 inline-flex items-center gap-1.5 rounded-[var(--radius-xs)] px-2 py-1 text-[0.625rem] font-semibold text-ink">
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={3.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M4 12.5l5.5 5.5L20 7" />
                  </svg>
                  EXIF stripped
                </span>
              ) : null}

              <button
                type="button"
                onClick={() => remove(photo.key)}
                aria-label="Remove photo"
                className="press glass-1 absolute top-2 right-2 inline-flex size-7 items-center justify-center rounded-[var(--radius-xs)] text-ink"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.4}
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            {photo.status === "failed" ? (
              <p className="mt-2 text-tiny text-accent">
                {photo.error ?? "Failed"}
              </p>
            ) : null}
          </li>
        ))}

        {/* The empty slot is part of the grid, not a button under it —
            so adding a photo fills a hole rather than moving the control. */}
        {!full ? (
          <li>
            <input
              id={inputId}
              type="file"
              accept={ACCEPTED_TYPES.join(",")}
              multiple={max > 1}
              className="sr-only"
              onChange={(event) => {
                if (event.target.files) void handleFiles(event.target.files);
                // Reset so choosing the same file twice still fires.
                event.target.value = "";
              }}
            />
            <label
              htmlFor={inputId}
              className="press-pane flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--radius-md)] border border-dashed border-[var(--well-rim)] bg-[var(--well-fill)] text-faint transition-colors duration-300 hover:border-[var(--glass-rim)] hover:text-ink"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.6}
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span className="text-tiny font-medium">
                {photos.length === 0 ? "Add a photo" : "Add another"}
              </span>
            </label>
          </li>
        ) : null}
      </ul>

      {notice ? (
        <p role="alert" className="mt-3 max-w-[52ch] text-tiny text-accent">
          {notice}
        </p>
      ) : (
        <p className="mt-3 flex max-w-[62ch] items-start gap-2 text-tiny text-faint">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="mt-[3px] shrink-0"
          >
            <path d="M12 22s8-4 8-10V5.5L12 2 4 5.5V12c0 6 8 10 8 10z" />
          </svg>
          {hint ??
            "Each photo is re-encoded in your browser before it is sent, which drops GPS coordinates, the timestamp and the camera it came from. The original file never leaves your device."}
        </p>
      )}
    </div>
  );
}
