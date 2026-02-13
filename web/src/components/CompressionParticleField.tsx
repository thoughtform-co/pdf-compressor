"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

const CYAN = 0x00d4ff;
const PARTICLE_COUNT = 4000;
const BASE_OPACITY = 0.05;
const ACTIVE_OPACITY = 0.12;
const FADE_DURATION_MS = 1000;
const IDLE_ROTATION = 0.008;
const ACTIVE_ROTATION = 0.02;
const BREATHE_SPEED = 0.8;
const BREATHE_AMPLITUDE = 0.05;
const SCALE_IDLE = 1.0;
const SCALE_CONTRACTED = 0.7;

interface Point3 {
  x: number;
  y: number;
  z: number;
}

function generateLorenzPoints(count: number): Point3[] {
  const points: Point3[] = [];
  const dt = 0.005;
  const warmup = 500;
  const sigma = 10,
    rho = 28,
    beta = 8 / 3;
  let x = 0.1 + Math.random() * 0.1;
  let y = 0.1 + Math.random() * 0.1;
  let z = 0.1 + Math.random() * 0.1;

  for (let i = 0; i < count + warmup; i++) {
    const dx = sigma * (y - x);
    const dy = x * (rho - z) - y;
    const dz = x * y - beta * z;
    x += dx * dt;
    y += dy * dt;
    z += dz * dt;
    if (i >= warmup) points.push({ x, y, z });
  }
  return normalizePoints(points);
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

    const points = generateLorenzPoints(PARTICLE_COUNT);
    const positions = new Float32Array(points.length * 3);
    points.forEach((p, i) => {
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: CYAN,
      size: 0.04,
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
    let scaleT = 0;
    let opacityT = 0;
    let visibleT = 0;

    const animate = (time: number) => {
      animationId = requestAnimationFrame(animate);
      const isCompressing = compressingRef.current;

      const targetVisible = isCompressing ? 1 : 0;
      if (visibleRef.current !== isCompressing) {
        fadeStartRef.current = time;
        visibleRef.current = isCompressing;
      }
      const fadeElapsed = time - fadeStartRef.current;
      const fadeProgress = Math.min(fadeElapsed / FADE_DURATION_MS, 1);
      visibleT += (targetVisible - visibleT) * 0.05;
      const fadeMultiplier = targetVisible === 1 ? fadeProgress : 1 - fadeProgress;
      const displayVisibility = visibleT * fadeMultiplier;

      const targetScale = isCompressing ? SCALE_CONTRACTED : SCALE_IDLE;
      scaleT += (targetScale - scaleT) * 0.06;
      const breathe = 1 + Math.sin(time * 0.001 * BREATHE_SPEED) * BREATHE_AMPLITUDE;
      mesh.scale.setScalar(scaleT * breathe * displayVisibility);

      const rotationSpeed = isCompressing ? ACTIVE_ROTATION : IDLE_ROTATION;
      rotationY += rotationSpeed * 0.01;
      rotationX += rotationSpeed * 0.004;
      mesh.rotation.y = rotationY;
      mesh.rotation.x = rotationX;

      const targetOpacity = isCompressing ? ACTIVE_OPACITY : BASE_OPACITY;
      opacityT += (targetOpacity - opacityT) * 0.05;
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
