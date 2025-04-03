import { FC, useEffect } from 'react';
import { useGameStore } from '@/lib/game/gameState';
import { useLocation } from 'wouter';
import { soundService } from '@/lib/soundService';

interface GameOverModalProps {
  reason: 'time' | 'completed' | 'failed';
  finalScore?: number;
}

const GameOverModal: FC<GameOverModalProps> = ({ reason, finalScore = 0 }) => {
  const [_, navigate] = useLocation();
  const { resetGameState, isSoundEnabled } = useGameStore();
  
  // تشغيل صوت انتهاء اللعبة عند ظهور النافذة
  useEffect(() => {
    if (isSoundEnabled) {
      soundService.play('gameOver');
    }
  }, [isSoundEnabled]);
  
  // Get title and message based on reason
  const getContent = () => {
    switch (reason) {
      case 'time':
        return {
          title: 'انتهى الوقت!',
          message: 'لقد انتهى الوقت المخصص للإجابة على السؤال.',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          color: '#ef4444'
        };
      case 'completed':
        return {
          title: 'أحسنت!',
          message: 'لقد أكملت جميع المراحل بنجاح!',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          color: '#10b981'
        };
      case 'failed':
        return {
          title: 'انتهت اللعبة!',
          message: 'لقد استنفذت جميع المحاولات الخاصة بك.',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          color: '#ef4444'
        };
      default:
        return {
          title: 'انتهت اللعبة',
          message: 'شكراً للعب معنا!',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          color: '#6d28d9'
        };
    }
  };
  
  const content = getContent();
  
  const handlePlayAgain = () => {
    // تشغيل صوت النقر
    if (isSoundEnabled) {
      soundService.play('click');
    }
    
    // Reset game state and close modal
    resetGameState();
    navigate('/');
  };
  
  const handleExit = () => {
    // تشغيل صوت النقر
    if (isSoundEnabled) {
      soundService.play('click');
    }
    
    // Reset game state and navigate to home
    resetGameState();
    navigate('/');
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
              background: `linear-gradient(45deg, ${content.color}, ${content.color}dd)`,
              boxShadow: `0 0 20px ${content.color}`,
              border: `2px solid ${content.color}88`
            }}
          >
            {content.icon}
          </div>
        </div>
        
        <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Orbitron, sans-serif' }}>
          {content.title}
        </h2>
        
        <p className="text-lg mb-3">
          {content.message}
        </p>
        
        <div className="text-xl font-bold mb-5" style={{ fontFamily: 'Orbitron, sans-serif' }}>
          النقاط النهائية: {finalScore}
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <button 
            className="font-bold py-3 px-4 rounded-lg transition"
            onClick={handlePlayAgain}
            style={{
              background: 'linear-gradient(45deg, #10b981, #059669)',
              border: '2px solid #34d399',
              boxShadow: '0 0 15px rgba(16, 185, 129, 0.5)'
            }}
          >
            لعب مرة أخرى
          </button>
          
          <button 
            className="font-bold py-3 px-4 rounded-lg transition"
            onClick={handleExit}
            style={{
              background: 'linear-gradient(45deg, #6d28d9, #4c1d95)',
              border: '2px solid #8b5cf6',
              boxShadow: '0 0 15px rgba(139, 92, 246, 0.5)'
            }}
          >
            الخروج
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameOverModal;