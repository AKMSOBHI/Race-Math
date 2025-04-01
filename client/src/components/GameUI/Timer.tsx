import { FC, useEffect, useState } from 'react';
import { useGameStore } from '@/lib/game/gameState';

interface TimerProps {
  duration?: number; // Duration in seconds
}

const Timer: FC<TimerProps> = ({ duration = 15 }) => {
  const [timeLeft, setTimeLeft] = useState(duration);
  const { currentGame } = useGameStore();
  
  // Reset timer when question changes
  useEffect(() => {
    setTimeLeft(duration);
  }, [currentGame?.currentQuestionIndex, duration]);
  
  // Timer countdown
  useEffect(() => {
    if (timeLeft <= 0) return;
    
    const timer = setTimeout(() => {
      setTimeLeft(timeLeft - 1);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [timeLeft]);
  
  // Calculate percentage width
  const widthPercentage = (timeLeft / duration) * 100;
  
  // Determine color based on time left
  const getTimerColor = () => {
    if (timeLeft > duration * 0.6) {
      return 'var(--space-bright)'; // Plenty of time - cyan
    } else if (timeLeft > duration * 0.3) {
      return 'var(--space-purple)'; // Medium time - purple
    } else {
      return 'var(--space-pink)'; // Running out of time - pink
    }
  };
  
  return (
    <div 
      className="rounded-full overflow-hidden" 
      style={{ 
        background: 'rgba(20, 20, 40, 0.8)',
        border: '1px solid rgba(123, 44, 191, 0.5)',
        padding: '2px'
      }}
    >
      <div 
        className="h-6 rounded-full flex items-center justify-end px-2 transition-all duration-200"
        style={{ 
          width: `${Math.max(widthPercentage, 5)}%`,
          background: `linear-gradient(to right, rgba(0,0,0,0.2), ${getTimerColor()})`,
          boxShadow: `0 0 10px ${getTimerColor()}`,
        }}
      >
        {widthPercentage <= 25 && (
          <span className="text-xs font-bold text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            {timeLeft}s
          </span>
        )}
      </div>
    </div>
  );
};

export default Timer;
