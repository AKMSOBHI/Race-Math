import { useEffect, useState } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useWebSocket } from '@/lib/websocket';
import { useGameStore } from '@/lib/game/gameState';
import NavigationBar from '@/components/Layout/NavigationBar';
import Octopus from '@/components/GameUI/Octopus';
import Bubble from '@/components/GameUI/Bubble';
import Timer from '@/components/GameUI/Timer';
import PlayerScoreboard from '@/components/GameUI/PlayerScoreboard';
import CorrectAnswerModal from '@/components/Modals/CorrectAnswerModal';
import IncorrectAnswerModal from '@/components/Modals/IncorrectAnswerModal';
import StageCompleteModal from '@/components/Modals/StageCompleteModal';
import { formatStageName, generateWrongAnswers, getRandomBubblePosition } from '@/lib/game/questions';
import { useToast } from '@/hooks/use-toast';

export default function Game() {
  const [_, navigate] = useLocation();
  const [match, params] = useRoute<{ gameId: string }>('/game/:gameId');
  const gameId = match && params ? params.gameId : '';
  const { toast } = useToast();
  
  const { 
    currentGame, 
    currentUser,
    currentQuestion,
    joinGame,
    submitAnswer,
    handleServerMessage,
    showCorrectModal,
    showIncorrectModal,
    showStageCompleteModal
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
  }, [gameId, currentUser, currentGame, joinGame]);
  
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
  
  // Generate bubble positions when question changes
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
  }, [currentQuestion]);
  
  // Handle bubble click / answer submission
  const handleAnswerSubmit = (answer: number) => {
    if (!currentGame) return;
    
    submitAnswer(currentGame.id, answer);
  };
  
  // Get current player from game state
  const currentPlayer = currentGame?.players.find(
    p => currentUser && p.id === currentUser.id
  );
  
  // Get wrong answers
  let answers: number[] = [];
  if (currentQuestion) {
    const wrongAnswers = generateWrongAnswers(currentQuestion.answer);
    answers = [...wrongAnswers, currentQuestion.answer].sort(() => Math.random() - 0.5);
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
          <p className="text-xl space-title">Preparing mission control...</p>
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
      <div className="container mx-auto px-4 py-6 relative pb-24">
        {/* Game Header */}
        <div className="flex flex-wrap justify-between items-center mb-6 px-3">
          <div className="w-full md:w-auto mb-4 md:mb-0">
            <div className="space-container rounded-lg p-3 shadow-lg">
              <p className="text-lg font-semibold" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                Mission: <span style={{ color: 'var(--space-bright)' }}>{formatStageName(currentGame.stage)}</span>
              </p>
              <p className="text-sm">
                Equation <span>{currentGame.currentQuestionIndex + 1}</span> of {currentGame.questions.length}
              </p>
            </div>
          </div>
          
          <div className="w-full md:w-2/3">
            <div className="space-container rounded-lg p-2 shadow-lg">
              <p className="text-center mb-1 text-sm">Oxygen Remaining</p>
              <Timer />
            </div>
          </div>
          
          <div className="w-full md:w-auto mt-4 md:mt-0">
            <div className="space-container rounded-lg p-3 shadow-lg">
              <p className="text-lg font-semibold" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                Score: <span style={{ color: 'var(--space-bright)' }}>{currentPlayer.score}</span>
              </p>
              <p className="text-sm">
                Shields: <span>{currentPlayer.attemptsLeft}</span>
              </p>
            </div>
          </div>
        </div>
        
        {/* Game Area - New Layout */}
        <div className="flex flex-col space-y-4">
          {/* Question Section */}
          <div className="w-full p-4 space-container rounded-xl shadow-lg text-center">
            <h3 className="text-lg md:text-xl font-bold mb-2" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              أجب على السؤال التالي:
            </h3>
            <div 
              className="text-xl md:text-3xl font-bold p-5 rounded-lg flex justify-center items-center"
              style={{
                background: 'linear-gradient(135deg, rgba(123, 44, 191, 0.8), rgba(58, 12, 163, 0.8))',
                border: '2px solid var(--space-bright)',
                boxShadow: '0 0 15px rgba(0, 245, 212, 0.5)',
                minHeight: '80px'
              }}
            >
              {currentQuestion.text}
            </div>
          </div>
          
          {/* Character Section */}
          <div className="relative h-[150px] md:h-[200px] w-full overflow-hidden">
            <Octopus mood={octopusMood} />
          </div>
          
          {/* Answer Options Section */}
          <div className="grid grid-cols-2 gap-4 w-full">
            {answers.slice(0, 4).map((answer, index) => (
              index > 0 && 
              <button
                key={index}
                className="answer-bubble p-5 rounded-xl font-bold text-lg md:text-2xl transition-all transform hover:scale-105 relative"
                style={{
                  background: 'linear-gradient(45deg, rgba(123, 44, 191, 0.8), rgba(36, 0, 70, 0.8))',
                  border: '2px solid var(--space-bright)',
                  boxShadow: '0 0 15px var(--space-bright)',
                  fontFamily: 'Orbitron, sans-serif',
                  minHeight: '70px'
                }}
                onClick={() => handleAnswerSubmit(answer)}
              >
                {/* Circle with answer number */}
                <div 
                  className="absolute -top-2 -left-2 w-8 h-8 rounded-full flex items-center justify-center"
                  style={{
                    background: 'var(--space-pink)',
                    border: '1px solid var(--space-bright)',
                    boxShadow: '0 0 8px var(--space-bright)',
                    fontSize: '0.9rem'
                  }}
                >
                  {index}
                </div>
                {answer.toString()}
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
    </div>
  );
}
