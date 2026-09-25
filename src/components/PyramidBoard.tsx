import React, { useEffect, useState } from 'react';
import { OptionItem } from '../types';

interface PyramidBoardProps {
  options: OptionItem[];
  isMini?: boolean;
  lastRevealedRank?: number | null;
  lastRevealedTime?: number;
  onRowClick?: (rank: number) => void;
}

export const PyramidBoard: React.FC<PyramidBoardProps> = ({
  options,
  isMini = false,
  lastRevealedRank,
  lastRevealedTime,
  onRowClick,
}) => {
  // Sort options strictly by rank 1 to 10
  const sortedOptions = [...options].sort((a, b) => a.rank - b.rank);

  // Track currently glowing rank
  const [glowingRank, setGlowingRank] = useState<number | null>(null);

  useEffect(() => {
    if (lastRevealedRank && lastRevealedTime) {
      const elapsed = Date.now() - lastRevealedTime;
      if (elapsed < 1200) {
        setGlowingRank(lastRevealedRank);
        const timer = setTimeout(() => {
          setGlowingRank(null);
        }, 1200);
        return () => clearTimeout(timer);
      }
    }
  }, [lastRevealedRank, lastRevealedTime]);

  return (
    <div className={`w-full flex flex-col items-center select-none ${isMini ? 'gap-1' : 'gap-2 md:gap-2.5 max-w-5xl mx-auto'}`}>
      {sortedOptions.map((opt) => {
        // Tapering width formula: rank 1 (100pts) is 100% (widest), rank 10 (10pts) is 48% (narrowest)
        const widthPercent = Math.max(48, 100 - (opt.rank - 1) * 5.6);
        const isGlowing = glowingRank === opt.rank;

        if (isMini) {
          // Small host reference view
          return (
            <div
              key={opt.rank}
              onClick={() => onRowClick && onRowClick(opt.rank)}
              style={{ width: `${widthPercent}%` }}
              className={`transition-all duration-200 h-7 rounded-md px-2.5 flex items-center justify-between border ${
                opt.revealed
                  ? 'bg-amber-50 border-amber-300 text-amber-950 font-semibold shadow-xs'
                  : 'bg-slate-200/80 border-white/80 text-slate-500 font-medium'
              } ${onRowClick ? 'cursor-pointer hover:ring-1 hover:ring-amber-400' : ''}`}
              title={opt.revealed ? `${opt.answer} (${opt.points} pts)` : `Hidden (${opt.points} pts)`}
            >
              <span className="text-[11px] truncate mr-1.5">
                {opt.revealed ? opt.answer : `—`}
              </span>
              <span className="text-[10px] font-mono tabular-nums font-bold shrink-0 opacity-80">
                {opt.points}
              </span>
            </div>
          );
        }

        // Fullscreen Audience projector view
        return (
          <div
            key={opt.rank}
            style={{ width: `${widthPercent}%` }}
            className={`transition-all duration-300 rounded-xl px-4 sm:px-6 md:px-8 py-2.5 sm:py-3 md:py-3.5 flex items-center justify-between border-2 ${
              isGlowing ? 'animate-reveal-glow ring-4 ring-amber-400/80 z-10' : ''
            } ${
              opt.revealed
                ? 'bg-white border-amber-400 shadow-md text-slate-900'
                : 'bg-slate-200/90 border-white/90 text-slate-600 shadow-xs'
            }`}
          >
            {opt.revealed ? (
              <>
                <div className="flex items-center min-w-0 pr-3">
                  <span className="font-display font-extrabold text-base sm:text-xl md:text-2xl lg:text-3xl tracking-tight uppercase text-slate-900 truncate">
                    {opt.answer}
                  </span>
                </div>
                <div className="shrink-0 flex items-center gap-1.5 pl-2">
                  <span className="font-display font-black text-base sm:text-xl md:text-2xl lg:text-3xl tabular-nums text-amber-600">
                    {opt.points}
                  </span>
                  <span className="text-xs sm:text-sm md:text-base font-bold text-amber-800/80 uppercase tracking-wider">
                    PTS
                  </span>
                </div>
              </>
            ) : (
              <div className="w-full flex items-center justify-center">
                <span className="font-display font-black text-sm sm:text-lg md:text-xl lg:text-2xl tabular-nums text-slate-400/90 tracking-widest uppercase">
                  {opt.points} POINTS
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
