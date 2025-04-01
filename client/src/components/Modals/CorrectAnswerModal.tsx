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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white text-deep-blue rounded-xl p-6 max-w-md w-full mx-4 text-center">
        <div className="mb-4">
          <div className="w-24 h-24 bg-seaweed rounded-full flex items-center justify-center mx-auto">
            <i className="fas fa-check text-white text-5xl"></i>
          </div>
        </div>
        <h2 className="text-3xl font-bubblegum mb-2">Correct!</h2>
        <p className="text-xl mb-4">You earned <span className="font-bold">{points}</span> points!</p>
        <button 
          className="bg-seaweed text-white font-bold py-3 px-6 rounded-lg hover:bg-opacity-90 transition"
          onClick={handleNextQuestion}
        >
          Next Question
        </button>
      </div>
    </div>
  );
};

export default CorrectAnswerModal;
