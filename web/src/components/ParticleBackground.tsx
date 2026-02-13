"use client";

import { useEffect, useRef } from "react";

const DOT_SPACING = 28;
const DOT_COLOR = { r: 0, g: 220, b: 255 }; // dim cyan (Starfield blue)
const BASE_OPACITY = 0.12;
const WAVE_AMPLITUDE = 3;
const WAVE_SPEED = 0.0008;

export function ParticleBackground({ compressing }: { compressing: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio ?? 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener("resize", resize);

    const animate = (time: number) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      const speed = compressing ? 1.6 : 1;
      const amplitude = compressing ? WAVE_AMPLITUDE * 1.5 : WAVE_AMPLITUDE;
      const opacityMult = compressing ? 1.3 : 1;

      const cols = Math.ceil(w / DOT_SPACING) + 2;
      const rows = Math.ceil(h / DOT_SPACING) + 2;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const baseX = col * DOT_SPACING;
          const baseY = row * DOT_SPACING;
          const waveY =
            amplitude *
            Math.sin(time * WAVE_SPEED * speed + col * 0.15 + row * 0.1);
          const waveX =
            amplitude * 0.5 * Math.cos(time * WAVE_SPEED * speed * 0.7 + row * 0.12);
          const x = baseX + waveX;
          const y = baseY + waveY;

          const distFromCenter =
            Math.hypot(x - w / 2, y - h / 2) / Math.hypot(w / 2, h / 2);
          const opacity =
            BASE_OPACITY *
            opacityMult *
            (1 - distFromCenter * 0.15) *
            (0.7 + 0.3 * Math.sin(time * 0.002 + col + row));

          ctx.beginPath();
          ctx.arc(x, y, 1, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${DOT_COLOR.r}, ${DOT_COLOR.g}, ${DOT_COLOR.b}, ${Math.max(0, Math.min(1, opacity))})`;
          ctx.fill();
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [compressing]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      aria-hidden
    />
  );
}
