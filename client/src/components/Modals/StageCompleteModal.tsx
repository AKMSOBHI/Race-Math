import { FC } from 'react';
import { useGameStore } from '@/lib/game/gameState';
import { formatStageName } from '@/lib/game/questions';

const StageCompleteModal: FC = () => {
  const { 
    currentGame, 
    currentUser,
    setShowStageCompleteModal,
    nextStage
  } = useGameStore();
  
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
    
    setShowStageCompleteModal(false);
    nextStage(currentGame.id);
  };
  
  const maxPossibleScore = 5 * 3; // 5 questions × 3 points max
  const score = currentPlayer?.score || 0;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white text-deep-blue rounded-xl p-6 max-w-md w-full mx-4 text-center">
        <div className="mb-4">
          <div className="w-24 h-24 bg-seaweed rounded-full flex items-center justify-center mx-auto">
            <i className="fas fa-trophy text-white text-5xl"></i>
          </div>
        </div>
        <h2 className="text-3xl font-bubblegum mb-2">Stage Complete!</h2>
        <p className="text-xl mb-6">
          You scored <span className="font-bold">{score}/{maxPossibleScore}</span> points
        </p>
        
        <div className="bg-gray-100 p-4 rounded-lg mb-6">
          <h3 className="font-bold mb-2">Next Stage:</h3>
          <p className="text-2xl font-bubblegum text-ocean-blue">{nextStageName}</p>
        </div>
        
        <button 
          className="bg-seaweed text-white font-bold py-3 px-6 rounded-lg hover:bg-opacity-90 transition"
          onClick={handleNextStage}
        >
          Continue to Next Stage
        </button>
      </div>
    </div>
  );
};

export default StageCompleteModal;
