"use client";

import * as React from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Line, Sparkles } from "@react-three/drei";
import * as THREE from "three";

/**
 * Homepage hero: a learning "constellation" — nodes on a globe-like sphere
 * connected by arcs, slowly rotating. Lazy-loaded; renders nothing when the
 * user prefers reduced motion or on very small screens.
 */
function Constellation({ dark }: { dark: boolean }) {
  const group = React.useRef<THREE.Group>(null);
  const points = React.useMemo(() => {
    const out: THREE.Vector3[] = [];
    const n = 42;
    for (let i = 0; i < n; i++) {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / n);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      out.push(new THREE.Vector3(Math.cos(theta) * Math.sin(phi), Math.cos(phi), Math.sin(theta) * Math.sin(phi)).multiplyScalar(2.1));
    }
    return out;
  }, []);
  const links = React.useMemo(() => {
    const out: Array<[THREE.Vector3, THREE.Vector3]> = [];
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        if (points[i]!.distanceTo(points[j]!) < 1.25) out.push([points[i]!, points[j]!]);
      }
    }
    return out.slice(0, 90);
  }, [points]);

  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.08;
  });

  const accent = dark ? "#6b91ff" : "#2563ff";
  const cyan = dark ? "#22d3ee" : "#06b6d4";
  const violet = dark ? "#a78bfa" : "#7c3aed";

  return (
    <group ref={group} rotation={[0.35, 0, 0.1]}>
      <mesh>
        <sphereGeometry args={[2.05, 48, 48]} />
        <meshBasicMaterial color={dark ? "#0c0e13" : "#ffffff"} transparent opacity={dark ? 0.55 : 0.75} />
      </mesh>
      <mesh>
        <sphereGeometry args={[2.08, 24, 24]} />
        <meshBasicMaterial color={accent} wireframe transparent opacity={dark ? 0.12 : 0.1} />
      </mesh>
      {links.map(([a, b], i) => (
        <Line key={i} points={[a, b]} color={i % 3 === 0 ? cyan : i % 3 === 1 ? violet : accent} lineWidth={1} transparent opacity={0.55} />
      ))}
      {points.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[i % 7 === 0 ? 0.07 : 0.035, 12, 12]} />
          <meshBasicMaterial color={i % 7 === 0 ? cyan : i % 5 === 0 ? violet : accent} />
        </mesh>
      ))}
      <Sparkles count={60} scale={6} size={2} speed={0.3} color={cyan} opacity={0.6} />
    </group>
  );
}

export default function HeroScene({ dark = false }: { dark?: boolean }) {
  return (
    <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 6.2], fov: 42 }} gl={{ antialias: true, alpha: true, powerPreference: "low-power" }} style={{ background: "transparent" }} aria-hidden>
      <ambientLight intensity={0.8} />
      <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.6}>
        <Constellation dark={dark} />
      </Float>
    </Canvas>
  );
}
