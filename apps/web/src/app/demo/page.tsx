'use client';

import React, { useState, useEffect, Suspense, lazy } from 'react';

const SandPainter = lazy(() => import('@/games/sand-painter/SandPainter').then(m => ({ default: m.SandPainter })));
const FrostyWindow = lazy(() => import('@/games/frosty-window/FrostyWindow').then(m => ({ default: m.FrostyWindow })));
const NebulaStir = lazy(() => import('@/games/nebula-stir/NebulaStir').then(m => ({ default: m.NebulaStir })));
const HiddenStatue = lazy(() => import('@/games/hidden-statue/HiddenStatue').then(m => ({ default: m.HiddenStatue })));
const MagicMeadow = lazy(() => import('@/games/magic-meadow/MagicMeadow').then(m => ({ default: m.MagicMeadow })));

interface GameDef {
  id: string;
  name: string;
  emoji: string;
  note: string;
  component: React.LazyExoticComponent<React.ComponentType<{ onEndGame: () => void }>>;
}

const games: GameDef[] = [
  { id: 'calm-current', name: 'The Sand-Painter', emoji: '🎨', note: 'Flowing particles respond to your touch with gentle audio.', component: SandPainter },
  { id: 'frosty-window', name: 'The Frosty Window', emoji: '❄️', note: 'Wipe away frost to reveal a calming mountain view.', component: FrostyWindow },
  { id: 'nebula-stir', name: 'The Nebula Stir', emoji: '🌌', note: 'Stir cosmic dust. Vigorous movement ignites supernovas.', component: NebulaStir },
  { id: 'hidden-statue', name: 'The Hidden Statue', emoji: '🗿', note: 'Gently polish marble to reveal the statue underneath.', component: HiddenStatue },
  { id: 'magic-meadow', name: 'Magic Meadow', emoji: '🌸', note: 'Touch to color in the sketch, revealing a meadow painting.', component: MagicMeadow },
];

function GameCard({ game, onClick }: { game: GameDef; onClick: () => void }) {
  return (
    <button
      aria-label={`Play ${game.name}`}
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '180px',
        padding: '24px 16px',
        borderRadius: '16px',
        border: '2px solid rgba(70, 130, 180, 0.3)',
        background: 'rgba(255,255,255,0.95)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
        cursor: 'pointer',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        gap: '8px',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'; }}
    >
      <span style={{ fontSize: '36px' }}>{game.emoji}</span>
      <span style={{ fontSize: '1rem', fontWeight: 600, color: '#4A3D32', textAlign: 'center' }}>{game.name}</span>
      <span style={{ fontSize: '0.8rem', color: '#8B7355', textAlign: 'center', lineHeight: 1.4 }}>{game.note}</span>
    </button>
  );
}

export default function DemoPage() {
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const activeGameDef = activeGame ? games.find(g => g.id === activeGame) : null;

  const handleEndGame = () => setActiveGame(null);

  if (activeGame && activeGameDef) {
    const GameComponent = activeGameDef.component;
    return (
      <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
        <button
          onClick={handleEndGame}
          style={{
            position: 'fixed', top: '16px', right: '16px', padding: '12px 24px',
            fontSize: '1rem', fontWeight: 500, color: 'rgba(255,255,255,0.8)',
            background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.25)',
            borderRadius: '20px', cursor: 'pointer', backdropFilter: 'blur(8px)',
            zIndex: 1000,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.5)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.3)'; }}
        >
          Back to Games
        </button>
        <Suspense fallback={
          <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(180deg, #87CEEB 0%, #E0F0FF 100%)', flexDirection: 'column', gap: '20px' }}>
            <div style={{ fontSize: '48px' }}>{activeGameDef.emoji}</div>
            <div style={{ fontSize: '24px', color: '#4A3D32' }}>Loading {activeGameDef.name}...</div>
          </div>
        }>
          <GameComponent onEndGame={handleEndGame} />
        </Suspense>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #FDF8F3 0%, #F5EDE4 100%)', padding: '40px 24px' }}>
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 700, color: '#4A3D32', marginBottom: '8px' }}>everloved</h1>
        <p style={{ fontSize: '1.1rem', color: '#8B7355', maxWidth: '600px', margin: '0 auto', lineHeight: 1.6 }}>
          Therapeutic sensory games designed for people living with late-stage dementia.
          Each game uses positive reinforcement only — no failure states, no timers, no scores.
        </p>
        <p style={{ fontSize: '0.9rem', color: '#A89880', marginTop: '12px' }}>
          Tap any game below to try it. Works on desktop, tablet, and phone.
        </p>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center' }}>
        {games.map(game => (
          <GameCard key={game.id} game={game} onClick={() => setActiveGame(game.id)} />
        ))}
      </div>

      <div style={{ textAlign: 'center', marginTop: '60px', paddingTop: '24px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        <p style={{ fontSize: '0.85rem', color: '#A89880' }}>everloved — A companion for those we cherish</p>
      </div>
    </div>
  );
}
