import { FC, useEffect } from 'react';
import { useGameStore } from '@/lib/game/gameState';
import { formatStageName } from '@/lib/game/questions';
import { soundService } from '@/lib/soundService';

const StageCompleteModal: FC = () => {
  const { 
    currentGame, 
    currentUser,
    setShowStageCompleteModal,
    nextStage,
    isSoundEnabled
  } = useGameStore();
  
  // تشغيل صوت إكمال المرحلة عند ظهور النافذة
  useEffect(() => {
    if (isSoundEnabled) {
      soundService.play('levelComplete');
    }
  }, [isSoundEnabled]);
  
  // Find current player to get score
  const currentPlayer = currentGame?.players.find(
    p => currentUser && p.id === currentUser.id
  );
  
  // Get next stage
  let nextStageName = '';
  if (currentGame) {
    switch (currentGame.stage) {
      case 'BASIC_ADDITION_SUBTRACTION':
        nextStageName = formatStageName('COMPLEX_ADDITION_SUBTRACTION');
        break;
      case 'COMPLEX_ADDITION_SUBTRACTION':
        nextStageName = formatStageName('MULTIPLICATION');
        break;
      case 'MULTIPLICATION':
        nextStageName = formatStageName('DIVISION');
        break;
      case 'DIVISION':
        nextStageName = 'Game Complete!';
        break;
    }
  }
  
  const handleNextStage = () => {
    if (!currentGame) return;
    
    if (isSoundEnabled) {
      soundService.play('click');
    }
    
    setShowStageCompleteModal(false);
    nextStage(currentGame.id);
  };
  
  const maxPossibleScore = 5 * 3; // 5 questions × 3 points max
  const score = currentPlayer?.score || 0;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="space-container rounded-xl p-6 max-w-md w-full mx-4 text-center">
        <div className="mb-4">
          <div 
            className="w-24 h-24 rounded-full flex items-center justify-center mx-auto"
            style={{
              background: 'linear-gradient(45deg, #ffd700, var(--space-bright))',
              boxShadow: '0 0 30px #ffd700',
              border: '2px solid #ffd700'
            }}
          >
            <i className="fas fa-star text-white text-5xl"></i>
          </div>
        </div>
        <h2 className="text-3xl space-title mb-2" style={{ color: '#ffd700', textShadow: '0 0 10px #ffd700' }}>
          Mission Complete!
        </h2>
        <p className="text-xl mb-6">
          Total score: <span className="font-bold text-yellow-300">{score}</span> / {maxPossibleScore}
        </p>
        
        <div 
          className="p-4 rounded-lg mb-6"
          style={{
            background: 'rgba(123, 44, 191, 0.3)',
            border: '1px solid var(--space-purple)',
            boxShadow: '0 0 15px rgba(123, 44, 191, 0.4)'
          }}
        >
          <h3 className="font-bold mb-2 text-purple-300">Next Mission:</h3>
          <p className="text-2xl space-title text-white">{nextStageName}</p>
        </div>
        
        <button 
          className="space-button text-white font-bold py-3 px-6 rounded-lg transition"
          onClick={handleNextStage}
          style={{
            background: 'linear-gradient(45deg, #ffd700, var(--space-bright))',
            boxShadow: '0 0 20px rgba(255, 215, 0, 0.5)'
          }}
        >
          <i className="fas fa-rocket mr-2"></i>
          Launch Next Mission
        </button>
      </div>
    </div>
  );
};

export default StageCompleteModal;
