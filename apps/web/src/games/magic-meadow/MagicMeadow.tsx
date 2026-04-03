'use client';

import React, { useRef, useEffect, useState } from 'react';

export function MagicMeadow({ onEndGame }: { onEndGame: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number>(0);
  const outlineImageRef = useRef<HTMLImageElement | null>(null);
  const finalImageRef = useRef<HTMLImageElement | null>(null);
  const pointerRef = useRef({ x: -1000, y: -1000, active: false });
  const cachedRectRef = useRef<DOMRect | null>(null);
  const [gamePhase, setGamePhase] = useState<'waiting' | 'painting' | 'celebration' | 'resetting'>('waiting');
  const phaseRef = useRef<'waiting' | 'painting' | 'celebration' | 'resetting'>('waiting');
  const celebrationTimerRef = useRef(0);
  const waitingTimerRef = useRef(180);
  const resetProgressRef = useRef(0);
  const revealPercentRef = useRef(0);

  useEffect(() => {
    const outlineImg = new Image();
    outlineImg.onload = () => { outlineImageRef.current = outlineImg; };
    outlineImg.src = '/games/magic_meadow_outline.jpg';
    const finalImg = new Image();
    finalImg.onload = () => { finalImageRef.current = finalImg; };
    finalImg.src = '/games/magic_meadow_final.jpg';
    return () => { outlineImg.onload = null; finalImg.onload = null; };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let width = window.innerWidth, height = window.innerHeight;

    maskCanvasRef.current = document.createElement('canvas');
    const maskCtx = maskCanvasRef.current.getContext('2d', { willReadFrequently: true });
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width; tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      width = window.innerWidth; height = window.innerHeight;
      canvas.width = width * dpr; canvas.height = height * dpr;
      canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (maskCanvasRef.current) {
        maskCanvasRef.current.width = width; maskCanvasRef.current.height = height;
        const mCtx = maskCanvasRef.current.getContext('2d');
        if (mCtx) { mCtx.fillStyle = 'white'; mCtx.fillRect(0, 0, width, height); }
      }
      tempCanvas.width = width; tempCanvas.height = height;
      cachedRectRef.current = canvas.getBoundingClientRect();
    };
    resize();
    window.addEventListener('resize', resize);
    const brushRadius = 85;
    let lastCheckTime = 0;
    let pendingCheck = false;
    const idleCallback = typeof requestIdleCallback === 'function' ? requestIdleCallback : (cb: () => void) => setTimeout(cb, 0);

    const scheduleRevealCheck = () => {
      const now = performance.now();
      if (pendingCheck || now - lastCheckTime < 500) return;
      pendingCheck = true; lastCheckTime = now;
      idleCallback(() => {
        pendingCheck = false;
        if (!maskCanvasRef.current || !maskCtx) return;
        const imageData = maskCtx.getImageData(0, 0, width, height);
        const data = imageData.data;
        let transparent = 0, total = 0;
        for (let i = 0; i < data.length; i += 40) { total++; if (data[i + 3] < 128) transparent++; }
        revealPercentRef.current = transparent / total;
        if (revealPercentRef.current >= 0.80 && phaseRef.current === 'painting') {
          phaseRef.current = 'celebration'; setGamePhase('celebration');
          celebrationTimerRef.current = 300;
        }
      });
    };

    const render = () => {
      const pointer = pointerRef.current;
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, width, height);

      if (phaseRef.current === 'waiting') {
        waitingTimerRef.current--;
        if (waitingTimerRef.current <= 0) { phaseRef.current = 'painting'; setGamePhase('painting'); }
      } else if (phaseRef.current === 'painting') {
        if (maskCtx && pointer.active && pointer.x >= 0 && pointer.y >= 0) {
          const gradient = maskCtx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, brushRadius);
          gradient.addColorStop(0, 'rgba(0,0,0,1)'); gradient.addColorStop(0.7, 'rgba(0,0,0,0.8)'); gradient.addColorStop(1, 'rgba(0,0,0,0)');
          maskCtx.globalCompositeOperation = 'destination-out';
          maskCtx.fillStyle = gradient; maskCtx.beginPath(); maskCtx.arc(pointer.x, pointer.y, brushRadius, 0, Math.PI * 2); maskCtx.fill();
          maskCtx.globalCompositeOperation = 'source-over';
        }
        scheduleRevealCheck();
      } else if (phaseRef.current === 'celebration') {
        celebrationTimerRef.current--;
        if (celebrationTimerRef.current <= 0) { phaseRef.current = 'resetting'; setGamePhase('resetting'); resetProgressRef.current = 0; }
      } else if (phaseRef.current === 'resetting') {
        resetProgressRef.current += 0.02;
        if (resetProgressRef.current >= 1) {
          if (maskCtx) { maskCtx.fillStyle = 'white'; maskCtx.fillRect(0, 0, width, height); }
          revealPercentRef.current = 0; waitingTimerRef.current = 180;
          phaseRef.current = 'waiting'; setGamePhase('waiting'); resetProgressRef.current = 0;
        }
      }

      if (finalImageRef.current) { ctx.drawImage(finalImageRef.current, 0, 0, width, height); }

      if (outlineImageRef.current && maskCanvasRef.current && tempCtx && phaseRef.current !== 'celebration') {
        tempCtx.globalCompositeOperation = 'source-over';
        tempCtx.clearRect(0, 0, width, height);
        tempCtx.drawImage(outlineImageRef.current, 0, 0, width, height);
        tempCtx.globalCompositeOperation = 'destination-in';
        tempCtx.drawImage(maskCanvasRef.current, 0, 0);
        if (phaseRef.current === 'resetting') { ctx.globalAlpha = 1 - resetProgressRef.current; }
        ctx.drawImage(tempCanvas, 0, 0);
        ctx.globalAlpha = 1;
      }

      if (phaseRef.current === 'painting' && pointer.active && pointer.x >= 0 && pointer.y >= 0) {
        const glowGrad = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, brushRadius + 20);
        glowGrad.addColorStop(0, 'rgba(255, 255, 200, 0.3)'); glowGrad.addColorStop(0.5, 'rgba(255, 255, 200, 0.1)'); glowGrad.addColorStop(1, 'rgba(255, 255, 200, 0)');
        ctx.fillStyle = glowGrad; ctx.beginPath(); ctx.arc(pointer.x, pointer.y, brushRadius + 20, 0, Math.PI * 2); ctx.fill();
      }

      if (phaseRef.current === 'celebration') {
        ctx.font = 'bold 36px system-ui, sans-serif'; ctx.fillStyle = '#FFD700';
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
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
    <div style={{ position: 'fixed', inset: 0, background: '#1a1a1a', overflow: 'hidden' }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', touchAction: 'none', cursor: 'none' }} />
    </div>
  );
}
