import { create } from 'zustand';
import { GameSession, Player, Question, ServerMessage, ClientMessage, User } from '@shared/schema';
import { sendMessage } from '../websocket';

interface GameState {
  // Auth
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  
  // Active Game
  currentGame: GameSession | null;
  setCurrentGame: (game: GameSession | null) => void;
  
  // Game state
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  
  // Current question
  currentQuestion: Question | null;
  
  // Sound settings
  isSoundEnabled: boolean;
  toggleSound: () => void;
  
  // Modal states
  showStartModal: boolean;
  showCorrectModal: boolean;
  showIncorrectModal: boolean;
  showStageCompleteModal: boolean;
  
  setShowStartModal: (show: boolean) => void;
  setShowCorrectModal: (show: boolean) => void;
  setShowIncorrectModal: (show: boolean) => void;
  setShowStageCompleteModal: (show: boolean) => void;
  
  // Game actions
  joinGame: (gameId: string) => void;
  createGame: (isMultiplayer: boolean, maxPlayers: number) => void;
  startGame: (gameId: string, difficulty?: "easy" | "medium" | "hard") => void;
  submitAnswer: (gameId: string, answer: number) => void;
  nextQuestion: (gameId: string) => void;
  nextStage: (gameId: string) => void;
  
  // Handle WebSocket messages
  handleServerMessage: (message: ServerMessage) => void;
  
  // Last answer result
  lastAnswerResult: { correct: boolean; points: number } | null;
  setLastAnswerResult: (result: { correct: boolean; points: number } | null) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  // Auth
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),
  
  // Active Game
  currentGame: null,
  setCurrentGame: (game) => {
    set({ 
      currentGame: game,
      currentQuestion: game ? game.questions[game.currentQuestionIndex] : null
    });
  },
  
  // Game state
  isLoading: false,
  setLoading: (loading) => set({ isLoading: loading }),
  
  // Current question
  currentQuestion: null,
  
  // Sound settings
  isSoundEnabled: true,
  toggleSound: () => set((state) => ({ isSoundEnabled: !state.isSoundEnabled })),
  
  // Modal states
  showStartModal: true,
  showCorrectModal: false,
  showIncorrectModal: false,
  showStageCompleteModal: false,
  
  setShowStartModal: (show) => set({ showStartModal: show }),
  setShowCorrectModal: (show) => set({ showCorrectModal: show }),
  setShowIncorrectModal: (show) => set({ showIncorrectModal: show }),
  setShowStageCompleteModal: (show) => set({ showStageCompleteModal: show }),
  
  // Last answer result
  lastAnswerResult: null,
  setLastAnswerResult: (result) => set({ lastAnswerResult: result }),
  
  // Game actions
  joinGame: (gameId) => {
    const { currentUser } = get();
    
    if (!currentUser) {
      console.error("No current user");
      return;
    }
    
    sendMessage({
      type: 'join_game',
      payload: {
        gameId,
        playerId: currentUser.id
      }
    });
  },
  
  createGame: (isMultiplayer, maxPlayers) => {
    const { currentUser } = get();
    
    if (!currentUser) {
      console.error("No current user");
      return;
    }
    
    set({ isLoading: true });
    
    console.log('Sending create_game message with payload:', {
      isMultiplayer,
      maxPlayers,
      playerId: currentUser.id
    });
    
    sendMessage({
      type: 'create_game',
      payload: {
        isMultiplayer,
        maxPlayers,
        playerId: currentUser.id
      }
    });
  },
  
  startGame: (gameId, difficulty = "easy") => {
    set({ isLoading: true });
    
    sendMessage({
      type: 'start_game',
      payload: {
        gameId,
        difficulty
      }
    });
  },
  
  submitAnswer: (gameId, answer) => {
    const { currentUser } = get();
    
    if (!currentUser) {
      console.error("No current user");
      return;
    }
    
    sendMessage({
      type: 'submit_answer',
      payload: {
        gameId,
        playerId: currentUser.id,
        answer
      }
    });
  },
  
  nextQuestion: (gameId) => {
    sendMessage({
      type: 'next_question',
      payload: { gameId }
    });
  },
  
  nextStage: (gameId) => {
    sendMessage({
      type: 'next_stage',
      payload: { gameId }
    });
  },
  
  // WebSocket message handler
  handleServerMessage: (message) => {
    const { currentUser } = get();
    
    switch (message.type) {
      case 'game_state_update':
        set({ 
          currentGame: message.payload,
          currentQuestion: message.payload.questions[message.payload.currentQuestionIndex],
          isLoading: false
        });
        break;
        
      case 'game_started':
        set({ 
          currentGame: message.payload,
          currentQuestion: message.payload.questions[message.payload.currentQuestionIndex],
          isLoading: false,
          showStartModal: false
        });
        break;
        
      case 'answer_result':
        if (currentUser && message.payload.playerId === currentUser.id) {
          set({ 
            lastAnswerResult: {
              correct: message.payload.correct,
              points: message.payload.points
            }
          });
          
          if (message.payload.correct) {
            set({ showCorrectModal: true });
          } else {
            set({ showIncorrectModal: true });
          }
        }
        break;
        
      case 'stage_completed':
        set({ showStageCompleteModal: true });
        break;
        
      case 'error':
        console.error("Server error:", message.payload.message);
        break;
    }
  }
}));
