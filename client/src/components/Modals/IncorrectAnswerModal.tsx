import { FC } from 'react';
import { useGameStore } from '@/lib/game/gameState';

const IncorrectAnswerModal: FC = () => {
  const { 
    currentGame, 
    currentUser,
    setShowIncorrectModal
  } = useGameStore();
  
  // Find current player to get attempts left
  const currentPlayer = currentGame?.players.find(
    p => currentUser && p.id === currentUser.id
  );
  
  const attemptsLeft = currentPlayer?.attemptsLeft || 0;
  
  const handleContinue = () => {
    setShowIncorrectModal(false);
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white text-deep-blue rounded-xl p-6 max-w-md w-full mx-4 text-center">
        <div className="mb-4">
          <div className="w-24 h-24 bg-coral rounded-full flex items-center justify-center mx-auto">
            <i className="fas fa-times text-white text-5xl"></i>
          </div>
        </div>
        <h2 className="text-3xl font-bubblegum mb-2">Try Again!</h2>
        <p className="text-xl mb-4">
          You have <span className="font-bold">{attemptsLeft}</span> 
          {attemptsLeft === 1 ? ' attempt' : ' attempts'} left
        </p>
        <button 
          className="bg-ocean-blue text-white font-bold py-3 px-6 rounded-lg hover:bg-opacity-90 transition"
          onClick={handleContinue}
        >
          Try Again
        </button>
      </div>
    </div>
  );
};

export default IncorrectAnswerModal;
