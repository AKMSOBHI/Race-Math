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
  gameOverReason: 'time' | 'completed' | 'failed' | 'cancelled' | null;
  finalScore: number | null | undefined;
  isTimeUp: boolean;
  
  setShowStartModal: (show: boolean) => void;
  setShowCorrectModal: (show: boolean) => void;
  setShowIncorrectModal: (show: boolean) => void;
  setShowStageCompleteModal: (show: boolean) => void;
  setShowGameOverModal: (show: boolean, reason?: 'time' | 'completed' | 'failed' | 'cancelled' | null, finalScore?: number) => void;
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
  finalScore: null,
  isTimeUp: false,
  
  setShowStartModal: (show) => set({ showStartModal: show }),
  setShowCorrectModal: (show) => set({ showCorrectModal: show }),
  setShowIncorrectModal: (show) => set({ showIncorrectModal: show }),
  setShowStageCompleteModal: (show) => set({ showStageCompleteModal: show }),
  setShowGameOverModal: (show, reason = null, finalScore?: number) => set({ 
    showGameOverModal: show, 
    gameOverReason: reason,
    finalScore: finalScore !== undefined ? finalScore : null
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
      console.error("لا يوجد مستخدم حالي");
      return;
    }
    
    set({ isLoading: true });
    
    console.log('إرسال رسالة إنشاء اللعبة:', {
      isMultiplayer,
      maxPlayers,
      playerId: currentUser.id
    });
    
    // أولاً نرسل رسالة إنشاء اللعبة
    sendMessage({
      type: 'create_game',
      payload: {
        isMultiplayer,
        maxPlayers,
        playerId: currentUser.id
      }
    });
    
    // زيادة وقت الانتظار للتأكد من استلام رد من الخادم
    setTimeout(() => {
      const state = get();
      if (state.currentGame) {
        console.log('الانضمام تلقائياً للعبة التي تم إنشاؤها:', state.currentGame.id);
        
        // التأكد من أن اللاعب الحالي هو نفسه
        if (currentUser && currentUser.id) {
          sendMessage({
            type: 'join_game',
            payload: {
              gameId: state.currentGame.id,
              playerId: currentUser.id
            }
          });
          
          // بعد الانضمام للعبة، نتأكد من أن اللاعب أصبح مسجلاً قبل بدء اللعبة
          setTimeout(() => {
            const newState = get();
            if (newState.currentGame && state.currentGame && newState.currentGame.id === state.currentGame.id) {
              // نتحقق من أن اللاعب مسجل في اللعبة قبل بدئها
              const isPlayerRegistered = newState.currentGame.players.some(p => p.id === currentUser.id);
              
              if (!isPlayerRegistered) {
                console.log('اللاعب غير مسجل في اللعبة، محاولة إعادة الانضمام...');
                // محاولة إعادة الانضمام مرة أخرى
                sendMessage({
                  type: 'join_game',
                  payload: {
                    gameId: newState.currentGame.id,
                    playerId: currentUser.id
                  }
                });
                
                // ننتظر فترة أطول قبل بدء اللعبة للتأكد من تسجيل اللاعب
                setTimeout(() => {
                  const finalState = get();
                  if (finalState.currentGame && finalState.currentGame.id === newState.currentGame?.id) {
                    console.log('بدء اللعبة التي تم إنشاؤها تلقائياً:', finalState.currentGame.id);
                    set({ isLoading: true });
                    sendMessage({
                      type: 'start_game',
                      payload: {
                        gameId: finalState.currentGame.id,
                        difficulty: 'easy'
                      }
                    });
                  }
                }, 800);
              } else {
                // اللاعب مسجل بالفعل، يمكننا بدء اللعبة
                console.log('اللاعب مسجل بنجاح، بدء اللعبة:', newState.currentGame.id);
                set({ isLoading: true });
                sendMessage({
                  type: 'start_game',
                  payload: {
                    gameId: newState.currentGame.id,
                    difficulty: 'easy'
                  }
                });
              }
            }
          }, 800);
        }
      }
    }, 800);
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
      showIncorrectModal: false,
      showStageCompleteModal: false // إخفاء نافذة إكمال المرحلة
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
    console.log('إعادة ضبط حالة اللعبة بالكامل...');
    
    // الحصول على معرف اللعبة الحالية قبل إعادة الضبط
    const currentGameId = get().currentGame?.id;
    
    // مسح بيانات الإجابات من localStorage إذا وجدت
    try {
      if (currentGameId) {
        console.log('مسح بيانات الإجابات من localStorage:', currentGameId);
        localStorage.removeItem(`game_answers_${currentGameId}`);
      }
      
      // مسح جميع مفاتيح localStorage المتعلقة بإجابات الألعاب
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('game_answers_')) {
          console.log('مسح بيانات اللعبة القديمة:', key);
          localStorage.removeItem(key);
        }
      }
    } catch (e) {
      console.error('خطأ في مسح بيانات localStorage:', e);
    }
    
    // إيقاف الموسيقى الخلفية للعبة
    try {
      const { soundService } = require('../soundService');
      console.log('إيقاف الموسيقى الخلفية...');
      soundService.stopBackgroundMusic();
      soundService.stopAll();
    } catch (error) {
      console.error('خطأ في إيقاف الموسيقى:', error);
    }
    
    // إعادة ضبط جميع متغيرات الحالة
    set({
      currentGame: null,
      currentQuestion: null,
      showStartModal: true,
      showCorrectModal: false,
      showIncorrectModal: false,
      showStageCompleteModal: false,
      showGameOverModal: false,
      gameOverReason: null,
      finalScore: null,
      isTimeUp: false,
      lastAnswerResult: null,
      isLoading: false
    });
    
    console.log('تمت إعادة ضبط حالة اللعبة بنجاح!');
  },
  
  // WebSocket message handler
  handleServerMessage: (message) => {
    const { currentUser } = get();
    
    switch (message.type) {
      case 'game_state_update':
        // تحديث حالة اللعبة وإعادة ضبط حالة المؤقت عند الحاجة
        console.log('Recibido mensaje game_state_update:', message.payload);
        
        const payload = message.payload;
        if (!payload) {
          console.error('Error: game_state_update recibido con payload nulo');
          set({ isLoading: false });
          break;
        }
        
        // En lugar de ignorar las preguntas en modo 'waiting',
        // verificamos si realmente hay preguntas y las usamos si existen
        if (payload.status === 'waiting' && (!Array.isArray(payload.questions) || payload.questions.length === 0)) {
          console.log('Juego en modo espera sin preguntas');
          set({
            currentGame: payload,
            isLoading: false
          });
          break;
        }
        
        // Si estamos en modo 'waiting' pero tenemos preguntas, continuamos con el proceso normal
        
        // Verificar que hay preguntas válidas
        if (!Array.isArray(payload.questions) || payload.questions.length === 0) {
          console.error('Error: juego activo recibido sin preguntas válidas', payload);
          set({
            currentGame: payload,
            isLoading: false,
            showStartModal: true  // Mostrar el modal para que el usuario pueda volver a intentar
          });
          break;
        }
        
        const currentGameState = get().currentGame;
        
        // إذا انتقلنا إلى مرحلة جديدة أو سؤال جديد
        const isNewStage = currentGameState && payload && currentGameState.stage !== payload.stage;
        const isNewQuestion = currentGameState && payload && 
                             (currentGameState.currentQuestionIndex !== payload.currentQuestionIndex);
        
        // Obtener el índice seguro
        const safeQuestionIndex = Math.min(payload.currentQuestionIndex || 0, payload.questions.length - 1);
        const updateQuestionData = payload.questions[safeQuestionIndex];
        
        console.log('Actualizando estado con pregunta:', updateQuestionData);
        
        set({ 
          currentGame: payload,
          currentQuestion: updateQuestionData,
          isLoading: false,
          // إعادة ضبط مؤقت الوقت عند الانتقال إلى مرحلة أو سؤال جديد
          isTimeUp: isNewStage || isNewQuestion ? false : get().isTimeUp
        });
        break;
        
      case 'game_started':
        console.log('Recibido mensaje game_started:', message.payload);
        
        // Verificar que los datos son válidos
        const gameData = message.payload;
        if (!gameData) {
          console.error('Error: game_started recibido con datos nulos');
          set({ isLoading: false });
          break;
        }
        
        // Si el juego no tiene preguntas o está vacío, mostrar error pero mantener el modal abierto
        if (!Array.isArray(gameData.questions) || gameData.questions.length === 0) {
          console.error('Error: game_started recibido sin preguntas válidas', gameData);
          
          // Mensaje para consola de depuración
          console.log('Juego sin preguntas, probablemente un error en la generación');
          
          // Actualizamos el estado pero mantenemos el modal abierto
          set({ 
            currentGame: gameData,
            isLoading: false,
            showStartModal: true  // Mantenemos el modal abierto para reintentar
          });
          
          import('../soundService').then(({ soundService }) => {
            if (get().isSoundEnabled) {
              soundService.play('wrong'); // cambiado de 'error' a 'wrong'
            }
          });
          
          break;
        }
        
        const gameQuestionIndex = gameData.currentQuestionIndex || 0;
        const gameQuestionData = gameData.questions[gameQuestionIndex];
        
        console.log('Juego iniciado con pregunta:', gameQuestionData);
        
        set({ 
          currentGame: gameData,
          currentQuestion: gameQuestionData,
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
