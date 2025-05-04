import React, { useEffect, useState, useRef } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useWebSocket } from '@/lib/websocket';
import { useGameStore } from '@/lib/game/gameState';
import { NavigationBar } from '@/components/Layout/NavigationBar';
import Octopus from '@/components/GameUI/Octopus';
import Bubble from '@/components/GameUI/Bubble';
import Timer from '@/components/GameUI/Timer';
import PlayerScoreboard from '@/components/GameUI/PlayerScoreboard';
import CorrectAnswerModal from '@/components/Modals/CorrectAnswerModal';
import IncorrectAnswerModal from '@/components/Modals/IncorrectAnswerModal';
import StageCompleteModal from '@/components/Modals/StageCompleteModal';
import GameOverModal from '@/components/Modals/GameOverModal';
import { formatStageName, generateWrongAnswers, getRandomBubblePosition } from '@/lib/game/questions';
import { useToast } from '@/hooks/use-toast';
import { convertToArabicNumerals } from '@/lib/utils';
import { soundService } from '@/lib/soundService';

export default function Game() {
  const [_, navigate] = useLocation();
  const [match, params] = useRoute<{ gameId: string }>('/game/:gameId');
  const gameId = match && params ? params.gameId : '';
  const { toast } = useToast();
  
  // مترجم للمراحل
  const stageTranslation: Record<string, string> = {
    'ADDITION': 'الجمع',
    'SUBTRACTION': 'الطرح',
    'MULTIPLICATION': 'الضرب',
    'DIVISION': 'القسمة'
  };
  
  const { 
    currentGame, 
    currentUser,
    currentQuestion,
    joinGame,
    submitAnswer,
    handleServerMessage,
    showCorrectModal,
    showIncorrectModal,
    showStageCompleteModal,
    showGameOverModal,
    gameOverReason,
    isTimeUp,
    setIsTimeUp,
    setShowGameOverModal,
    isSoundEnabled
  } = useGameStore();
  
  const { addMessageListener } = useWebSocket();
  
  // State for bubble positions
  const [bubblePositions, setBubblePositions] = useState<{ top: string; left: string }[]>([]);
  
  // State for octopus face
  const [octopusMood, setOctopusMood] = useState<'neutral' | 'happy' | 'sad'>('neutral');
  
  // Join the game when component mounts
  useEffect(() => {
    if (!currentGame && gameId && currentUser) {
      joinGame(gameId);
    }
    
    // تشغيل الموسيقى الخلفية عند بدء اللعبة
    if (isSoundEnabled) {
      console.log('تشغيل الموسيقى الخلفية...');
      soundService.playBackgroundMusic();
      
      // تشغيل صوت ترحيبي
      setTimeout(() => {
        soundService.play('success');
      }, 500);
    }
    
    return () => {
      // إيقاف الموسيقى الخلفية عند الخروج من اللعبة
      console.log('إيقاف الموسيقى الخلفية...');
      soundService.stopBackgroundMusic();
    };
  }, [gameId, currentUser, currentGame, joinGame, isSoundEnabled]);
  
  // Listen to WebSocket messages
  useEffect(() => {
    const removeListener = addMessageListener((message) => {
      handleServerMessage(message);
      
      if (message.type === 'answer_result') {
        if (currentUser && message.payload.playerId === currentUser.id) {
          setOctopusMood(message.payload.correct ? 'happy' : 'sad');
          
          // Reset octopus face after 2 seconds
          setTimeout(() => {
            setOctopusMood('neutral');
          }, 2000);
        }
      }
    });
    
    return () => {
      removeListener();
    };
  }, [addMessageListener, handleServerMessage, currentUser]);
  
  // Navigate back to home if no game
  useEffect(() => {
    if (!gameId) {
      navigate('/');
    }
  }, [gameId, navigate]);
  
  // Generate bubble positions and answers when question changes
  useEffect(() => {
    if (currentQuestion) {
      // Generate positions for the bubbles (question + 3 answers = 4 total)
      const positions = [];
      for (let i = 0; i < 4; i++) {
        positions.push(getRandomBubblePosition());
      }
      
      // Make sure we always have enough positions even if the array is not filled
      while (positions.length < 4) {
        positions.push({ top: '50%', left: '50%' });
      }
      
      setBubblePositions(positions);
      
      // Debug
      console.log('Generated bubble positions:', positions);
    }
  }, [currentQuestion?.id]); // تغيير التبعية إلى معرف السؤال بدلاً من كامل السؤال
  
  // Handle bubble click / answer submission
  const handleAnswerSubmit = (answer: number) => {
    if (!currentGame || isTimeUp) {
      console.log('لا يمكن إرسال الإجابة: اللعبة غير نشطة أو انتهى الوقت');
      return;
    }
    
    // نتجاهل التحقق من حالة اللعبة لتجنب المشكلة الحالية
    // حتى وإن كانت بحالة 'waiting' نسمح بإرسال الإجابة
    // في المستقبل يمكن إعادة تفعيل هذا التحقق بعد إصلاح المشكلة في الخادم
    /*
    if (currentGame.status !== 'active') {
      console.log('لا يمكن إرسال الإجابة: اللعبة ليست في حالة نشطة', currentGame.status);
      return;
    }
    */
    
    // تشغيل صوت النقر
    if (isSoundEnabled) {
      soundService.play('click');
    }
    
    console.log('إرسال الإجابة:', answer);
    submitAnswer(currentGame.id, answer);
  };
  
  // Get current player from game state
  const currentPlayer = currentGame?.players.find(
    p => currentUser && p.id === currentUser.id
  );
  
  // مستوى المكون - استخدام localStorage لتخزين الإجابات بين عمليات التحديث
  const [questionsAnswers, setQuestionsAnswers] = useState<Record<string, number[]>>(() => {
    // محاولة استرجاع الإجابات من localStorage عند بدء المكون
    try {
      const savedAnswers = localStorage.getItem(`game_answers_${gameId}`);
      return savedAnswers ? JSON.parse(savedAnswers) : {};
    } catch (error) {
      console.error('خطأ في استرجاع الإجابات من localStorage:', error);
      return {};
    }
  });
  
  // حفظ الإجابات في localStorage عند تغييرها
  useEffect(() => {
    try {
      if (Object.keys(questionsAnswers).length > 0 && gameId) {
        console.log('حفظ الإجابات في localStorage');
        localStorage.setItem(`game_answers_${gameId}`, JSON.stringify(questionsAnswers));
      }
    } catch (error) {
      console.error('خطأ في حفظ الإجابات في localStorage:', error);
    }
  }, [questionsAnswers, gameId]);
  
  // Get answer options including the correct one
  let answers: number[] = [];
  
  // توليد الإجابات فقط عندما يتغير السؤال وتخزينها في حالة المكون
  useEffect(() => {
    if (currentQuestion && !questionsAnswers[currentQuestion.id]) {
      console.log('توليد إجابات جديدة للسؤال:', currentQuestion.id);
      
      // تأكد من أن الجواب الصحيح دائماً موجود
      const newAnswers = [currentQuestion.answer];
      
      // إضافة إجابات خاطئة متنوعة
      const wrongAnswers = generateWrongAnswers(currentQuestion.answer);
      newAnswers.push(...wrongAnswers);
      
      // عدد ثابت من الإجابات (4)
      while (newAnswers.length < 4) {
        // إضافة إجابات إضافية إذا لم يكن هناك ما يكفي
        const randomOffset = Math.floor(Math.random() * 10) + 5;
        const extraWrong = currentQuestion.answer + (Math.random() > 0.5 ? randomOffset : -randomOffset);
        
        if (!newAnswers.includes(extraWrong) && extraWrong > 0) {
          newAnswers.push(extraWrong);
        }
      }
      
      // تأكد من أن لديك بالضبط 4 إجابات
      const slicedAnswers = newAnswers.slice(0, 4);
      
      // خلط الإجابات بشكل عشوائي
      slicedAnswers.sort(() => Math.random() - 0.5);
      
      // تخزين الإجابات في حالة المكون وفي localStorage
      setQuestionsAnswers(prev => {
        const newState = {
          ...prev,
          [currentQuestion.id]: slicedAnswers
        };
        // محاولة حفظ الإجابات في localStorage فوراً
        try {
          if (gameId) {
            localStorage.setItem(`game_answers_${gameId}`, JSON.stringify(newState));
          }
        } catch (e) {
          console.error('خطأ في حفظ الإجابات في localStorage:', e);
        }
        return newState;
      });
      
      console.log('الإجابة الصحيحة:', currentQuestion.answer);
      console.log('جميع الإجابات:', slicedAnswers);
    }
  }, [currentQuestion?.id, questionsAnswers, gameId]); // إضافة gameId للتبعيات
  
  // مسح الإجابات عند الخروج من المكون
  useEffect(() => {
    return () => {
      // مسح الإجابات من localStorage عند الخروج من المكون
      try {
        if (gameId) {
          localStorage.removeItem(`game_answers_${gameId}`);
        }
      } catch (error) {
        console.error('خطأ في مسح الإجابات من localStorage:', error);
      }
    };
  }, [gameId]);
  
  // استخدام الإجابات المخزنة في حالة المكون (أكثر ثباتاً)
  if (currentQuestion && questionsAnswers[currentQuestion.id]) {
    answers = questionsAnswers[currentQuestion.id];
    console.log('استخدام الإجابات المخزنة للسؤال:', currentQuestion.id, answers);
  } else if (currentQuestion) {
    // إذا لم تكن الإجابات متوفرة بعد، نستخدم الإجابة الصحيحة فقط بشكل مؤقت
    answers = [currentQuestion.answer];
    console.log('لم يتم العثور على إجابات مخزنة للسؤال:', currentQuestion.id);
  }
  
  if (!currentGame || !currentQuestion || !currentPlayer) {
    return (
      <div className="min-h-screen w-full text-white flex items-center justify-center">
        <div className="space-bg">
          <div className="stars"></div>
          <div className="planet planet-1"></div>
          <div className="planet planet-2"></div>
        </div>
        <div className="text-center z-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <p className="text-xl space-title" style={{ fontFamily: 'Orbitron, sans-serif' }}>جاري تحضير مهمتك...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen w-full text-white relative pb-20 overflow-auto">
      {/* Space background */}
      <div className="space-bg">
        <div className="stars"></div>
        <div className="planet planet-1"></div>
        <div className="planet planet-2"></div>
        <div className="planet planet-3"></div>
      </div>
      
      {/* Navigation */}
      <NavigationBar />
      
      {/* Main game container */}
      <div className="container mx-auto px-3 py-4 relative pb-16">
        {/* Game Header */}
        <div className="flex flex-col space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <div className="game-stage-indicator p-2 rounded-lg font-bold text-xs md:text-sm" 
                style={{ 
                  background: 'linear-gradient(135deg, rgba(123, 44, 191, 0.9), rgba(36, 0, 70, 0.9))',
                  border: '2px solid var(--space-bright)',
                  boxShadow: '0 0 10px var(--space-bright)',
                  fontFamily: 'Orbitron, sans-serif'
                }}>
                المرحلة: {stageTranslation[currentGame.stage]}
              </div>
              <div className="game-progress p-2 rounded-lg font-bold text-xs md:text-sm flex items-center space-x-1"
                style={{ 
                  background: 'linear-gradient(135deg, rgba(123, 44, 191, 0.9), rgba(36, 0, 70, 0.9))',
                  border: '2px solid var(--space-bright)',
                  boxShadow: '0 0 10px var(--space-bright)',
                  fontFamily: 'Orbitron, sans-serif',
                  direction: 'ltr'
                }}>
                <span className="block">{convertToArabicNumerals(currentGame.currentQuestionIndex + 1)}/{convertToArabicNumerals(currentGame.questions.length)}</span>
              </div>
            </div>
            
            <div className="game-score p-2 rounded-lg font-bold text-xs md:text-sm"
              style={{ 
                background: 'linear-gradient(135deg, rgba(123, 44, 191, 0.9), rgba(36, 0, 70, 0.9))',
                border: '2px solid var(--space-bright)',
                boxShadow: '0 0 10px var(--space-bright)',
                fontFamily: 'Orbitron, sans-serif'
              }}>
              النقاط: {convertToArabicNumerals(currentPlayer?.score)}
            </div>
          </div>
          
          {/* Timer */}
          <Timer 
            duration={30} 
            onTimeEnd={() => {
              console.log('Timer ended, showing game over modal');
              // إذا لم تكن نافذة انتهاء اللعبة معروضة بالفعل، نعرضها
              if (!showGameOverModal) {
                setIsTimeUp(true);
                setShowGameOverModal(true, 'time');
              }
            }} 
          />
        </div>
        
        {/* Game Area - New Layout */}
        <div className="flex flex-col space-y-3 bg-gradient-to-br from-purple-900/50 to-indigo-900/50 rounded-2xl p-3" 
          style={{ 
            border: '3px solid var(--space-bright)',
            boxShadow: '0 0 15px rgba(0, 245, 212, 0.4)',
          }}>
          {/* Question Section */}
          <div className="w-full p-3 rounded-xl text-center">
            <h3 className="text-md md:text-lg font-bold mb-2" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              أجب على السؤال التالي:
            </h3>
            <div 
              className="text-xl md:text-3xl font-bold p-4 rounded-xl flex justify-center items-center"
              style={{
                background: 'linear-gradient(135deg, rgba(123, 44, 191, 0.9), rgba(58, 12, 163, 0.9))',
                border: '2px solid var(--space-bright)',
                boxShadow: '0 0 12px rgba(0, 245, 212, 0.5)',
                minHeight: '65px'
              }}
            >
              {currentQuestion.text.replace(/[0-9]/g, (match) => convertToArabicNumerals(match))}
            </div>
          </div>
          
          {/* Character Section */}
          <div className="relative h-[120px] md:h-[140px] w-full overflow-visible pt-5 pb-2">
            <Octopus mood={octopusMood} />
          </div>
          
          {/* Answer Options Section */}
          <div className="grid grid-cols-2 gap-3 w-full">
            {answers.slice(0, 4).map((answer, index) => (
              <button
                key={index}
                className="answer-bubble p-4 rounded-xl font-bold text-lg md:text-xl transition-all transform hover:scale-105 relative"
                style={{
                  background: 'linear-gradient(45deg, rgba(123, 44, 191, 0.9), rgba(36, 0, 70, 0.9))',
                  border: '2px solid var(--space-bright)',
                  boxShadow: '0 0 10px var(--space-bright)',
                  fontFamily: 'Orbitron, sans-serif',
                  minHeight: '55px'
                }}
                onClick={() => handleAnswerSubmit(answer)}
              >
                {/* Circle with answer number */}
                <div 
                  className="absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center text-sm"
                  style={{
                    background: 'var(--space-pink)',
                    border: '1px solid var(--space-bright)',
                    boxShadow: '0 0 8px var(--space-bright)'
                  }}
                >
                  {convertToArabicNumerals(index + 1)}
                </div>
                {convertToArabicNumerals(answer)}
              </button>
            ))}
          </div>
        </div>
        
        {/* Player Scoreboard */}
        {currentGame.isMultiplayer && (
          <div className="mt-4 space-container p-3 rounded-lg">
            <PlayerScoreboard 
              players={currentGame.players} 
              currentPlayerId={currentUser?.id} 
            />
          </div>
        )}
      </div>
      
      {/* Modals */}
      {showCorrectModal && <CorrectAnswerModal />}
      {showIncorrectModal && <IncorrectAnswerModal />}
      {showStageCompleteModal && <StageCompleteModal />}
      {showGameOverModal && <GameOverModal reason={gameOverReason || 'time'} finalScore={currentPlayer?.score} />}
    </div>
  );
}
