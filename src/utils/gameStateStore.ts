import { GameState, SyncMessage } from '../types';
import { DEFAULT_QUESTIONS, DEFAULT_ROUND_NAME } from '../defaultQuestions';
import { playRevealChime, playResetChime } from './audio';

const STORAGE_KEY = 'jackpot_round_board_state_v3';
const PING_KEY = 'jackpot_round_board_ping_v3';
const CHANNEL_NAME = 'jackpot_round_board_sync_v3';

// Singleton in-memory state
let currentState: GameState = loadInitialState();
const listeners = new Set<(state: GameState) => void>();
const childWindows = new Set<Window>();
let broadcastChannel: BroadcastChannel | null = null;
let lastPingTimestamp = 0;

function loadInitialState(): GameState {
  if (typeof window === 'undefined') {
    return {
      gameTitle: DEFAULT_ROUND_NAME,
      currentQuestionIndex: 0,
      questions: DEFAULT_QUESTIONS,
    };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.questions) && parsed.questions.length === 30) {
        return {
          gameTitle: typeof parsed.gameTitle === 'string' && parsed.gameTitle.trim() ? parsed.gameTitle : DEFAULT_ROUND_NAME,
          currentQuestionIndex: typeof parsed.currentQuestionIndex === 'number' ? Math.max(0, Math.min(29, parsed.currentQuestionIndex)) : 0,
          questions: parsed.questions,
          lastRevealedRank: parsed.lastRevealedRank ?? null,
          lastRevealedTime: parsed.lastRevealedTime ?? undefined,
        };
      }
    }
  } catch (err) {
    console.error('Failed to read from localStorage:', err);
  }

  const fresh: GameState = {
    gameTitle: DEFAULT_ROUND_NAME,
    currentQuestionIndex: 0,
    questions: DEFAULT_QUESTIONS,
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  } catch {
    // Ignore storage errors
  }

  return fresh;
}

// Notify all local React listeners in the current window immediately (0ms latency)
function notifyLocalListeners(state: GameState) {
  currentState = state;
  listeners.forEach((listener) => {
    try {
      listener(currentState);
    } catch (e) {
      console.error('Error in state listener:', e);
    }
  });

  // Custom DOM event for any other listeners on the window
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('jackpot_state_change', { detail: state }));
    } catch {
      // Ignore
    }
  }
}

// Broadcast to external tabs, windows, and iframes
function broadcastState(nextState: GameState) {
  // 1. BroadcastChannel API
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({
        type: 'STATE_SYNC',
        state: nextState,
      } as SyncMessage);
    } catch (e) {
      console.warn('BroadcastChannel postMessage failed:', e);
    }
  }

  // 2. localStorage + ping key (triggers 'storage' event in other tabs/windows)
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
      const ping = Date.now().toString();
      localStorage.setItem(PING_KEY, ping);
      lastPingTimestamp = Number(ping);
    } catch (e) {
      console.warn('localStorage setItem failed:', e);
    }

    // 3. Direct window.postMessage to opened popup windows
    childWindows.forEach((win) => {
      try {
        if (!win.closed) {
          win.postMessage({ type: 'JACKPOT_DIRECT_SYNC', state: nextState }, '*');
        } else {
          childWindows.delete(win);
        }
      } catch {
        // Ignore
      }
    });

    // 4. Direct window.postMessage to parent / opener if this window was opened by host
    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ type: 'JACKPOT_DIRECT_SYNC', state: nextState }, '*');
      }
    } catch {
      // Ignore
    }

    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'JACKPOT_DIRECT_SYNC', state: nextState }, '*');
      }
    } catch {
      // Ignore
    }
  }
}

// Apply an update function to the singleton state
function updateState(
  updater: (prev: GameState) => GameState,
  soundCue?: { type: 'reveal'; points: number } | { type: 'reset' }
) {
  const next = updater(currentState);
  notifyLocalListeners(next);
  broadcastState(next);

  if (soundCue) {
    if (soundCue.type === 'reveal') {
      playRevealChime(soundCue.points);
    } else if (soundCue.type === 'reset') {
      playResetChime();
    }
  }
}

// Initialize multi-channel sync listeners
function initSyncEngine() {
  if (typeof window === 'undefined') return;

  // 1. Setup BroadcastChannel
  try {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
    broadcastChannel.onmessage = (event: MessageEvent<SyncMessage>) => {
      const data = event.data;
      if (!data) return;

      if (data.type === 'STATE_SYNC' && data.state) {
        notifyLocalListeners(data.state);
      } else if (data.type === 'REQUEST_STATE') {
        broadcastChannel?.postMessage({
          type: 'STATE_SYNC',
          state: currentState,
        } as SyncMessage);
      }
    };
  } catch (err) {
    console.warn('BroadcastChannel initialization error:', err);
  }

  // 2. Storage event listener (fires across tabs/windows)
  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY && event.newValue) {
      try {
        const parsed = JSON.parse(event.newValue) as GameState;
        if (parsed && Array.isArray(parsed.questions)) {
          notifyLocalListeners(parsed);
        }
      } catch (err) {
        console.error('Storage parse error:', err);
      }
    } else if (event.key === PING_KEY) {
      // Re-read storage
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as GameState;
          if (parsed && Array.isArray(parsed.questions)) {
            notifyLocalListeners(parsed);
          }
        }
      } catch {
        // Ignore
      }
    }
  };
  window.addEventListener('storage', handleStorage);

  // 3. postMessage listener (for iframe / window.open direct sync)
  const handleMessage = (event: MessageEvent) => {
    if (event.data && (event.data.type === 'JACKPOT_DIRECT_SYNC' || event.data.type === 'STATE_SYNC')) {
      if (event.data.state && Array.isArray(event.data.state.questions)) {
        notifyLocalListeners(event.data.state);
      }
    }
  };
  window.addEventListener('message', handleMessage);

  // 4. Lightweight polling fallback (every 200ms) to ensure split-second sync even if all event systems fail
  const pollInterval = setInterval(() => {
    try {
      const ping = localStorage.getItem(PING_KEY);
      if (ping) {
        const num = Number(ping);
        if (num > lastPingTimestamp) {
          lastPingTimestamp = num;
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw) as GameState;
            if (parsed && Array.isArray(parsed.questions)) {
              notifyLocalListeners(parsed);
            }
          }
        }
      }
    } catch {
      // Ignore
    }
  }, 200);

  // Initial ping to request latest state
  try {
    broadcastChannel?.postMessage({ type: 'REQUEST_STATE' } as SyncMessage);
  } catch {
    // Ignore
  }
}

