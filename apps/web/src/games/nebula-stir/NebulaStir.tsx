'use client';

import React, { useRef, useEffect } from 'react';

export function NebulaStir({ onEndGame }: { onEndGame: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const timeRef = useRef(0);
  const pointerRef = useRef({ x: 0.5, y: 0.5, active: false });
  const prevPointerRef = useRef({ x: 0.5, y: 0.5 });
  const velocityFieldRef = useRef<Float32Array | null>(null);
  const densityFieldRef = useRef<Float32Array | null>(null);
  const supernovasRef = useRef<{x: number, y: number, intensity: number, age: number}[]>([]);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const cachedRectRef = useRef<DOMRect | null>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => { imageRef.current = img; };
    img.src = '/games/nebula_bg.jpg';
    return () => { img.onload = null; };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gridSize = 64;
    const cellSize = { x: 0, y: 0 };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.scale(dpr, dpr);
      cellSize.x = window.innerWidth / gridSize;
      cellSize.y = window.innerHeight / gridSize;
      cachedRectRef.current = canvas.getBoundingClientRect();
    };
    resize();
    window.addEventListener('resize', resize);

    const fieldSize = gridSize * gridSize * 2;
    velocityFieldRef.current = new Float32Array(fieldSize);
    densityFieldRef.current = new Float32Array(gridSize * gridSize);
    for (let i = 0; i < gridSize * gridSize; i++) { densityFieldRef.current[i] = 0.3 + Math.random() * 0.4; }
    timeRef.current = 0;
    supernovasRef.current = [];

    const render = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      timeRef.current += 0.016;

      ctx.fillStyle = '#050210';
      ctx.fillRect(0, 0, width, height);

      if (imageRef.current) {
        ctx.globalAlpha = 0.9;
        ctx.drawImage(imageRef.current, 0, 0, width, height);
        ctx.globalAlpha = 1;
      }

      const pointer = pointerRef.current;
      const prevPointer = prevPointerRef.current;
      const velocity = velocityFieldRef.current;
      const density = densityFieldRef.current;

      if (velocity && density && pointer.active) {
        const dx = pointer.x - prevPointer.x;
        const dy = pointer.y - prevPointer.y;
        const speed = Math.sqrt(dx * dx + dy * dy) * 60;
        const gridX = Math.floor((pointer.x / width) * gridSize);
        const gridY = Math.floor((pointer.y / height) * gridSize);
        const radius = 5;

        for (let gy = -radius; gy <= radius; gy++) {
          for (let gx = -radius; gx <= radius; gx++) {
            const px = gridX + gx;
            const py = gridY + gy;
            if (px >= 0 && px < gridSize && py >= 0 && py < gridSize) {
              const dist = Math.sqrt(gx * gx + gy * gy);
              const influence = Math.max(0, 1 - dist / radius);
              const idx = (py * gridSize + px) * 2;
              velocity[idx] += dx * influence * 0.5;
              velocity[idx + 1] += dy * influence * 0.5;
              density[py * gridSize + px] = Math.min(1, density[py * gridSize + px] + influence * 0.1);
            }
          }
        }

        const velocitySquared = speed * speed;
        if (velocitySquared > 400 && Math.random() < 0.15) {
          supernovasRef.current.push({ x: pointer.x, y: pointer.y, intensity: Math.min(2, velocitySquared / 400), age: 0 });
        }
      }

      if (velocity) { for (let i = 0; i < velocity.length; i++) { velocity[i] *= 0.92; } }

      ctx.globalCompositeOperation = 'source-over';
      for (let i = supernovasRef.current.length - 1; i >= 0; i--) {
        const sn = supernovasRef.current[i];
        sn.age += 0.016;
        if (sn.age > 1) { supernovasRef.current.splice(i, 1); continue; }
        let scale, alpha;
        if (sn.age < 0.15) { scale = (sn.age / 0.15) * 150 * sn.intensity; alpha = (sn.age / 0.15) * 0.6; }
        else if (sn.age < 0.25) { scale = 150 * sn.intensity; alpha = 0.6; }
        else { scale = 150 * sn.intensity + (sn.age - 0.25) * 50; alpha = 0.6 * (1 - (sn.age - 0.25) / 0.75); }

        const coreGrad = ctx.createRadialGradient(sn.x, sn.y, 0, sn.x, sn.y, scale);
        coreGrad.addColorStop(0, `rgba(255,160,50,${alpha})`);
        coreGrad.addColorStop(0.2, `rgba(230,120,30,${alpha * 0.7})`);
        coreGrad.addColorStop(0.5, `rgba(180,80,10,${alpha * 0.4})`);
        coreGrad.addColorStop(0.8, `rgba(120,50,0,${alpha * 0.15})`);
        coreGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(sn.x, sn.y, scale, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalCompositeOperation = 'source-over';
      prevPointerRef.current = { x: pointer.x, y: pointer.y };
      animationRef.current = requestAnimationFrame(render);
    };
    animationRef.current = requestAnimationFrame(render);
    return () => { window.removeEventListener('resize', resize); if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, []);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onPointerMove = (e: PointerEvent) => {
      const rect = cachedRectRef.current;
      if (!rect) return;
      pointerRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top, active: true };
    };
    const onTouchMove = (e: TouchEvent) => {
      const rect = cachedRectRef.current;
      if (!rect || e.touches.length === 0) return;
      const t = e.touches[0];
      pointerRef.current = { x: t.clientX - rect.left, y: t.clientY - rect.top, active: true };
    };
    const onLeave = () => { pointerRef.current.active = false; };
    el.addEventListener('pointermove', onPointerMove, { passive: true });
    el.addEventListener('pointerenter', onPointerMove, { passive: true });
    el.addEventListener('pointerleave', onLeave, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchstart', onTouchMove, { passive: true });
    el.addEventListener('touchend', onLeave, { passive: true });
    return () => {
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerenter', onPointerMove);
      el.removeEventListener('pointerleave', onLeave);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchstart', onTouchMove);
      el.removeEventListener('touchend', onLeave);
    };
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#050210', overflow: 'hidden' }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', touchAction: 'none' }} />
    </div>
  );
}
