import { FC, useEffect, useState } from 'react';
import { useGameStore } from '@/lib/game/gameState';
import { useToast } from '@/hooks/use-toast';
import { soundService } from '@/lib/soundService';
import { convertToArabicNumerals } from '@/lib/utils';

interface TimerProps {
  duration?: number; // Duration in seconds
  onTimeEnd?: () => void; // Callback when time ends
}

const Timer: FC<TimerProps> = ({ duration = 15, onTimeEnd }) => {
  const [timeLeft, setTimeLeft] = useState(duration);
  const { currentGame, currentUser, submitAnswer, isSoundEnabled } = useGameStore();
  const { toast } = useToast();
  const [hasNotified, setHasNotified] = useState(false);
  const [lastPlayedTime, setLastPlayedTime] = useState(duration);
  
  // Reset timer when question or stage changes
  useEffect(() => {
    setTimeLeft(duration);
    setHasNotified(false);
    setLastPlayedTime(duration);
  }, [currentGame?.currentQuestionIndex, currentGame?.stage, duration]);
  
  // Timer countdown
  useEffect(() => {
    if (timeLeft <= 0) {
      if (!hasNotified && onTimeEnd) {
        if (isSoundEnabled) {
          soundService.play('gameOver');
        }
        onTimeEnd();
        setHasNotified(true);
        
        // Automatically submit a wrong answer when time runs out
        if (currentGame && currentUser) {
          submitAnswer(currentGame.id, -1); // -1 is invalid answer
          
          toast({
            title: "انتهى الوقت!",
            description: "انتهى وقت الإجابة على السؤال",
            variant: "destructive",
          });
        }
      }
      return;
    }
    
    // تشغيل صوت العد التنازلي عندما يكون الوقت أقل من 5 ثوانٍ
    if (isSoundEnabled && timeLeft <= 5 && timeLeft !== lastPlayedTime) {
      setLastPlayedTime(timeLeft);
      soundService.play('countdown');
    }
    
    const timer = setTimeout(() => {
      setTimeLeft(timeLeft - 1);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [timeLeft, hasNotified, onTimeEnd, currentGame, currentUser, submitAnswer, toast, isSoundEnabled, lastPlayedTime]);
  
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
        <span className="text-xs font-bold text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>
          {convertToArabicNumerals(timeLeft)}
        </span>
      </div>
    </div>
  );
};

export default Timer;
