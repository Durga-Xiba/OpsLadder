import { useSyncExternalStore, useCallback } from 'react';
import { gameStateStore } from '../utils/gameStateStore';
import { DEFAULT_ROUND_NAME } from '../defaultQuestions';

export function useSharedGameState() {
  const gameState = useSyncExternalStore(
    gameStateStore.subscribe,
    gameStateStore.getState,
    gameStateStore.getState,
  );

  const currentQuestion = gameState.questions[gameState.currentQuestionIndex] || gameState.questions[0];

  const revealOption = useCallback((rank: number) => {
    gameStateStore.revealOption(rank);
  }, []);

  const toggleOption = useCallback((rank: number) => {
    gameStateStore.toggleOption(rank);
  }, []);

  const resetCurrentQuestion = useCallback(() => {
    gameStateStore.resetCurrentQuestion();
  }, []);

  const revealAllCurrent = useCallback(() => {
    gameStateStore.revealAllCurrent();
  }, []);

  const hideAllCurrent = useCallback(() => {
    gameStateStore.hideAllCurrent();
  }, []);

  const navigateToQuestion = useCallback((index: number) => {
    gameStateStore.navigateToQuestion(index);
  }, []);

  const nextQuestion = useCallback(() => {
    gameStateStore.nextQuestion();
  }, []);

  const previousQuestion = useCallback(() => {
    gameStateStore.previousQuestion();
  }, []);

  const setRoundName = useCallback((title: string) => {
    gameStateStore.setRoundName(title);
  }, []);

  const updateQuestionData = useCallback((questionIndex: number, category: string, answers: string[]) => {
    gameStateStore.updateQuestionData(questionIndex, category, answers);
  }, []);

  const resetAllToDefaults = useCallback(() => {
    gameStateStore.resetAllToDefaults();
  }, []);

  const registerChildWindow = useCallback((win: Window) => {
    gameStateStore.registerChildWindow(win);
  }, []);

  return {
    gameState,
    currentQuestion,
    currentQuestionIndex: gameState.currentQuestionIndex,
    gameTitle: gameState.gameTitle || DEFAULT_ROUND_NAME,
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
  };
}
