'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';

const PARTICLE_COUNT = 1500;

const GAME_PALETTES = {
  day: { primary: [1.0, 0.7, 0.2], secondary: [1.0, 0.5, 0.1], glow: [1.0, 0.75, 0.3], bg1: '#0a0a18', bg2: '#12122a' },
};

const noise3D = (x: number, y: number, z: number): number => {
  const n = Math.floor(x) + Math.floor(y) * 256 + Math.floor(z) * 65536;
  return (Math.sin(n * 12.9898 + n * 78.233) * 43758.5453) % 1;
};

const curlNoise = (x: number, y: number, time: number) => {
  const eps = 0.001;
  const n1 = noise3D(x, y + eps, time);
  const n2 = noise3D(x, y - eps, time);
  const n3 = noise3D(x + eps, y, time);
  const n4 = noise3D(x - eps, y, time);
  return { dx: (n1 - n2) / (2 * eps) * 0.3, dy: -(n3 - n4) / (2 * eps) * 0.3 };
};

function createParticles(count: number) {
  const positions = new Float32Array(count * 2);
  const velocities = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    positions[i * 2] = 0.15 + Math.random() * 0.7;
    positions[i * 2 + 1] = -0.1 - Math.random() * 0.5;
    velocities[i * 2] = (Math.random() - 0.5) * 0.0005;
    velocities[i * 2 + 1] = 0.00025 + Math.random() * 0.0005;
  }
  return { positions, velocities };
}

