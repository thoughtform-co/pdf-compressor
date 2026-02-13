"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

const GOLD = 0xCAA554;
const PARTICLE_COUNT = 4500;
const BASE_OPACITY = 0.04;
const ACTIVE_OPACITY = 0.10;
const FADE_DURATION_MS = 1200;
const IDLE_ROTATION = 0.006;
const ACTIVE_ROTATION = 0.018;
const BREATHE_SPEED = 0.6;
const BREATHE_AMPLITUDE = 0.04;
const SCALE_IDLE = 1.0;
const SCALE_CONTRACTED = 0.72;

interface Point3 {
  x: number;
  y: number;
  z: number;
}

/* ─── SHAPE GENERATORS ─── */

/** Spiral torus -- twisted donut with flowing arms */
function generateSpiralTorus(count: number): Point3[] {
  const points: Point3[] = [];
  const R = 0.7; // major radius
  const r = 0.28; // minor radius
  for (let i = 0; i < count; i++) {
    const u = (i / count) * Math.PI * 5; // extra wraps for density
    const v = ((i % 30) / 30) * Math.PI * 2;
    const twist = u * 0.6;
    points.push({
      x: (R + r * Math.cos(v + twist)) * Math.cos(u),
      y: (R + r * Math.cos(v + twist)) * Math.sin(u),
      z: r * Math.sin(v + twist),
    });
  }
  return points;
}

/** Vortex ribbons -- spiraling inward like a compression funnel */
function generateVortexRibbons(count: number): Point3[] {
  const points: Point3[] = [];
  const ribbons = 6;
  const perRibbon = Math.floor(count / ribbons);
  for (let s = 0; s < ribbons; s++) {
    const angleOffset = (s / ribbons) * Math.PI * 2;
    for (let i = 0; i < perRibbon; i++) {
      const t = i / perRibbon;
      const radius = 1.0 - t * 0.7; // spiral inward
      const angle = angleOffset + t * Math.PI * 6;
      const height = (t - 0.5) * 1.2;
      points.push({
        x: radius * Math.cos(angle),
        y: height,
        z: radius * Math.sin(angle),
      });
    }
  }
  return points;
}

/** Field lines -- radial curves connecting outer shell to inner core */
function generateFieldLines(count: number): Point3[] {
  const points: Point3[] = [];
  const lines = 20;
  const perLine = Math.floor(count / lines);
  for (let l = 0; l < lines; l++) {
    const theta = (l / lines) * Math.PI * 2;
    const phi = Math.acos(1 - 2 * ((l * 7 + 3) % lines) / lines); // distributed on sphere
    for (let i = 0; i < perLine; i++) {
      const t = i / perLine;
      const r = 0.2 + (1.0 - 0.2) * (1 - t);
      const wave = Math.sin(t * Math.PI * 4) * 0.08;
      points.push({
        x: r * Math.sin(phi + wave) * Math.cos(theta),
        y: r * Math.cos(phi + wave),
        z: r * Math.sin(phi + wave) * Math.sin(theta),
      });
    }
  }
  return points;
}

/** Combine all shapes into a single cloud and normalize to [-1, 1] */
function generateParticleCloud(totalCount: number): Point3[] {
  const third = Math.floor(totalCount / 3);
  const raw = [
    ...generateSpiralTorus(third),
    ...generateVortexRibbons(third),
    ...generateFieldLines(totalCount - third * 2),
  ];
  return normalizePoints(raw);
}

function normalizePoints(points: Point3[]): Point3[] {
  if (points.length === 0) return points;
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
    minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z);
  }
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, cz = (minZ + maxZ) / 2;
  const range = Math.max(maxX - minX, maxY - minY, maxZ - minZ) || 1;
  const scale = 2 / range;
  return points.map((p) => ({
    x: (p.x - cx) * scale,
    y: (p.y - cy) * scale,
    z: (p.z - cz) * scale,
  }));
}

/* ─── COMPONENT ─── */

export function CompressionParticleField({ compressing }: { compressing: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const compressingRef = useRef(compressing);
  compressingRef.current = compressing;
  const visibleRef = useRef(false);
  const fadeStartRef = useRef<number>(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.z = 4;
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const points = generateParticleCloud(PARTICLE_COUNT);
    const positions = new Float32Array(points.length * 3);
    points.forEach((p, i) => {
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: GOLD,
      size: 0.035,
      transparent: true,
      opacity: BASE_OPACITY,
      sizeAttenuation: true,
      depthWrite: false,
    });
    const mesh = new THREE.Points(geometry, material);
    scene.add(mesh);

    const handleResize = () => {
      if (!containerRef.current) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    let animationId: number;
    let rotationY = 0, rotationX = 0;
    let scaleT = SCALE_IDLE;
    let opacityT = BASE_OPACITY;
    let visibleT = 0;

    const animate = (time: number) => {
      animationId = requestAnimationFrame(animate);
      const isCompressing = compressingRef.current;

      // Fade transition
      const targetVisible = isCompressing ? 1 : 0;
      if (visibleRef.current !== isCompressing) {
        fadeStartRef.current = time;
        visibleRef.current = isCompressing;
      }
      const fadeElapsed = time - fadeStartRef.current;
      const fadeProgress = Math.min(fadeElapsed / FADE_DURATION_MS, 1);
      visibleT += (targetVisible - visibleT) * 0.04;
      const fadeMultiplier = targetVisible === 1 ? fadeProgress : 1 - fadeProgress;
      const displayVisibility = Math.max(0, visibleT * fadeMultiplier);

      // Scale with breathing
      const targetScale = isCompressing ? SCALE_CONTRACTED : SCALE_IDLE;
      scaleT += (targetScale - scaleT) * 0.04;
      const breathe = 1 + Math.sin(time * 0.001 * BREATHE_SPEED) * BREATHE_AMPLITUDE;
      const finalScale = displayVisibility > 0.001 ? scaleT * breathe * displayVisibility : 0;
      mesh.scale.setScalar(finalScale);

      // Rotation
      const rotationSpeed = isCompressing ? ACTIVE_ROTATION : IDLE_ROTATION;
      rotationY += rotationSpeed * 0.01;
      rotationX += rotationSpeed * 0.003;
      mesh.rotation.y = rotationY;
      mesh.rotation.x = rotationX;

      // Opacity
      const targetOpacity = isCompressing ? ACTIVE_OPACITY : BASE_OPACITY;
      opacityT += (targetOpacity - opacityT) * 0.04;
      material.opacity = Math.max(0, opacityT * displayVisibility);

      renderer.render(scene, camera);
    };
    animationId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationId);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[1] pointer-events-none"
      aria-hidden
    />
  );
}
