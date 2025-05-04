import { FC, useEffect } from 'react';
import { useGameStore } from '@/lib/game/gameState';
import { soundService } from '@/lib/soundService';

const IncorrectAnswerModal: FC = () => {
  const { 
    currentGame, 
    currentUser,
    setShowIncorrectModal,
    isSoundEnabled
  } = useGameStore();
  
  // تشغيل صوت الإجابة الخاطئة عند ظهور النافذة
  useEffect(() => {
    if (isSoundEnabled) {
      soundService.play('wrong');
    }
  }, [isSoundEnabled]);
  
  // Find current player to get attempts left
  const currentPlayer = currentGame?.players.find(
    p => currentUser && p.id === currentUser.id
  );
  
  const attemptsLeft = currentPlayer?.attemptsLeft || 0;
  
  const handleContinue = () => {
    if (isSoundEnabled) {
      soundService.play('click');
    }
    setShowIncorrectModal(false);
  };
  
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
              background: 'linear-gradient(45deg, #ef4444, #b91c1c)',
              boxShadow: '0 0 20px #ef4444',
              border: '2px solid #f87171'
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        </div>
        <h2 className="text-2xl font-bold mb-2 text-red-300" style={{ fontFamily: 'Orbitron, sans-serif' }}>
          إجابة خاطئة!
        </h2>
        <p className="text-lg mb-4">
          محاولات متبقية : <span className="font-bold text-red-300">{attemptsLeft}</span>
        </p>
        <button 
          className="font-bold py-3 px-6 rounded-lg transition w-full"
          onClick={handleContinue}
          style={{
            background: 'linear-gradient(45deg, #ef4444, #b91c1c)',
            border: '2px solid #f87171',
            boxShadow: '0 0 15px rgba(239, 68, 68, 0.5)'
          }}
        >
          حاول مرة أخرى
        </button>
      </div>
    </div>
  );
};

export default IncorrectAnswerModal;