export function SandPainter({ onEndGame }: { onEndGame: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameAnimationRef = useRef<number>(0);
  const timeRef = useRef(0);
  const lastFrameTimeRef = useRef(performance.now());
  const particlesRef = useRef<Float32Array | null>(null);
  const velocitiesRef = useRef<Float32Array | null>(null);
  const pointerRef = useRef({ x: 0.5, y: 0.5, active: false });
  const prevPointerRef = useRef({ x: 0.5, y: 0.5 });
  const [audioEnabled, setAudioEnabled] = useState(false);
  const audioRef = useRef<{ context: AudioContext | null; tickBuffer: AudioBuffer | null; masterGain: GainNode | null; lowpassFilter: BiquadFilterNode | null; lastSoundTime: number }>({
    context: null, tickBuffer: null, masterGain: null, lowpassFilter: null, lastSoundTime: 0,
  });

  const initGameAudio = useCallback(() => {
    const audio = audioRef.current;
    if (audio.context) return;
    try {
      const ctx = new AudioContext();
      ctx.resume();
      audio.context = ctx;
      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass'; lowpass.frequency.setValueAtTime(800, ctx.currentTime); lowpass.Q.setValueAtTime(0.7, ctx.currentTime);
      lowpass.connect(ctx.destination); audio.lowpassFilter = lowpass;
      const masterGain = ctx.createGain(); masterGain.gain.setValueAtTime(0.30, ctx.currentTime);
      masterGain.connect(lowpass); audio.masterGain = masterGain;
      const tickDuration = 0.06;
      const tickSamples = Math.floor(ctx.sampleRate * tickDuration);
      const tickBuffer = ctx.createBuffer(1, tickSamples, ctx.sampleRate);
      const tickData = tickBuffer.getChannelData(0);
      for (let i = 0; i < tickSamples; i++) {
        const t = i / tickSamples;
        tickData[i] = (Math.random() * 2 - 1) * Math.min(1, t * 10) * Math.exp(-t * 3) * 0.5;
      }
      audio.tickBuffer = tickBuffer;
      setAudioEnabled(true);
    } catch { /* Audio init failed — non-critical */ }
  }, []);

  const playSandSound = useCallback((volume: number = 0.1) => {
    const audio = audioRef.current;
    const ctx = audio.context;
    if (!ctx || !audio.tickBuffer || !audio.masterGain) return;
    const now = ctx.currentTime * 1000;
    if (now - audio.lastSoundTime < 150) return;
    audio.lastSoundTime = now;
    const source = ctx.createBufferSource();
    source.buffer = audio.tickBuffer;
    source.playbackRate.value = 0.9 + Math.random() * 0.2;
    const soundGain = ctx.createGain();
    soundGain.gain.setValueAtTime(volume, ctx.currentTime);
    source.connect(soundGain);
    soundGain.connect(audio.masterGain);
    source.start();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      canvas.width = window.innerWidth * dpr; canvas.height = window.innerHeight * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    const { positions, velocities } = createParticles(PARTICLE_COUNT);
    particlesRef.current = positions;
    velocitiesRef.current = velocities;
    lastFrameTimeRef.current = performance.now();

    const palette = GAME_PALETTES.day;

    const render = () => {
      const now = performance.now();
      const deltaTime = Math.min((now - lastFrameTimeRef.current) / 16.67, 3);
      lastFrameTimeRef.current = now;
      timeRef.current += 0.005;

      const width = window.innerWidth, height = window.innerHeight;
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, palette.bg1); gradient.addColorStop(1, palette.bg2);
      ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height);

      const pos = particlesRef.current;
      const vel = velocitiesRef.current;
      if (!pos || !vel) { gameAnimationRef.current = requestAnimationFrame(render); return; }

      const count = pos.length / 2;
      const pointer = pointerRef.current;
      const prevPointer = prevPointerRef.current;
      const pointerVelX = (pointer.x - prevPointer.x) * 0.5;
      const pointerVelY = (pointer.y - prevPointer.y) * 0.5;

      let cursorGrainCount = 0;
      ctx.globalCompositeOperation = 'lighter';

      for (let i = 0; i < count; i++) {
        const idx = i * 2;
        let x = pos[idx], y = pos[idx + 1], vx = vel[idx], vy = vel[idx + 1];
        vy += 0.000015 * deltaTime;
        const curl = curlNoise(x * 3, y * 3, timeRef.current);
        vx += curl.dx * 0.000005 * deltaTime;
        vy += curl.dy * 0.000005 * deltaTime;

        if (pointer.active) {
          const dx = x - pointer.x, dy = y - pointer.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 0.15 && dist > 0.001) {
            cursorGrainCount++;
            const force = (1 - dist / 0.15) * 0.001 * deltaTime;
            vx += (dx / dist) * force + pointerVelX * force;
            vy += (dy / dist) * force + pointerVelY * force;
            vx += dy * force * 0.25; vy -= dx * force * 0.25;
          }
        }
        vx *= 0.995; vy *= 0.995;
        x += vx * deltaTime; y += vy * deltaTime;
        if (y > 1.1 || x < -0.1 || x > 1.1) {
          x = 0.15 + Math.random() * 0.7; y = -0.05;
          vx = (Math.random() - 0.5) * 0.0005; vy = 0.00025 + Math.random() * 0.0005;
        }
        pos[idx] = x; pos[idx + 1] = y; vel[idx] = vx; vel[idx + 1] = vy;

        const screenX = x * width, screenY = y * height;
        const speed = Math.sqrt(vx * vx + vy * vy);
        const size = 4 + speed * 300;
        const alpha = Math.min(0.9, 0.5 + speed * 60);
        const colorMix = Math.min(1, speed * 200);
        const r = Math.floor((palette.primary[0] * (1 - colorMix) + palette.secondary[0] * colorMix) * 255);
        const g = Math.floor((palette.primary[1] * (1 - colorMix) + palette.secondary[1] * colorMix) * 255);
        const b = Math.floor((palette.primary[2] * (1 - colorMix) + palette.secondary[2] * colorMix) * 255);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.beginPath(); ctx.arc(screenX, screenY, size, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';

      if (cursorGrainCount > 0 && audioRef.current.context) {
        playSandSound(Math.min(0.3, 0.1 + cursorGrainCount * 0.005));
      }

      if (pointer.active) {
        const glow = palette.glow;
        ctx.fillStyle = `rgba(${Math.floor(glow[0] * 255)}, ${Math.floor(glow[1] * 255)}, ${Math.floor(glow[2] * 255)}, 0.15)`;
        ctx.beginPath(); ctx.arc(pointer.x * width, pointer.y * height, 50, 0, Math.PI * 2); ctx.fill();
      }
      prevPointerRef.current = { x: pointer.x, y: pointer.y };
      gameAnimationRef.current = requestAnimationFrame(render);
    };
    gameAnimationRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resize);
      if (gameAnimationRef.current) cancelAnimationFrame(gameAnimationRef.current);
      const audio = audioRef.current;
      if (audio.context) audio.context.close();
    };
  }, [playSandSound]);

  const gameContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = gameContainerRef.current;
    if (!el) return;
    const onMove = (e: PointerEvent) => { pointerRef.current = { x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight, active: true }; };
    const onDown = (e: PointerEvent) => { initGameAudio(); onMove(e); };
    const onLeave = () => { pointerRef.current.active = false; };
    const onTouchMove = (e: TouchEvent) => { const t = e.touches[0]; pointerRef.current = { x: t.clientX / window.innerWidth, y: t.clientY / window.innerHeight, active: true }; };
    el.addEventListener('pointermove', onMove, { passive: true });
    el.addEventListener('pointerdown', onDown, { passive: true });
    el.addEventListener('pointerleave', onLeave, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchstart', onDown as EventListener, { passive: true });
    el.addEventListener('touchend', onLeave, { passive: true });
    return () => {
      el.removeEventListener('pointermove', onMove); el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointerleave', onLeave); el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchstart', onDown as EventListener); el.removeEventListener('touchend', onLeave);
    };
  }, [initGameAudio]);

  return (
    <div ref={gameContainerRef} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', overflow: 'hidden', cursor: 'none', touchAction: 'none', zIndex: 10 }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 10 }} />
      <style jsx global>{`* { cursor: none !important; }`}</style>
    </div>
  );
}
