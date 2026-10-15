"use client";

import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rot: number;
  vr: number;
  color: string;
  life: number;
};

/**
 * A confetti burst on a full-screen canvas.
 *
 * `fire` is a counter: every time it increases, one burst goes off with the
 * given colours. Particles are drawn from the centre-top of the reveal and fall
 * out of the way, then the loop stops itself so nothing keeps burning frames.
 */
export default function Confetti({
  fire,
  colors,
  count = 120,
  spread = 1,
}: {
  fire: number;
  colors: string[];
  count?: number;
  spread?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particles = useRef<Particle[]>([]);
  const frame = useRef<number>();

  useEffect(() => {
    if (!fire) return;
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const w = window.innerWidth;
    const h = window.innerHeight;
    const originX = w / 2;
    const originY = h * 0.42;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (2.6 + Math.random() * 7) * spread;
      particles.current.push({
        x: originX + (Math.random() - 0.5) * 40,
        y: originY + (Math.random() - 0.5) * 40,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2.4,
        size: 4 + Math.random() * 7,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.34,
        color: colors[Math.floor(Math.random() * colors.length)] ?? "#fff",
        life: 1,
      });
    }

    let raf = 0;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const list = particles.current;
      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i];
        p.vy += 0.16;
        p.vx *= 0.992;
        p.vy *= 0.994;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.life -= 0.0075;

        if (p.life <= 0 || p.y > h + 60) {
          list.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      }
      if (list.length) {
        raf = requestAnimationFrame(draw);
      } else {
        ctx.clearRect(0, 0, w, h);
      }
      frame.current = raf;
    };
    raf = requestAnimationFrame(draw);

    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
      particles.current = [];
    };
  }, [fire, colors, count, spread]);

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none fixed inset-0 z-[75]" />;
}
