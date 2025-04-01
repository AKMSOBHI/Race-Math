import { FC } from 'react';
import { useGameStore } from '@/lib/game/gameState';

const CorrectAnswerModal: FC = () => {
  const { 
    currentGame, 
    setShowCorrectModal, 
    nextQuestion,
    lastAnswerResult
  } = useGameStore();
  
  const handleNextQuestion = () => {
    if (!currentGame) return;
    
    setShowCorrectModal(false);
    nextQuestion(currentGame.id);
  };
  
  const points = lastAnswerResult?.points || 0;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="space-container rounded-xl p-6 max-w-md w-full mx-4 text-center">
        <div className="mb-4">
          <div 
            className="w-24 h-24 rounded-full flex items-center justify-center mx-auto"
            style={{
              background: 'linear-gradient(45deg, var(--space-bright), var(--space-purple))',
              boxShadow: '0 0 30px var(--space-bright)',
              border: '2px solid var(--space-bright)'
            }}
          >
            <i className="fas fa-check text-white text-5xl"></i>
          </div>
        </div>
        <h2 className="text-3xl space-title mb-2">Mission Successful!</h2>
        <p className="text-xl mb-4">
          <span className="font-bold text-purple-300">{points}</span> points added to your score!
        </p>
        <button 
          className="space-button font-bold py-3 px-6 rounded-lg transition"
          onClick={handleNextQuestion}
        >
          <i className="fas fa-arrow-right mr-2"></i>
          Continue Mission
        </button>
      </div>
    </div>
  );
};

export default CorrectAnswerModal;
