'use client';

import React, { useState, Suspense, lazy } from 'react';
import Image from 'next/image';

const SandPainter = lazy(() => import('@/games/sand-painter/SandPainter').then(m => ({ default: m.SandPainter })));
const FrostyWindow = lazy(() => import('@/games/frosty-window/FrostyWindow').then(m => ({ default: m.FrostyWindow })));
const NebulaStir = lazy(() => import('@/games/nebula-stir/NebulaStir').then(m => ({ default: m.NebulaStir })));
const HiddenStatue = lazy(() => import('@/games/hidden-statue/HiddenStatue').then(m => ({ default: m.HiddenStatue })));
const MagicMeadow = lazy(() => import('@/games/magic-meadow/MagicMeadow').then(m => ({ default: m.MagicMeadow })));

interface GameDef {
  id: string;
  name: string;
  genre: string;
  description: string;
  thumbnail: string;
  color: string;
  component: React.LazyExoticComponent<React.ComponentType<{ onEndGame: () => void }>>;
}

const games: GameDef[] = [
  {
    id: 'calm-current',
    name: 'The Sand-Painter',
    genre: 'Sensory Soundscapes',
    description: 'Flowing golden particles cascade like sand, swirling around your touch with gentle audio feedback. Designed to channel restless energy into calming visuals.',
    thumbnail: '/games/sand-painter.png',
    color: '#D4A84A',
    component: SandPainter,
  },
  {
    id: 'frosty-window',
    name: 'The Frosty Window',
    genre: 'Meaningful Interaction',
    description: 'Snowballs cover a beautiful Swiss mountain view in frost. Wipe the glass to reveal the scenery beneath. Instant visual reward with every touch.',
    thumbnail: '/games/switzerland_bg.jpg',
    color: '#4682B4',
    component: FrostyWindow,
  },
  {
    id: 'nebula-stir',
    name: 'The Nebula Stir',
    genre: 'Sensory Soundscapes',
    description: 'Stir the cosmic dust of a deep-space nebula. Gentle movement creates fluid ripples; vigorous stirring ignites warm amber supernovas.',
    thumbnail: '/games/nebula_bg.jpg',
    color: '#6B3FA0',
    component: NebulaStir,
  },
  {
    id: 'hidden-statue',
    name: 'The Hidden Statue',
    genre: 'Meaningful Interaction',
    description: 'A marble slab conceals a classical statue. Polish the surface to gradually reveal the artwork, with a warm glow guiding your progress.',
    thumbnail: '/games/hidden_statue_thumb.jpg',
    color: '#8B7355',
    component: HiddenStatue,
  },
  {
    id: 'magic-meadow',
    name: 'Magic Meadow',
    genre: 'Meaningful Interaction',
    description: 'A pencil sketch of a meadow awaits your touch. Paint over the outlines to bring the scene to life in full color, one brushstroke at a time.',
    thumbnail: '/games/magic_meadow_thumb.jpg',
    color: '#7A9B6D',
    component: MagicMeadow,
  },
];

function GameCard({ game, onClick }: { game: GameDef; onClick: () => void }) {
  return (
    <button
      aria-label={`Play ${game.name}`}
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        maxWidth: '380px',
        borderRadius: '20px',
        border: 'none',
        background: '#fff',
        boxShadow: '0 2px 20px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)',
        cursor: 'pointer',
        transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease',
        overflow: 'hidden',
        padding: 0,
        textAlign: 'left',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)';
        e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0) scale(1)';
        e.currentTarget.style.boxShadow = '0 2px 20px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)';
      }}
    >
      {/* Thumbnail */}
      <div style={{
        width: '100%',
        height: '200px',
        position: 'relative',
        background: game.color,
        overflow: 'hidden',
      }}>
        <Image
          src={game.thumbnail}
          alt={game.name}
          fill
          style={{ objectFit: 'cover', opacity: 0.9 }}
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
        {/* Gradient overlay */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '80px',
          background: 'linear-gradient(transparent, rgba(0,0,0,0.4))',
        }} />
        {/* Genre badge */}
        <div style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          padding: '4px 12px',
          borderRadius: '20px',
          background: 'rgba(255,255,255,0.9)',
          backdropFilter: 'blur(8px)',
          fontSize: '0.7rem',
          fontWeight: 600,
          color: game.color,
          letterSpacing: '0.02em',
          textTransform: 'uppercase',
        }}>
          {game.genre}
        </div>
        {/* Play indicator */}
        <div style={{
          position: 'absolute',
          bottom: '12px',
          right: '12px',
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.95)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill={game.color}>
            <polygon points="5,3 19,12 5,21" />
          </svg>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '20px 20px 24px' }}>
        <h3 style={{
          fontSize: '1.2rem',
          fontWeight: 700,
          color: '#2D2520',
          marginBottom: '8px',
          letterSpacing: '-0.01em',
        }}>
          {game.name}
        </h3>
        <p style={{
          fontSize: '0.88rem',
          color: '#6B5E52',
          lineHeight: 1.6,
          margin: 0,
        }}>
          {game.description}
        </p>
      </div>
    </button>
  );
}

