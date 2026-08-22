"use client";

import { LocationDotMap } from "@/components/hero/location-dot-map/location-dot-map";
import { cn } from "@/lib/utils/cn";

export function HeroVisual({ className }: { className?: string }) {
  return (
    <div className={cn(className)}>
      <LocationDotMap />
    </div>
  );
}
