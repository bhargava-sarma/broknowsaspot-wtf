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
        setNotice(`that's the limit — ${max} photos.`);
        return;
      }
      const chosen = Array.from(files).slice(0, room);
      if (files.length > room) {
        setNotice(`only the first ${room} were added — ${max} is the limit.`);
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
              error: result.message ?? "upload failed.",
            });
            continue;
          }
          update(key, { status: "ready", id: result.id });
        } catch {
          update(key, { status: "failed", error: "upload failed." });
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
      <p className="label">{label}</p>

      {photos.length > 0 ? (
        <ul className="mt-3 grid grid-cols-2 gap-[var(--gutter)] sm:grid-cols-3">
          {photos.map((photo) => (
            <li key={photo.key} data-photo-preview="" className="relative">
              <div className="relative aspect-[4/3] overflow-hidden bg-paper-raised">
                {/* Unoptimised: this is a local object URL for a blob the
                    browser already holds, so there is nothing for the
                    image pipeline to fetch or cache. */}
                <Image
                  src={photo.previewUrl}
                  alt=""
                  fill
                  unoptimized
                  className={cn(
                    "object-cover transition-opacity duration-300",
                    photo.status === "working" && "opacity-45",
                  )}
                />
                {photo.status === "working" ? (
                  <span className="absolute inset-x-0 bottom-0 block h-px animate-pulse bg-accent" />
                ) : null}
              </div>

              <div className="mt-1.5 flex items-baseline justify-between gap-2">
                <span
                  className={cn(
                    "font-mono text-micro lowercase",
                    photo.status === "failed" ? "text-accent" : "text-faint",
                  )}
                >
                  {photo.status === "working"
                    ? "uploading…"
                    : photo.status === "failed"
                      ? (photo.error ?? "failed")
                      : "attached"}
                </span>
                <button
                  type="button"
                  onClick={() => remove(photo.key)}
                  className="press touch-target font-mono text-micro text-muted lowercase"
                >
                  remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-3">
        <input
          id={inputId}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          multiple={max > 1}
          disabled={full}
          className="sr-only"
          onChange={(event) => {
            if (event.target.files) void handleFiles(event.target.files);
            // Reset so choosing the same file twice still fires.
            event.target.value = "";
          }}
        />
        <label
          htmlFor={inputId}
          className={cn(
            "press-pane glass-chip glass-rim glass-r-sm touch-target inline-flex cursor-pointer items-center gap-2 px-3 py-2 font-mono text-micro text-ink lowercase",
            full && "cursor-not-allowed opacity-50",
          )}
        >
          <span aria-hidden="true" className="text-faint">
            +
          </span>
          {photos.length === 0 ? "add photos" : "add another"}
          <span className="text-faint tabular-nums">
            {photos.length}/{max}
          </span>
        </label>
      </div>

      {notice ? (
        <p
          role="alert"
          className="mt-2 max-w-[46ch] font-mono text-micro text-accent lowercase"
        >
          {notice}
        </p>
      ) : (
        <p className="mt-2 max-w-[52ch] font-mono text-micro text-faint lowercase">
          {hint ??
            "location, timestamp and camera details are stripped in your browser before anything is uploaded."}
        </p>
      )}
    </div>
  );
}
