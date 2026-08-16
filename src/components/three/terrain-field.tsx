"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  Color,
  DoubleSide,
  type Group,
  type InstancedMesh,
  MeshBasicMaterial,
  Object3D,
  PlaneGeometry,
} from "three";

/**
 * A topographic point field — the same survey-contour motif as the SVG
 * fallback, given depth.
 *
 * Performance shape, deliberately:
 * - ONE InstancedMesh, one geometry, one material => 1 draw call.
 * - ~1.3k instances x 2 triangles => ~2.7k triangles total.
 * - Instance matrices are computed once on mount and never rewritten. The
 *   only per-frame work is incrementing one group rotation, so the render
 *   loop allocates nothing and touches no buffers.
 * - MeshBasicMaterial: the field is unlit by design, so there is no light
 *   in the scene and nothing to shade.
 */

const RINGS = 26;
const RING_SPACING = 0.155;
const RING_INNER = 0.28;
/**
 * Points per unit of radius. Tuned so adjacent dots sit ~2.5 dot-widths
 * apart: dense enough that each ring reads as a dotted contour line rather
 * than scattered noise, sparse enough to stay a texture. Yields ~3.7k
 * instances — still one draw call and ~7.5k triangles.
 */
const POINT_DENSITY = 65;
const DOT_SIZE = 0.036;

type Point = { x: number; z: number; height: number };

/** Deterministic ridge function — no noise library, no randomness. */
function ridge(radius: number, theta: number): number {
  return (
    Math.sin(radius * 1.9 - 0.6) * 0.34 +
    Math.cos(theta * 3 + radius * 0.8) * 0.12
  );
}

function buildPoints(): Point[] {
  const points: Point[] = [];
  for (let ring = 0; ring < RINGS; ring += 1) {
    const radius = RING_INNER + ring * RING_SPACING;
    // Scale with circumference so dot spacing stays even across the field.
    const count = Math.max(8, Math.round(radius * POINT_DENSITY));
    for (let i = 0; i < count; i += 1) {
      // Offset each ring so the points don't line up into spokes.
      const theta = (i / count) * Math.PI * 2 + ring * 0.14;
      points.push({
        x: Math.cos(theta) * radius,
        z: Math.sin(theta) * radius,
        height: ridge(radius, theta),
      });
    }
  }
  return points;
}

export function TerrainField({ color }: { color: string }) {
  const groupRef = useRef<Group>(null);
  const meshRef = useRef<InstancedMesh>(null);

  const points = useMemo(() => buildPoints(), []);

  // Shared across every instance — created once, disposed on unmount.
  const geometry = useMemo(() => new PlaneGeometry(1, 1), []);
  const material = useMemo(
    () =>
      new MeshBasicMaterial({
        color: new Color(color),
        side: DoubleSide,
        transparent: true,
        // Knocked back so the field stays ambient behind the headline
        // instead of competing with it.
        opacity: 0.5,
      }),
    // Colour is updated in its own effect; rebuilding the material on every
    // theme flip would throw away the GPU program for no reason.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    material.color.set(color);
  }, [color, material]);

  // three.js does not free GPU memory on garbage collection, so both of
  // these have to be released explicitly.
  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  // Write every instance matrix exactly once.
  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const heights = points.map((p) => p.height);
    const min = Math.min(...heights);
    const max = Math.max(...heights);
    const span = max - min || 1;

    const dummy = new Object3D();
    dummy.rotation.x = -Math.PI / 2; // lay each quad flat, facing up

    points.forEach((point, i) => {
      const normalised = (point.height - min) / span;
      dummy.position.set(point.x, point.height, point.z);
      // Ridges read as larger dots, valleys as smaller — height without
      // needing a second colour buffer.
      dummy.scale.setScalar(DOT_SIZE * (0.65 + normalised * 1.15));
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [points]);

  useFrame((_state, delta) => {
    const group = groupRef.current;
    if (!group) return;
    // Delta-based so the speed is identical at 60 and 120Hz. Capped so a
    // long frame (tab restore, GC pause) can't jump the rotation.
    group.rotation.y += Math.min(delta, 0.1) * 0.055;
  });

  return (
    // Outer group holds the fixed tilt so the field reads as terrain seen
    // from above; the inner group owns the spin, keeping the animation on
    // its own local Y axis instead of the tilted one.
    <group rotation={[-Math.PI / 3.2, 0, 0]}>
      <group ref={groupRef}>
        <instancedMesh
          ref={meshRef}
          args={[geometry, material, points.length]}
          frustumCulled={false}
        />
      </group>
    </group>
  );
}
