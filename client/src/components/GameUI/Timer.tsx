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
  
  return (
    <div className="bg-gray-800 rounded-full overflow-hidden">
      <div 
        className="timer-bar h-6 rounded-full"
        style={{ width: `${widthPercentage}%` }}
      ></div>
    </div>
  );
};

export default Timer;
