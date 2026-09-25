import React, { useState, useEffect, useMemo } from 'react';
import { useSharedGameState } from '../hooks/useSharedGameState';
import { PyramidBoard } from './PyramidBoard';
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Edit3,
  RotateCcw,
  Volume2,
  VolumeX,
  Shuffle,
  Eye,
  EyeOff,
  CheckCircle2,
  Sliders,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import { isSoundEnabled, setSoundEnabled } from '../utils/audio';

// Deterministic seedable pseudo-random shuffle per question id so bank stays stable during play
function getShuffledIndices(seed: number): number[] {
  const indices = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  let currentSeed = seed * 9301 + 49297;
  for (let i = indices.length - 1; i > 0; i--) {
    currentSeed = (currentSeed * 9301 + 49297) % 233280;
    const rnd = currentSeed / 233280;
    const j = Math.floor(rnd * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices;
}

interface HostControlProps {
  isSplitScreen?: boolean;
  currentView?: 'host' | 'audience' | 'split';
  onViewChange?: (view: 'host' | 'audience' | 'split') => void;
}

export const HostControl: React.FC<HostControlProps> = ({
  isSplitScreen = false,
  currentView = 'host',
  onViewChange,
}) => {
  const {
    gameState,
    currentQuestion,
    currentQuestionIndex,
    gameTitle,
    revealOption,
    toggleOption,
    resetCurrentQuestion,
    revealAllCurrent,
    hideAllCurrent,
    navigateToQuestion,
    nextQuestion,
    previousQuestion,
    setRoundName,
    updateQuestionData,
    resetAllToDefaults,
    registerChildWindow,
  } = useSharedGameState();

  // Sync document title
  useEffect(() => {
    if (!isSplitScreen) {
      document.title = `${gameTitle || 'Jackpot Round'} — Host Control`;
    }
  }, [gameTitle, isSplitScreen]);

  const [editMode, setEditMode] = useState(false);
  const [soundOn, setSoundOn] = useState(isSoundEnabled);
  const [shuffleSalt, setShuffleSalt] = useState(0);
  const [sortAlphabetical, setSortAlphabetical] = useState(false);
  
  // Selected question in Edit Mode
  const [editingQuestionIndex, setEditingQuestionIndex] = useState(currentQuestionIndex);

  // Keep editingQuestionIndex synced when switching question outside edit mode
  useEffect(() => {
    if (!editMode) {
      setEditingQuestionIndex(currentQuestionIndex);
    }
  }, [currentQuestionIndex, editMode]);

  // Audio toggle
  const handleToggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
  };

  // Open Audience Display in separate popup/window
  const openAudienceDisplay = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('view', 'audience');
    url.hash = '';

    const win = window.open(
      url.toString(),
      'JackpotAudienceWindow',
      'width=1280,height=800,menubar=no,toolbar=no,location=no,status=no',
    );
    if (!win) {
      alert('Popup blocker prevented opening the Audience Display window. Please allow popups for this site.');
    } else {
      registerChildWindow(win);
      setTimeout(() => {
        try {
          win.postMessage({ type: 'JACKPOT_DIRECT_SYNC', state: gameState }, '*');
        } catch {
          // Ignore
        }
      }, 250);
    }
  };

  // Bank items calculation: shuffled or alphabetical
  const answerBankItems = useMemo(() => {
    if (!currentQuestion) return [];
    const opts = currentQuestion.options;
    
    if (sortAlphabetical) {
      return [...opts].sort((a, b) => a.answer.localeCompare(b.answer));
    }

    const order = getShuffledIndices(currentQuestion.id + shuffleSalt);
    return order.map((idx) => opts[idx]).filter(Boolean);
  }, [currentQuestion, shuffleSalt, sortAlphabetical]);

  // Count revealed options
  const revealedCount = currentQuestion?.options.filter((o) => o.revealed).length || 0;
  const totalPointsRevealed = currentQuestion?.options
    .filter((o) => o.revealed)
    .reduce((acc, curr) => acc + curr.points, 0) || 0;

  // Edit Mode state handlers
  const editingQuestion = gameState.questions[editingQuestionIndex] || gameState.questions[0];

  const handleCategoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCategory = e.target.value;
    updateQuestionData(
      editingQuestionIndex,
      newCategory,
      editingQuestion.options.map((o) => o.answer),
    );
  };

  const handleAnswerChange = (rank: number, value: string) => {
    const answers = editingQuestion.options.map((o) => (o.rank === rank ? value : o.answer));
    updateQuestionData(editingQuestionIndex, editingQuestion.category, answers);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-800">
      {/* ============================================================== */}
      {/* TOP BAR CONTRACT: One row, three zones                         */}
      {/* Zone 1: Brand title & mode indicator                           */}
      {/* Zone 2: Navigation (Prev, Question X of 30, Next)              */}
      {/* Zone 3: Actions (Edit Questions, Open Audience Display)        */}
      {/* ============================================================== */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between shadow-xs sticky top-0 z-40">
        {/* Zone 1: Brand */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="font-display font-black text-lg tracking-tight text-slate-900 leading-none">
              {gameTitle || 'Jackpot Round'}
            </span>
            <span className="text-[11px] font-semibold tracking-wider text-amber-700 uppercase mt-0.5">
              Host Control Panel
            </span>
          </div>
        </div>

        {/* Zone 2: Navigation */}
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={previousQuestion}
            disabled={currentQuestionIndex <= 0}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              currentQuestionIndex <= 0
                ? 'opacity-40 cursor-not-allowed bg-slate-50 border-slate-200 text-slate-400'
                : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700 cursor-pointer shadow-xs active:translate-y-px'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Prev</span>
          </button>

          {/* Question Jumper Dropdown */}
          <div className="relative">
            <select
              value={currentQuestionIndex}
              onChange={(e) => navigateToQuestion(Number(e.target.value))}
              aria-label="Select Question"
              className="appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-300 text-slate-900 text-xs sm:text-sm font-bold rounded-lg px-3 py-1.5 pr-7 cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {gameState.questions.map((q, idx) => (
                <option key={q.id} value={idx}>
                  Q{idx + 1} · {q.category.length > 28 ? q.category.slice(0, 28) + '...' : q.category}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
              <span className="text-[10px]">▼</span>
            </div>
          </div>

          <button
            onClick={nextQuestion}
            disabled={currentQuestionIndex >= 29}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              currentQuestionIndex >= 29
                ? 'opacity-40 cursor-not-allowed bg-slate-50 border-slate-200 text-slate-400'
                : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700 cursor-pointer shadow-xs active:translate-y-px'
            }`}
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Zone 3: Actions */}
        <div className="flex items-center gap-2">
          {/* View switcher when onViewChange is provided */}
          {onViewChange && (
            <div className="hidden md:flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold mr-1">
              <button
                onClick={() => onViewChange('host')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  currentView === 'host'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Host View
              </button>
              <button
                onClick={() => onViewChange('split')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  currentView === 'split'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Split-Screen
              </button>
              <button
                onClick={() => onViewChange('audience')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  currentView === 'audience'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Audience View
              </button>
            </div>
          )}

          {/* Sound FX Toggle */}
          <button
            onClick={handleToggleSound}
            title={soundOn ? 'Sound Chimes Enabled (Click to Mute)' : 'Sound Chimes Muted'}
            aria-label="Toggle sound effects"
            className={`p-2 rounded-lg border text-xs transition-colors cursor-pointer ${
              soundOn ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100' : 'bg-slate-100 border-slate-200 text-slate-400 hover:bg-slate-200'
            }`}
          >
            {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Edit Questions Toggle */}
          <button
            onClick={() => setEditMode(!editMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer shadow-xs ${
              editMode
                ? 'bg-amber-500 border-amber-600 text-slate-950'
                : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-800'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{editMode ? 'Exit Edit' : 'Edit Questions'}</span>
          </button>

          {/* Open Audience Display */}
          <button
            onClick={openAudienceDisplay}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 border border-slate-900 transition-colors shadow-xs cursor-pointer whitespace-nowrap"
          >
            <span>Open Audience Display</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* ============================================================== */}
      {/* EDIT MODE (Only on Host page, never on Audience Display)       */}
      {/* ============================================================== */}
      {editMode ? (
        <div className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto flex flex-col gap-6">
          {/* Top of Edit Mode: Editable Round Name field as requested */}
          <div className="bg-white border border-amber-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1">
              <label htmlFor="roundNameInput" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Round Name (Shown on Audience Projector & Browser Tab)
              </label>
              <input
                id="roundNameInput"
                type="text"
                value={gameTitle}
                onChange={(e) => setRoundName(e.target.value)}
                placeholder="e.g. Jackpot Round, Finale Stage, Trivia Mania"
                className="w-full text-base sm:text-lg font-bold text-slate-900 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                This title updates in real-time on the Audience Display and tab title. Defaults to "Jackpot Round" if left blank.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <button
                onClick={() => {
                  if (confirm('Reset all 30 questions and round name back to original factory defaults? This will erase custom edits.')) {
                    resetAllToDefaults();
                  }
                }}
                className="text-xs font-medium text-rose-600 hover:text-rose-700 px-3 py-2 border border-rose-200 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              >
                Reset All 30 Questions to Defaults
              </button>
            </div>
          </div>

          {/* Question Editor Grid: Left = 30 Question Selector, Right = 10 Slot Editor */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-start">
            {/* Left: 30 Question Selector list */}
            <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-4 shadow-xs max-h-[75vh] flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Select Question (30 Total)
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  {editingQuestionIndex + 1} of 30
                </span>
              </div>

              <div className="overflow-y-auto space-y-1 pr-1 flex-1">
                {gameState.questions.map((q, idx) => (
                  <button
                    key={q.id}
                    onClick={() => {
                      setEditingQuestionIndex(idx);
                      navigateToQuestion(idx);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-between cursor-pointer ${
                      editingQuestionIndex === idx
                        ? 'bg-amber-100/90 text-amber-950 font-bold border border-amber-300'
                        : 'text-slate-700 hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <span className="truncate pr-2">
                      <span className="font-mono text-slate-400 font-bold mr-1.5">
                        {String(idx + 1).padStart(2, '0')}.
                      </span>
                      {q.category}
                    </span>
                    {q.options.some((o) => o.revealed) && (
                      <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" title="Has revealed options" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Right: Editing Selected Question Category + 10 Ranks */}
            <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col gap-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
                  Editing Question #{editingQuestionIndex + 1}
                </span>
                <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Autosaved
                </span>
              </div>

              {/* Category Title Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Category Title
                </label>
                <input
                  type="text"
                  value={editingQuestion.category}
                  onChange={handleCategoryChange}
                  placeholder="e.g. BOTTLENECK: GLOBAL MARITIME CHOKEPOINTS"
                  className="w-full font-bold text-slate-900 text-sm sm:text-base px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                />
              </div>

              {/* 10 Option Inputs: 100 pts down to 10 pts */}
              <div className="flex flex-col gap-2 pt-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Answers by Rank & Points (1st / 100 pts at top down to 10th / 10 pts)
                </span>

                <div className="space-y-2">
                  {editingQuestion.options.map((opt) => (
                    <div key={opt.rank} className="flex items-center gap-2">
                      <div className="w-24 shrink-0 bg-slate-100 border border-slate-200 rounded-lg py-1.5 px-2 text-center text-xs font-bold text-slate-700 font-mono">
                        {opt.points} PTS
                      </div>
                      <div className="flex-1">
                        <input
                          type="text"
                          value={opt.answer}
                          onChange={(e) => handleAnswerChange(opt.rank, e.target.value)}
                          placeholder={`Rank #${opt.rank} Answer`}
                          className="w-full text-sm font-semibold text-slate-900 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Quick Action for this Question */}
              <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                <button
                  onClick={() => setEditMode(false)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors"
                >
                  Done Editing · Return to Live Control
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ============================================================== */
        /* LIVE HOST CONTROL VIEW: TWO COLUMNS                            */
        /* LEFT: Small reference view of the pyramid board                */
        /* RIGHT: Answer Bank with clickable shuffled words               */
        /* ============================================================== */
        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto flex flex-col gap-5">
          {/* Active Question Banner */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-amber-700 uppercase tracking-widest">
                Question {currentQuestionIndex + 1} of 30
              </span>
              <h2 className="font-display font-black text-xl sm:text-2xl text-slate-900 uppercase tracking-tight">
                {currentQuestion.category}
              </h2>
            </div>

            {/* Quick stats & status */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="block text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                  Revealed
                </span>
                <span className="text-sm font-mono font-bold text-slate-800">
                  {revealedCount} / 10 answers ({totalPointsRevealed} pts)
                </span>
              </div>
            </div>
          </div>

          {/* Two Columns Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start flex-1">
            {/* ============================================================ */}
            {/* LEFT COLUMN: Small reference view of the pyramid board       */}
            {/* Same tapering shape as audience display so host sees mirror  */}
            {/* ============================================================ */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col gap-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Projector Mirror (Reference)
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  Click any row to toggle
                </span>
              </div>

              {/* Mini pyramid renderer */}
              <div className="py-2 px-1 bg-slate-50/80 rounded-lg border border-slate-100">
                <PyramidBoard
                  options={currentQuestion.options}
                  isMini={true}
                  onRowClick={(rank) => toggleOption(rank)}
                />
              </div>

              {/* Convenience controls */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={resetCurrentQuestion}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset This Question</span>
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={revealAllCurrent}
                    title="Reveal all 10 options on screen"
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Reveal All</span>
                  </button>

                  <button
                    onClick={hideAllCurrent}
                    title="Hide all options on screen"
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>Hide All</span>
                  </button>
                </div>
              </div>
            </div>

            {/* ============================================================ */}
            {/* RIGHT COLUMN: "Answer Bank"                                   */}
            {/* Shuffled/admin-set order, clickable button per answer        */}
            {/* ============================================================ */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col gap-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Host Answer Bank (Click to Reveal on Audience Projector)
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Click an answer when contestants guess it. It instantly illuminates on the projector.
                  </p>
                </div>

                {/* Bank order controls */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setSortAlphabetical(!sortAlphabetical)}
                    title={sortAlphabetical ? 'Sorted Alphabetically' : 'Order: Shuffled'}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors cursor-pointer ${
                      sortAlphabetical ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {sortAlphabetical ? 'A → Z' : 'Shuffled'}
                  </button>

                  {!sortAlphabetical && (
                    <button
                      onClick={() => setShuffleSalt((prev) => prev + 1)}
                      title="Reshuffle Answer Bank buttons"
                      className="p-1 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 cursor-pointer"
                    >
                      <Shuffle className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Clickable Answer Buttons Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {answerBankItems.map((opt) => {
                  const isRevealed = opt.revealed;

                  return (
                    <button
                      key={opt.rank}
                      onClick={() => revealOption(opt.rank)}
                      disabled={isRevealed}
                      className={`text-left rounded-xl p-3 border-2 transition-all flex items-center justify-between cursor-pointer ${
                        isRevealed
                          ? 'bg-slate-100 border-slate-200 text-slate-400 opacity-60 cursor-not-allowed shadow-none'
                          : 'bg-white hover:bg-amber-50/80 border-slate-300 hover:border-amber-400 text-slate-900 shadow-xs hover:shadow-sm active:scale-[0.99]'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        {isRevealed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                        )}
                        <span className={`text-sm font-bold truncate ${isRevealed ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                          {opt.answer}
                        </span>
                      </div>

                      <div className="shrink-0 flex items-center gap-1 font-mono">
                        <span className={`text-xs font-extrabold ${isRevealed ? 'text-slate-400' : 'text-amber-700'}`}>
                          {opt.points}
                        </span>
                        <span className="text-[10px] text-slate-400">pts</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Host Help Guide footer */}
              <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-2 text-[11px] text-slate-600">
                <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-800">Host Tip: </span>
                  Click <span className="font-semibold">"Open Audience Display"</span> in the top right to launch the projector window. Drag that window to your extended monitor/projector screen and press <span className="font-mono bg-white px-1 py-0.5 rounded border border-slate-200">F</span> or click the expand icon for fullscreen!
                </div>
              </div>
            </div>
          </div>
        </main>
      )}
    </div>
  );
};
