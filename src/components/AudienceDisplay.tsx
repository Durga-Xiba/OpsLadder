import React, { useEffect, useState } from 'react';
import { useSharedGameState } from '../hooks/useSharedGameState';
import { PyramidBoard } from './PyramidBoard';
import { Maximize2, Minimize2 } from 'lucide-react';

interface AudienceDisplayProps {
  isSplitScreen?: boolean;
}

export const AudienceDisplay: React.FC<AudienceDisplayProps> = ({ isSplitScreen = false }) => {
  const { currentQuestion, gameTitle, gameState } = useSharedGameState();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(false);

  // Sync document title with gameTitle
  useEffect(() => {
    if (!isSplitScreen) {
      const title = gameTitle && gameTitle.trim() ? gameTitle.trim() : 'Jackpot Round';
      document.title = `${title} — Audience Display`;
    }
  }, [gameTitle, isSplitScreen]);

  // Fullscreen listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen();
      } catch (err) {
        console.warn('Fullscreen request failed:', err);
      }
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      }
    }
  };

  // Auto-hide fullscreen affordance after mouse inactivity
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const handleMouseMove = () => {
      setShowControls(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setShowControls(false), 2500);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(timeout);
    };
  }, []);

  const activeCategory = currentQuestion?.category || 'ROUND CATEGORY';

  return (
    <div className="relative min-h-screen w-full bg-slate-100 flex flex-col justify-between p-4 sm:p-6 md:p-8 overflow-hidden select-none">
      {/* Floating subtle Fullscreen trigger in top right - auto hides */}
      <div
        className={`absolute top-4 right-4 z-50 transition-opacity duration-300 ${
          showControls ? 'opacity-80 hover:opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <button
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          className="p-2.5 rounded-lg bg-white/80 hover:bg-white text-slate-700 shadow-md backdrop-blur-xs transition-all border border-slate-200 cursor-pointer"
        >
          {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
        </button>
      </div>

      {/* Top Header Zone: Editable Round Name + Category Bar */}
      <header className="w-full max-w-5xl mx-auto flex flex-col items-center text-center pt-2 sm:pt-4 pb-4">
        {/* Round Name: editable in host edit mode, shown cleanly above category */}
        <div className="text-xs sm:text-sm md:text-base font-semibold tracking-widest uppercase text-amber-700 font-display">
          {gameTitle || 'Jackpot Round'}
        </div>

        {/* Category Header Bar: high contrast, clean, highly legible across hall */}
        <div className="mt-2 w-full bg-white border-2 border-slate-200/90 rounded-2xl px-6 py-3.5 sm:py-4 shadow-sm">
          <h1 className="font-display font-black text-2xl sm:text-3xl md:text-4xl lg:text-5xl tracking-tight text-slate-900 uppercase">
            {activeCategory}
          </h1>
        </div>
      </header>

      {/* Center: Inverted Pyramid Ranking Board */}
      <main className="w-full flex-1 flex flex-col justify-center items-center py-2 sm:py-4">
        <PyramidBoard
          options={currentQuestion?.options || []}
          lastRevealedRank={gameState.lastRevealedRank}
          lastRevealedTime={gameState.lastRevealedTime}
        />
      </main>

      {/* Subtle bottom padding balance so pyramid remains optically centered */}
      <footer className="h-4 sm:h-6" aria-hidden="true" />
    </div>
  );
};
