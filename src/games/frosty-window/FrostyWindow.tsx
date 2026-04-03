'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

interface Snowball {
  x: number;
  y: number;
  size: number;
  rotation: number;
  progress: number;
  speed: number;
  landed: boolean;
  startX: number;
  startY: number;
}

export function FrostyWindow({ onEndGame }: { onEndGame: () => void }) {
  const [frostyPhase, setFrostyPhase] = useState<'preview' | 'assault' | 'wipe'>('preview');
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const snowCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const phaseRef = useRef<'preview' | 'assault' | 'wipe'>('preview');
  const phaseStartRef = useRef<number>(0);
  const snowballsRef = useRef<Snowball[]>([]);
  const spawnQueueRef = useRef<{ x: number; y: number }[]>([]);
  const lastSpawnRef = useRef<number>(0);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const initialSnowPixelsRef = useRef<number>(0);
  const threshold95TimeRef = useRef<number | null>(null);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const snowImageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const bgImg = new Image();
    const snowImg = new Image();
    bgImg.onload = () => { bgImageRef.current = bgImg; };
    snowImg.onload = () => { snowImageRef.current = snowImg; };
    bgImg.src = '/games/switzerland_bg.jpg';
    snowImg.src = '/games/snowball.png';
    return () => { bgImg.onload = null; snowImg.onload = null; };
  }, []);

  useEffect(() => {
    const bgCanvas = bgCanvasRef.current;
    const snowCanvas = snowCanvasRef.current;
    if (!bgCanvas || !snowCanvas) return;
    const bgCtx = bgCanvas.getContext('2d');
    const snowCtx = snowCanvas.getContext('2d');
    if (!bgCtx || !snowCtx) return;

    const generateTargets = (w: number, h: number) => {
      const targets: { x: number; y: number }[] = [];
      const cols = 6, rows = 5;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          targets.push({
            x: (c + 0.5) * (w / cols) + (Math.random() - 0.5) * (w / cols) * 0.3,
            y: (r + 0.5) * (h / rows) + (Math.random() - 0.5) * (h / rows) * 0.3,
          });
        }
      }
      targets.push({ x: 50, y: 50 }, { x: w - 50, y: 50 }, { x: 50, y: h - 50 }, { x: w - 50, y: h - 50 });
      targets.push({ x: w / 2, y: 30 }, { x: w / 2, y: h - 30 }, { x: 30, y: h / 2 }, { x: w - 30, y: h / 2 });
      for (let i = 0; i < 15; i++) targets.push({ x: Math.random() * w, y: Math.random() * h });
      for (let i = targets.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [targets[i], targets[j]] = [targets[j], targets[i]];
      }
      return targets;
    };

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth, h = window.innerHeight;
      bgCanvas.width = w * dpr; bgCanvas.height = h * dpr;
      bgCanvas.style.width = `${w}px`; bgCanvas.style.height = `${h}px`;
      bgCtx.scale(dpr, dpr);
      snowCanvas.width = w * dpr; snowCanvas.height = h * dpr;
      snowCanvas.style.width = `${w}px`; snowCanvas.style.height = `${h}px`;
      snowCtx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener('resize', resize);
    phaseRef.current = 'preview';
    setFrostyPhase('preview');
    phaseStartRef.current = performance.now();

    const drawBg = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      if (!bgImageRef.current) return;
      const img = bgImageRef.current;
      const imgR = img.width / img.height, canR = w / h;
      let dw, dh, dx, dy;
      if (canR > imgR) { dw = w; dh = w / imgR; dx = 0; dy = (h - dh) / 2; }
      else { dh = h; dw = h * imgR; dx = (w - dw) / 2; dy = 0; }
      ctx.drawImage(img, dx, dy, dw, dh);
    };

    const drawSnowball = (ctx: CanvasRenderingContext2D, s: Snowball) => {
      if (!snowImageRef.current) return;
      const cx = s.landed ? s.x : s.startX + (s.x - s.startX) * s.progress;
      const cy = s.landed ? s.y : s.startY + (s.y - s.startY) * s.progress;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(s.rotation);
      ctx.drawImage(snowImageRef.current, -s.size / 2, -s.size / 2, s.size, s.size);
      ctx.restore();
    };

    const spawnAt = (tx: number, ty: number, w: number, h: number) => {
      const edge = Math.floor(Math.random() * 4);
      let sx: number, sy: number;
      if (edge === 0) { sx = tx + (Math.random() - 0.5) * 150; sy = -200; }
      else if (edge === 1) { sx = w + 200; sy = ty + (Math.random() - 0.5) * 150; }
      else if (edge === 2) { sx = tx + (Math.random() - 0.5) * 150; sy = h + 200; }
      else { sx = -200; sy = ty + (Math.random() - 0.5) * 150; }
      snowballsRef.current.push({
        x: tx, y: ty, startX: sx, startY: sy,
        size: 350 + Math.random() * 400, rotation: Math.random() * Math.PI * 2,
        progress: 0, speed: 0.12 + Math.random() * 0.08, landed: false,
      });
    };

    const redrawSnow = () => {
      snowCtx.clearRect(0, 0, snowCanvas.width, snowCanvas.height);
      for (const s of snowballsRef.current) drawSnowball(snowCtx, s);
    };

    let pendingInitialCount = false;
    let pendingWipeCheck = false;

    const scheduleInitialSnowCount = () => {
      if (pendingInitialCount) return;
      pendingInitialCount = true;
      setTimeout(() => {
        pendingInitialCount = false;
        const imageData = snowCtx.getImageData(0, 0, snowCanvas.width, snowCanvas.height);
        let count = 0;
        for (let i = 3; i < imageData.data.length; i += 4) { if (imageData.data[i] > 0) count++; }
        initialSnowPixelsRef.current = count;
      }, 0);
    };

    const scheduleWipeCheck = () => {
      if (pendingWipeCheck) return;
      pendingWipeCheck = true;
      setTimeout(() => {
        pendingWipeCheck = false;
        if (phaseRef.current !== 'wipe') return;
        const imageData = snowCtx.getImageData(0, 0, snowCanvas.width, snowCanvas.height);
        let remaining = 0;
        for (let i = 3; i < imageData.data.length; i += 4) { if (imageData.data[i] > 0) remaining++; }
        const percentWiped = initialSnowPixelsRef.current > 0 ? 1 - (remaining / initialSnowPixelsRef.current) : 0;
        if (percentWiped >= 0.95 && threshold95TimeRef.current === null) {
          threshold95TimeRef.current = performance.now();
        }
      }, 0);
    };

    const gameLoop = () => {
      const now = performance.now();
      const elapsed = now - phaseStartRef.current;
      const w = window.innerWidth, h = window.innerHeight;
      bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
      drawBg(bgCtx, w, h);

      if (phaseRef.current === 'preview' && elapsed > 1500) {
        phaseRef.current = 'assault';
        setFrostyPhase('assault');
        phaseStartRef.current = now;
        snowballsRef.current = [];
        spawnQueueRef.current = generateTargets(w, h);
        lastSpawnRef.current = now;
      }

      if (phaseRef.current === 'assault') {
        if (spawnQueueRef.current.length > 0 && now - lastSpawnRef.current >= 30) {
          const t = spawnQueueRef.current.shift()!;
          spawnAt(t.x, t.y, w, h);
          lastSpawnRef.current = now;
        }
        let allLanded = true;
        for (const s of snowballsRef.current) {
          if (!s.landed) { s.progress += s.speed; if (s.progress >= 1) { s.progress = 1; s.landed = true; } else allLanded = false; }
        }
        redrawSnow();
        if (spawnQueueRef.current.length === 0 && allLanded && snowballsRef.current.length > 0) {
          phaseRef.current = 'wipe';
          setFrostyPhase('wipe');
          phaseStartRef.current = now;
          threshold95TimeRef.current = null;
          scheduleInitialSnowCount();
        }
      }

      if (phaseRef.current === 'wipe') {
        if (Math.floor(elapsed / 500) !== Math.floor((elapsed - 16) / 500)) { scheduleWipeCheck(); }
        const thresholdMet = threshold95TimeRef.current !== null && (now - threshold95TimeRef.current) >= 4000;
        if (thresholdMet || elapsed > 60000) {
          phaseRef.current = 'assault';
          setFrostyPhase('assault');
          phaseStartRef.current = now;
          snowballsRef.current = [];
          spawnQueueRef.current = generateTargets(w, h);
          lastSpawnRef.current = now;
        }
      }
      animationRef.current = requestAnimationFrame(gameLoop);
    };
    animationRef.current = requestAnimationFrame(gameLoop);
    return () => { window.removeEventListener('resize', resize); if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, []);

  const handleWipe = useCallback((x: number, y: number, prevX?: number, prevY?: number) => {
    const canvas = snowCanvasRef.current;
    if (!canvas || phaseRef.current !== 'wipe') return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.globalCompositeOperation = 'destination-out';
    const brush = 80;
    if (prevX !== undefined && prevY !== undefined) {
      const dx = x - prevX, dy = y - prevY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const steps = Math.max(1, Math.floor(dist / 10));
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const cx = prevX + dx * t, cy = prevY + dy * t;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, brush);
        grad.addColorStop(0, 'rgba(0,0,0,1)');
        grad.addColorStop(0.5, 'rgba(0,0,0,0.8)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(cx, cy, brush, 0, Math.PI * 2); ctx.fill();
      }
    } else {
      const grad = ctx.createRadialGradient(x, y, 0, x, y, brush);
      grad.addColorStop(0, 'rgba(0,0,0,1)');
      grad.addColorStop(0.5, 'rgba(0,0,0,0.8)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(x, y, brush, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }, []);

  const handleWipeRef = useRef(handleWipe);
  useEffect(() => { handleWipeRef.current = handleWipe; }, [handleWipe]);

  const frostyContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = frostyContainerRef.current;
    if (!el) return;
    const onMove = (e: PointerEvent) => {
      const prev = lastPointerRef.current;
      handleWipeRef.current(e.clientX, e.clientY, prev?.x, prev?.y);
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
    };
    const onDown = (e: PointerEvent) => {
      handleWipeRef.current(e.clientX, e.clientY);
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
    };
    const onUp = () => { lastPointerRef.current = null; };
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      const prev = lastPointerRef.current;
      handleWipeRef.current(t.clientX, t.clientY, prev?.x, prev?.y);
      lastPointerRef.current = { x: t.clientX, y: t.clientY };
    };
    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      handleWipeRef.current(t.clientX, t.clientY);
      lastPointerRef.current = { x: t.clientX, y: t.clientY };
    };
    el.addEventListener('pointermove', onMove, { passive: true });
    el.addEventListener('pointerdown', onDown, { passive: true });
    el.addEventListener('pointerup', onUp, { passive: true });
    el.addEventListener('pointerleave', onUp, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchend', onUp, { passive: true });
    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointerleave', onUp);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchend', onUp);
    };
  }, []);

  return (
    <div ref={frostyContainerRef} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', overflow: 'hidden', touchAction: 'none', cursor: frostyPhase === 'wipe' ? 'crosshair' : 'default' }}>
      <canvas ref={bgCanvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
      <canvas ref={snowCanvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
    </div>
  );
}
