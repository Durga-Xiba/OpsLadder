import React, { useState, useEffect } from 'react';
import { HostControl } from './components/HostControl';
import { AudienceDisplay } from './components/AudienceDisplay';

export default function App() {
  const [currentView, setCurrentView] = useState<'host' | 'audience' | 'split'>(() => {
    if (typeof window === 'undefined') return 'host';
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    const hash = window.location.hash.toLowerCase();

    if (viewParam === 'audience' || hash.includes('audience')) {
      return 'audience';
    }
    if (viewParam === 'split' || hash.includes('split')) {
      return 'split';
    }
    return 'host';
  });

  useEffect(() => {
    const handleUrlChange = () => {
      const params = new URLSearchParams(window.location.search);
      const viewParam = params.get('view');
      const hash = window.location.hash.toLowerCase();

      if (viewParam === 'audience' || hash.includes('audience')) {
        setCurrentView('audience');
      } else if (viewParam === 'split' || hash.includes('split')) {
        setCurrentView('split');
      } else {
        setCurrentView('host');
      }
    };

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  const switchView = (view: 'host' | 'audience' | 'split') => {
    const url = new URL(window.location.href);
    if (view === 'audience') {
      url.searchParams.set('view', 'audience');
    } else if (view === 'split') {
      url.searchParams.set('view', 'split');
    } else {
      url.searchParams.delete('view');
    }
    url.hash = '';
    window.history.pushState({}, '', url.toString());
    setCurrentView(view);
  };

  if (currentView === 'audience') {
    return (
      <div className="relative min-h-screen">
        <AudienceDisplay />
        {/* Subtle quick switcher for single-monitor preview / testing */}
        <div className="fixed bottom-2 left-2 z-50 opacity-25 hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-1 bg-white/95 px-2 py-1 rounded shadow-md border border-slate-300 backdrop-blur-xs text-[11px] font-semibold text-slate-700">
            <span>View:</span>
            <button
              onClick={() => switchView('host')}
              className="text-amber-700 hover:underline cursor-pointer"
            >
              Host
            </button>
            <span>·</span>
            <button
              onClick={() => switchView('split')}
              className="text-amber-700 hover:underline cursor-pointer"
            >
              Split-Screen
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (currentView === 'split') {
    return (
      <div className="min-h-screen flex flex-col bg-slate-900">
        {/* Split screen banner */}
        <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <span className="font-bold text-amber-400 uppercase tracking-wider">
              Split-Screen Testing Layout
            </span>
            <span className="hidden sm:inline text-slate-400">
              · Left: Host Controls · Right: Live Audience Display
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => switchView('host')}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer border border-slate-700 transition-colors"
            >
              Host Only
            </button>
            <button
              onClick={() => switchView('audience')}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer border border-slate-700 transition-colors"
            >
              Audience Only
            </button>
          </div>
        </div>

        {/* Side-by-side columns */}
        <div className="flex-1 grid grid-cols-1 xl:grid-cols-2 divide-y xl:divide-y-0 xl:divide-x divide-slate-300 bg-slate-100">
          <div className="overflow-y-auto">
            <HostControl isSplitScreen currentView="split" onViewChange={switchView} />
          </div>
          <div className="overflow-y-auto bg-slate-100 border-l border-slate-300">
            <AudienceDisplay isSplitScreen />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <HostControl currentView="host" onViewChange={switchView} />
    </div>
  );
}
