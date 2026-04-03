'use client';

import React, { useRef, useEffect, useState } from 'react';

export function HiddenStatue({ onEndGame }: { onEndGame: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const revealMaskRef = useRef<Float32Array | null>(null);
  const statueImageRef = useRef<HTMLImageElement | null>(null);
  const slabImageRef = useRef<HTMLImageElement | null>(null);
  const pointerRef = useRef({ x: -1000, y: -1000, active: false });
  const cachedRectRef = useRef<DOMRect | null>(null);
  const [gamePhase, setGamePhase] = useState<'carving' | 'celebration' | 'fading'>('carving');
  const phaseRef = useRef<'carving' | 'celebration' | 'fading'>('carving');
  const celebrationTimerRef = useRef(0);
  const slabOpacityRef = useRef(1);

  useEffect(() => {
    const statueImg = new Image();
    statueImg.onload = () => { statueImageRef.current = statueImg; };
    statueImg.src = '/games/hidden_statue_final.png';
    const slabImg = new Image();
    slabImg.onload = () => { slabImageRef.current = slabImg; };
    slabImg.src = '/games/marble_slab_tall.png';
    return () => { statueImg.onload = null; slabImg.onload = null; };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let width = window.innerWidth;
    let height = window.innerHeight;
    const gridSize = 60;

    const getStatueZone = () => ({
      xStart: Math.floor(gridSize * 0.30), xEnd: Math.floor(gridSize * 0.70),
      yStart: Math.floor(gridSize * 0.10), yEnd: Math.floor(gridSize * 0.90),
    });

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      width = window.innerWidth; height = window.innerHeight;
      canvas.width = width * dpr; canvas.height = height * dpr;
      canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!revealMaskRef.current || revealMaskRef.current.length !== gridSize * gridSize) {
        revealMaskRef.current = new Float32Array(gridSize * gridSize);
      }
      cachedRectRef.current = canvas.getBoundingClientRect();
    };
    resize();
    window.addEventListener('resize', resize);
    const brushRadius = 8;
    const revealRate = 0.06;

    const render = () => {
      const pointer = pointerRef.current;
      const mask = revealMaskRef.current;
      const zone = getStatueZone();
      ctx.fillStyle = '#1a1510';
      ctx.fillRect(0, 0, width, height);

      if (phaseRef.current === 'carving') {
        if (mask && pointer.active && pointer.x >= 0 && pointer.y >= 0) {
          const gridX = Math.floor((pointer.x / width) * gridSize);
          const gridY = Math.floor((pointer.y / height) * gridSize);
          for (let dy = -brushRadius; dy <= brushRadius; dy++) {
            for (let dx = -brushRadius; dx <= brushRadius; dx++) {
              const px = gridX + dx, py = gridY + dy;
              if (px >= 0 && px < gridSize && py >= 0 && py < gridSize) {
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist <= brushRadius) {
                  const falloff = 1 - (dist / brushRadius);
                  const idx = py * gridSize + px;
                  mask[idx] = Math.min(1, mask[idx] + falloff * falloff * revealRate);
                }
              }
            }
          }
        }
        if (mask) {
          let zoneRevealed = 0, zoneTotal = 0;
          for (let gy = zone.yStart; gy < zone.yEnd; gy++) {
            for (let gx = zone.xStart; gx < zone.xEnd; gx++) { zoneTotal++; zoneRevealed += mask[gy * gridSize + gx]; }
          }
          if (zoneRevealed / zoneTotal >= 0.48) {
            phaseRef.current = 'celebration'; setGamePhase('celebration');
            celebrationTimerRef.current = 180; slabOpacityRef.current = 0;
          }
        }
      } else if (phaseRef.current === 'celebration') {
        celebrationTimerRef.current--;
        if (celebrationTimerRef.current <= 0) { phaseRef.current = 'fading'; setGamePhase('fading'); slabOpacityRef.current = 0; }
      } else if (phaseRef.current === 'fading') {
        slabOpacityRef.current += 0.016;
        if (slabOpacityRef.current >= 1) {
          slabOpacityRef.current = 1;
          if (mask) { for (let i = 0; i < mask.length; i++) mask[i] = 0; }
          phaseRef.current = 'carving'; setGamePhase('carving');
        }
      }

      if (statueImageRef.current) { ctx.drawImage(statueImageRef.current, 0, 0, width, height); }

      if (slabImageRef.current && mask) {
        const cellWidth = width / gridSize, cellHeight = height / gridSize;
        for (let gy = 0; gy < gridSize; gy++) {
          for (let gx = 0; gx < gridSize; gx++) {
            const maskValue = mask[gy * gridSize + gx];
            let cellSlabOpacity;
            if (phaseRef.current === 'fading' || phaseRef.current === 'celebration') { cellSlabOpacity = slabOpacityRef.current; }
            else { if (slabOpacityRef.current < 1) slabOpacityRef.current = 1; cellSlabOpacity = 1 - maskValue; }
            if (cellSlabOpacity > 0.01) {
              const destX = gx * cellWidth, destY = gy * cellHeight;
              const srcX = (gx / gridSize) * slabImageRef.current.width;
              const srcY = (gy / gridSize) * slabImageRef.current.height;
              const srcW = slabImageRef.current.width / gridSize;
              const srcH = slabImageRef.current.height / gridSize;
              ctx.globalAlpha = cellSlabOpacity;
              ctx.drawImage(slabImageRef.current, srcX, srcY, srcW, srcH, destX, destY, cellWidth + 0.5, cellHeight + 0.5);
            }
          }
        }
        ctx.globalAlpha = 1;
      }

      const vignetteGrad = ctx.createRadialGradient(width / 2, height / 2, height * 0.3, width / 2, height / 2, height);
      vignetteGrad.addColorStop(0, 'rgba(0,0,0,0)'); vignetteGrad.addColorStop(1, 'rgba(0,0,0,0.3)');
      ctx.fillStyle = vignetteGrad; ctx.fillRect(0, 0, width, height);

      if (phaseRef.current === 'carving' && pointer.active && pointer.x >= 0 && pointer.y >= 0) {
        const glowGrad = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 50);
        glowGrad.addColorStop(0, 'rgba(255, 248, 220, 0.3)');
        glowGrad.addColorStop(0.5, 'rgba(255, 248, 220, 0.1)');
        glowGrad.addColorStop(1, 'rgba(255, 248, 220, 0)');
        ctx.fillStyle = glowGrad; ctx.beginPath(); ctx.arc(pointer.x, pointer.y, 50, 0, Math.PI * 2); ctx.fill();
      }

      if (phaseRef.current === 'celebration') {
        ctx.font = 'bold 36px system-ui, sans-serif';
        ctx.fillStyle = '#FFD700'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 15;
        ctx.fillText('✨ Beautiful! ✨', 30, height / 2); ctx.shadowBlur = 0;
      }
      animationRef.current = requestAnimationFrame(render);
    };
    animationRef.current = requestAnimationFrame(render);
    return () => { window.removeEventListener('resize', resize); if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, []);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onMove = (e: PointerEvent) => { const rect = cachedRectRef.current; if (!rect) return; pointerRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top, active: true }; };
    const onEnter = (e: PointerEvent) => { const rect = cachedRectRef.current; if (!rect) return; pointerRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top, active: true }; };
    const onLeave = () => { pointerRef.current.active = false; };
    const onTouchMove = (e: TouchEvent) => { const rect = cachedRectRef.current; if (!rect) return; const t = e.touches[0]; pointerRef.current = { x: t.clientX - rect.left, y: t.clientY - rect.top, active: true }; };
    el.addEventListener('pointermove', onMove, { passive: true });
    el.addEventListener('pointerenter', onEnter, { passive: true });
    el.addEventListener('pointerleave', onLeave, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchstart', onTouchMove as EventListener, { passive: true });
    el.addEventListener('touchend', onLeave, { passive: true });
    return () => {
      el.removeEventListener('pointermove', onMove); el.removeEventListener('pointerenter', onEnter);
      el.removeEventListener('pointerleave', onLeave); el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchstart', onTouchMove as EventListener); el.removeEventListener('touchend', onLeave);
    };
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#1a1510', overflow: 'hidden' }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', touchAction: 'none', cursor: 'none' }} />
    </div>
  );
}
