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
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="space-container rounded-xl p-6 max-w-md w-full mx-4 text-center">
        <div className="mb-4">
          <div 
            className="w-24 h-24 rounded-full flex items-center justify-center mx-auto"
            style={{
              background: 'linear-gradient(45deg, var(--space-pink), #ff0066)',
              boxShadow: '0 0 30px var(--space-pink)',
              border: '2px solid var(--space-pink)'
            }}
          >
            <i className="fas fa-exclamation-triangle text-white text-4xl"></i>
          </div>
        </div>
        <h2 className="text-3xl space-title mb-2" style={{ color: 'var(--space-pink)' }}>
          Calculation Error!
        </h2>
        <p className="text-xl mb-4">
          Shield integrity: <span className="font-bold text-pink-300">{attemptsLeft}</span> 
          {attemptsLeft === 1 ? ' point' : ' points'} remaining
        </p>
        <button 
          className="font-bold py-3 px-6 rounded-lg transition"
          onClick={handleContinue}
          style={{
            background: 'linear-gradient(45deg, #ff0066, var(--space-pink))',
            boxShadow: '0 0 15px rgba(229, 0, 164, 0.5)',
            fontFamily: 'Orbitron, sans-serif'
          }}
        >
          <i className="fas fa-sync-alt mr-2"></i>
          Recalculate
        </button>
      </div>
    </div>
  );
};

export default IncorrectAnswerModal;
