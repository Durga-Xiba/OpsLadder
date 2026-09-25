export interface OptionItem {
  rank: number; // 1 to 10
  points: number; // 100, 90, 80, 70, 60, 50, 40, 30, 20, 10
  answer: string;
  revealed: boolean;
}

export interface Question {
  id: number; // 1 to 30
  category: string;
  options: OptionItem[];
}

export interface GameState {
  gameTitle: string; // Round Name, defaults to "Jackpot Round"
  currentQuestionIndex: number; // 0 to 29
  questions: Question[];
  lastRevealedRank?: number | null;
  lastRevealedTime?: number;
}

export type SyncMessage =
  | { type: 'STATE_SYNC'; state: GameState }
  | { type: 'REQUEST_STATE' }
  | { type: 'REVEAL_OPTION'; questionIndex: number; rank: number }
  | { type: 'RESET_QUESTION'; questionIndex: number }
  | { type: 'NAVIGATE_QUESTION'; questionIndex: number }
  | { type: 'UPDATE_ROUND_NAME'; roundName: string }
  | { type: 'UPDATE_QUESTION_DATA'; questionIndex: number; category: string; answers: { rank: number; text: string }[] }
  | { type: 'REVEAL_ALL'; questionIndex: number }
  | { type: 'HIDE_ALL'; questionIndex: number };