export default function DemoPage() {
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const activeGameDef = activeGame ? games.find(g => g.id === activeGame) : null;

  const handleEndGame = () => setActiveGame(null);

  // Active game — full screen
  if (activeGame && activeGameDef) {
    const GameComponent = activeGameDef.component;
    return (
      <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
        <button
          onClick={handleEndGame}
          style={{
            position: 'fixed', top: '20px', right: '20px', padding: '10px 20px',
            fontSize: '0.9rem', fontWeight: 600, color: 'rgba(255,255,255,0.85)',
            background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '24px', cursor: 'pointer', backdropFilter: 'blur(12px)',
            zIndex: 1000, transition: 'all 0.2s ease',
            letterSpacing: '0.02em',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(0,0,0,0.45)';
            e.currentTarget.style.color = 'rgba(255,255,255,1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(0,0,0,0.25)';
            e.currentTarget.style.color = 'rgba(255,255,255,0.85)';
          }}
        >
          Back to Games
        </button>
        <Suspense fallback={
          <div style={{
            position: 'fixed', inset: 0, display: 'flex', alignItems: 'center',
            justifyContent: 'center', background: '#1a1510', flexDirection: 'column', gap: '16px',
          }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '50%',
              border: `3px solid ${activeGameDef.color}33`, borderTopColor: activeGameDef.color,
              animation: 'spin 0.8s linear infinite',
            }} />
            <div style={{ fontSize: '1rem', color: '#A89880', fontWeight: 500 }}>
              Loading {activeGameDef.name}
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        }>
          <GameComponent onEndGame={handleEndGame} />
        </Suspense>
      </div>
    );
  }

  // Game selection
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(165deg, #FAF6F1 0%, #F0EAE0 40%, #E8E0D4 100%)',
    }}>
      {/* Header */}
      <header style={{
        padding: '48px 24px 0',
        textAlign: 'center',
        maxWidth: '800px',
        margin: '0 auto',
      }}>
        {/* Logo */}
        <div style={{ marginBottom: '24px' }}>
          <Image
            src="/logo.png"
            alt="everloved"
            width={200}
            height={133}
            style={{ objectFit: 'contain' }}
            priority
          />
        </div>

        <h1 style={{
          fontSize: '1.1rem',
          fontWeight: 600,
          color: '#8B7355',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          marginBottom: '20px',
        }}>
          Therapeutic Game Experience
        </h1>

        <p style={{
          fontSize: '1.05rem',
          color: '#6B5E52',
          maxWidth: '580px',
          margin: '0 auto',
          lineHeight: 1.7,
        }}>
          Five sensory games designed for people living with late-stage dementia.
          Built on a foundation of positive reinforcement — no failure states,
          no timers, no scores. Just calming, engaging interaction.
        </p>
      </header>

      {/* Divider */}
      <div style={{
        maxWidth: '60px',
        height: '2px',
        background: 'linear-gradient(to right, transparent, #D4A84A, transparent)',
        margin: '40px auto',
      }} />

      {/* Game Grid */}
      <section style={{
        maxWidth: '820px',
        margin: '0 auto',
        padding: '0 24px 40px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '28px',
      }}>
        {games.map(game => (
          <GameCard key={game.id} game={game} onClick={() => setActiveGame(game.id)} />
        ))}
      </section>

      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        padding: '32px 24px 48px',
      }}>
        <div style={{
          maxWidth: '400px',
          margin: '0 auto',
          padding: '24px',
          borderRadius: '16px',
          background: 'rgba(255,255,255,0.5)',
          backdropFilter: 'blur(8px)',
        }}>
          <p style={{
            fontSize: '0.85rem',
            color: '#8B7355',
            lineHeight: 1.6,
            margin: 0,
          }}>
            Works on desktop, tablet, and mobile.
            <br />
            Tap any game to begin.
          </p>
        </div>
        <p style={{
          fontSize: '0.75rem',
          color: '#B0A594',
          marginTop: '24px',
          letterSpacing: '0.05em',
        }}>
          everloved — a companion for those we cherish
        </p>
      </footer>
    </div>
  );
}
