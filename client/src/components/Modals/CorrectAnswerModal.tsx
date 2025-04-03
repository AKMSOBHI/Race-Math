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
      <div 
        className="rounded-xl p-5 max-w-md w-full mx-4 text-center"
        style={{
          background: 'linear-gradient(135deg, rgba(109, 40, 217, 0.9), rgba(76, 29, 149, 0.9))',
          border: '3px solid var(--space-bright)',
          boxShadow: '0 0 20px rgba(0, 245, 212, 0.7)'
        }}
      >
        <div className="mb-4">
          <div 
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
            style={{
              background: 'linear-gradient(45deg, #10b981, #059669)',
              boxShadow: '0 0 20px #10b981',
              border: '2px solid #34d399'
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Orbitron, sans-serif' }}>
          إجابة صحيحة!
        </h2>
        <p className="text-lg mb-4">
          تم إضافة <span className="font-bold text-green-300">{points}</span> نقطة إلى مجموعك!
        </p>
        <button 
          className="font-bold py-3 px-6 rounded-lg transition w-full"
          onClick={handleNextQuestion}
          style={{
            background: 'linear-gradient(45deg, var(--space-purple), var(--space-blue))',
            border: '2px solid var(--space-bright)',
            boxShadow: '0 0 15px rgba(0, 245, 212, 0.5)'
          }}
        >
          المتابعة
        </button>
      </div>
    </div>
  );
};

export default CorrectAnswerModal;
