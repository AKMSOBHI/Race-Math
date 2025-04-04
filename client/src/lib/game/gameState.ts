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
  showGameOverModal: boolean;
  gameOverReason: 'time' | 'completed' | 'failed' | null;
  isTimeUp: boolean;
  
  setShowStartModal: (show: boolean) => void;
  setShowCorrectModal: (show: boolean) => void;
  setShowIncorrectModal: (show: boolean) => void;
  setShowStageCompleteModal: (show: boolean) => void;
  setShowGameOverModal: (show: boolean, reason?: 'time' | 'completed' | 'failed' | null) => void;
  setIsTimeUp: (isTimeUp: boolean) => void;
  
  // Game actions
  joinGame: (gameId: string) => void;
  createGame: (isMultiplayer: boolean, maxPlayers: number) => void;
  startGame: (gameId: string, difficulty?: "easy" | "medium" | "hard") => void;
  submitAnswer: (gameId: string, answer: number) => void;
  nextQuestion: (gameId: string) => void;
  nextStage: (gameId: string) => void;
  resetGameState: () => void;
  
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
  showGameOverModal: false,
  gameOverReason: null,
  isTimeUp: false,
  
  setShowStartModal: (show) => set({ showStartModal: show }),
  setShowCorrectModal: (show) => set({ showCorrectModal: show }),
  setShowIncorrectModal: (show) => set({ showIncorrectModal: show }),
  setShowStageCompleteModal: (show) => set({ showStageCompleteModal: show }),
  setShowGameOverModal: (show, reason = null) => set({ 
    showGameOverModal: show, 
    gameOverReason: reason 
  }),
  setIsTimeUp: (isTimeUp) => set({ isTimeUp }),
  
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
    console.log('استدعاء دالة nextStage مع معرف اللعبة:', gameId);
    
    // إعادة ضبط حالة التطبيق عند الانتقال للمرحلة التالية
    set({
      currentQuestion: null,    // إعادة ضبط السؤال الحالي
      isTimeUp: false,          // إعادة ضبط حالة انتهاء الوقت
      showCorrectModal: false,  // إخفاء نوافذ التغذية الراجعة
      showIncorrectModal: false
    });
    
    console.log('تم إعادة ضبط حالة اللعبة');
    
    try {
      sendMessage({
        type: 'next_stage',
        payload: { gameId }
      });
      console.log('تم إرسال رسالة next_stage بنجاح');
    } catch (error) {
      console.error('خطأ عند إرسال رسالة next_stage:', error);
    }
  },
  
  resetGameState: () => {
    set({
      currentGame: null,
      currentQuestion: null,
      showStartModal: true,
      showCorrectModal: false,
      showIncorrectModal: false,
      showStageCompleteModal: false,
      showGameOverModal: false,
      gameOverReason: null,
      isTimeUp: false,
      lastAnswerResult: null,
      isLoading: false
    });
  },
  
  // WebSocket message handler
  handleServerMessage: (message) => {
    const { currentUser } = get();
    
    switch (message.type) {
      case 'game_state_update':
        // تحديث حالة اللعبة وإعادة ضبط حالة المؤقت عند الحاجة
        const payload = message.payload;
        const currentGameState = get().currentGame;
        
        // إذا انتقلنا إلى مرحلة جديدة أو سؤال جديد
        const isNewStage = currentGameState && payload && currentGameState.stage !== payload.stage;
        const isNewQuestion = currentGameState && payload && 
                             (currentGameState.currentQuestionIndex !== payload.currentQuestionIndex);
        
        set({ 
          currentGame: payload,
          currentQuestion: payload.questions[payload.currentQuestionIndex],
          isLoading: false,
          // إعادة ضبط مؤقت الوقت عند الانتقال إلى مرحلة أو سؤال جديد
          isTimeUp: isNewStage || isNewQuestion ? false : get().isTimeUp
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
        // إضافة المؤثرات الصوتية من soundService
        const { isSoundEnabled } = get();
        
        if (currentUser && message.payload.playerId === currentUser.id) {
          set({ 
            lastAnswerResult: {
              correct: message.payload.correct,
              points: message.payload.points
            }
          });
          
          // إضافة المؤثرات الصوتية
          import('../soundService').then(({ soundService }) => {
            // التأكد من تفعيل الصوت
            if (isSoundEnabled) {
              if (message.payload.correct) {
                console.log('تشغيل صوت الإجابة الصحيحة');
                soundService.play('correct');
              } else {
                console.log('تشغيل صوت الإجابة الخاطئة');
                soundService.play('wrong');
              }
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
        // إظهار نافذة إكمال المرحلة وإعادة ضبط حالة الوقت
        set({ 
          showStageCompleteModal: true,
          isTimeUp: false  // إعادة ضبط مؤقت الوقت
        });
        
        // إضافة صوت إكمال المرحلة
        import('../soundService').then(({ soundService }) => {
          if (get().isSoundEnabled) {
            console.log('تشغيل صوت إكمال المرحلة');
            soundService.play('levelComplete');
          }
        });
        break;
        
      case 'error':
        console.error("Server error:", message.payload.message);
        // Reset loading state when error occurs
        set({ isLoading: false });
        break;
    }
  }
}));