// Start engine once on import
if (typeof window !== 'undefined') {
  initSyncEngine();
}

export const gameStateStore = {
  getState(): GameState {
    return currentState;
  },

  subscribe(listener: (state: GameState) => void): () => void {
    listeners.add(listener);
    // Send immediate initial state
    listener(currentState);
    return () => {
      listeners.delete(listener);
    };
  },

  registerChildWindow(win: Window) {
    childWindows.add(win);
  },

  revealOption(rank: number) {
    const qIndex = currentState.currentQuestionIndex;
    const currentQ = currentState.questions[qIndex] || currentState.questions[0];
    const targetOpt = currentQ?.options.find((o) => o.rank === rank);
    const points = targetOpt ? targetOpt.points : 100;

    updateState(
      (prev) => {
        const updatedQuestions = prev.questions.map((q, idx) => {
          if (idx !== qIndex) return q;
          return {
            ...q,
            options: q.options.map((opt) => (opt.rank === rank ? { ...opt, revealed: true } : opt)),
          };
        });

        return {
          ...prev,
          questions: updatedQuestions,
          lastRevealedRank: rank,
          lastRevealedTime: Date.now(),
        };
      },
      { type: 'reveal', points }
    );
  },

  toggleOption(rank: number) {
    const qIndex = currentState.currentQuestionIndex;
    const currentQ = currentState.questions[qIndex] || currentState.questions[0];
    const targetOpt = currentQ?.options.find((o) => o.rank === rank);
    if (!targetOpt) return;

    if (targetOpt.revealed) {
      // Unreveal
      updateState((prev) => {
        const updatedQuestions = prev.questions.map((q, idx) => {
          if (idx !== qIndex) return q;
          return {
            ...q,
            options: q.options.map((opt) => (opt.rank === rank ? { ...opt, revealed: false } : opt)),
          };
        });
        return {
          ...prev,
          questions: updatedQuestions,
          lastRevealedRank: null,
        };
      });
    } else {
      this.revealOption(rank);
    }
  },

  resetCurrentQuestion() {
    const qIndex = currentState.currentQuestionIndex;
    updateState(
      (prev) => {
        const updatedQuestions = prev.questions.map((q, idx) => {
          if (idx !== qIndex) return q;
          return {
            ...q,
            options: q.options.map((opt) => ({ ...opt, revealed: false })),
          };
        });

        return {
          ...prev,
          questions: updatedQuestions,
          lastRevealedRank: null,
        };
      },
      { type: 'reset' }
    );
  },

  revealAllCurrent() {
    const qIndex = currentState.currentQuestionIndex;
    updateState(
      (prev) => {
        const updatedQuestions = prev.questions.map((q, idx) => {
          if (idx !== qIndex) return q;
          return {
            ...q,
            options: q.options.map((opt) => ({ ...opt, revealed: true })),
          };
        });

        return {
          ...prev,
          questions: updatedQuestions,
          lastRevealedRank: null,
        };
      },
      { type: 'reveal', points: 100 }
    );
  },

  hideAllCurrent() {
    this.resetCurrentQuestion();
  },

  navigateToQuestion(index: number) {
    const safeIndex = Math.max(0, Math.min(29, index));
    updateState((prev) => ({
      ...prev,
      currentQuestionIndex: safeIndex,
      lastRevealedRank: null,
    }));
  },

  nextQuestion() {
    if (currentState.currentQuestionIndex < 29) {
      this.navigateToQuestion(currentState.currentQuestionIndex + 1);
    }
  },

  previousQuestion() {
    if (currentState.currentQuestionIndex > 0) {
      this.navigateToQuestion(currentState.currentQuestionIndex - 1);
    }
  },

  setRoundName(title: string) {
    updateState((prev) => ({
      ...prev,
      gameTitle: title,
    }));
  },

  updateQuestionData(questionIndex: number, category: string, answers: string[]) {
    updateState((prev) => {
      const updatedQuestions = prev.questions.map((q, idx) => {
        if (idx !== questionIndex) return q;
        return {
          ...q,
          category: category.trim() || `QUESTION ${questionIndex + 1}`,
          options: q.options.map((opt, oIdx) => ({
            ...opt,
            answer: answers[oIdx] !== undefined ? answers[oIdx].trim() : opt.answer,
          })),
        };
      });

      return {
        ...prev,
        questions: updatedQuestions,
      };
    });
  },

  resetAllToDefaults() {
    updateState(
      () => ({
        gameTitle: DEFAULT_ROUND_NAME,
        currentQuestionIndex: 0,
        questions: DEFAULT_QUESTIONS,
        lastRevealedRank: null,
      }),
      { type: 'reset' }
    );
  },
};
