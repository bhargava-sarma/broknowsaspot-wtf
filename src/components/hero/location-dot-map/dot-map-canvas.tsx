"use client";

import { useEffect, useRef } from "react";

import { MAP_GEOMETRY, type CityDot } from "./procedural-city";

function toRgba(color: string, alpha: number): string {
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha)).toFixed(3)})`;
}

function easeOutQuint(value: number) {
  const t = Math.max(0, Math.min(1, value));
  return 1 - Math.pow(1 - t, 5);
}

function drawMarker(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  progress: number,
) {
  const cx = width * MAP_GEOMETRY.centerX;
  const cy = height * MAP_GEOMETRY.centerY;
  const scale = Math.min(width, height);
  const markerProgress = easeOutQuint((progress - 0.08) / 0.55);
  const color = MAP_GEOMETRY.color;

  const outerRadius = scale * (0.058 + (1 - markerProgress) * 0.015);
  const outer = ctx.createRadialGradient(cx, cy, 0, cx, cy, outerRadius);
  outer.addColorStop(0, toRgba(color, 0.12 * markerProgress));
  outer.addColorStop(0.54, toRgba(color, 0.065 * markerProgress));
  outer.addColorStop(1, toRgba(color, 0));
  ctx.fillStyle = outer;
  ctx.beginPath();
  ctx.arc(cx, cy, outerRadius, 0, Math.PI * 2);
  ctx.fill();

  const innerRadius = scale * 0.035;
  const inner = ctx.createRadialGradient(cx, cy, 0, cx, cy, innerRadius);
  inner.addColorStop(0, toRgba(color, 0.26 * markerProgress));
  inner.addColorStop(0.7, toRgba(color, 0.14 * markerProgress));
  inner.addColorStop(1, toRgba(color, 0));
  ctx.fillStyle = inner;
  ctx.beginPath();
  ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = color;
  ctx.globalAlpha = markerProgress;
  ctx.beginPath();
  ctx.arc(cx, cy, Math.max(5.2, scale * 0.011), 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawDots(
  ctx: CanvasRenderingContext2D,
  dots: CityDot[],
  width: number,
  height: number,
  progress: number,
) {
  const color = MAP_GEOMETRY.color;
  const cx = MAP_GEOMETRY.centerX;
  const cy = MAP_GEOMETRY.centerY;

  ctx.fillStyle = color;
  for (const dot of dots) {
    const localProgress = easeOutQuint((progress - dot.delay) / 0.31);
    if (localProgress <= 0) continue;

    // Begin slightly compressed around the marker, then settle at immutable
    // coordinates. The finished map is identical on every reload.
    const settle = 0.83 + localProgress * 0.17;
    const x = (cx + (dot.x - cx) * settle) * width;
    const y = (cy + (dot.y - cy) * settle) * height;
    const alpha = dot.alpha * localProgress;
    if (alpha < 0.012) continue;

    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(
      x,
      y,
      Math.max(0.45, dot.radius * (0.72 + localProgress * 0.28)),
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

type Props = {
  dots: CityDot[];
  reducedMotion: boolean;
};

export function DotMapCanvas({ dots, reducedMotion }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !parent || !ctx) return;

    let animationFrame = 0;
    let startedAt: number | undefined;
    let settled = false;

    const render = (progress: number) => {
      const rect = parent.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));
      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      drawDots(ctx, dots, width, height, progress);
      drawMarker(ctx, width, height, progress);
    };

    const frame = (now: number) => {
      startedAt ??= now;
      const progress = reducedMotion
        ? 1
        : Math.min(1, (now - startedAt) / MAP_GEOMETRY.revealMs);
      render(progress);
      if (progress < 1) animationFrame = requestAnimationFrame(frame);
      else settled = true;
    };

    const observer = new ResizeObserver(() => {
      // Resize draws the finished deterministic map; it does not start a
      // permanent animation loop or disturb the final point coordinates.
      if (settled) render(1);
    });
    observer.observe(parent);
    animationFrame = requestAnimationFrame(frame);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(animationFrame);
    };
  }, [dots, reducedMotion]);

  return (
    <canvas ref={canvasRef} aria-hidden="true" className="h-full w-full" />
  );
}
