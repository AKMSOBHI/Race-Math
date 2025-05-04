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
  
  // استيراد المزيد من الوظائف من gameState
  const { nextQuestion, setIsTimeUp, isTimeUp, setIsLoading } = useGameStore();

  // Timer countdown
  useEffect(() => {
    if (timeLeft <= 0) {
      console.log('Timer reached zero, hasNotified:', hasNotified);
      
      if (!hasNotified && currentGame) {
        console.log('Notifying time end and taking action');
        setHasNotified(true); // تعيين التنبيه أولاً لمنع التكرار
        
        try {
          // وضع علم انتهاء الوقت وعرض مؤشر التحميل
          setIsTimeUp(true);
          setIsLoading(true); // لمنع ظهور الشاشة السوداء
          
          // تشغيل صوت انتهاء الوقت
          if (isSoundEnabled) {
            console.log('تشغيل صوت انتهاء الوقت');
            soundService.play('countdown');
            // استخدام صوت التنبيه بدلاً من صوت نهاية اللعبة
          }
          
          // إظهار رسالة انتهاء الوقت
          toast({
            title: "انتهى الوقت!",
            description: "انتقال للسؤال التالي...",
            variant: "destructive",
          });
          
          // الانتقال للسؤال التالي فوراً لتجنب الشاشة السوداء
          if (currentGame) {
            console.log('الانتقال الفوري للسؤال التالي بعد انتهاء الوقت');
            nextQuestion(currentGame.id);
            
            // تأخير بسيط للسماح بعملية الانتقال
            setTimeout(() => {
              // إعادة تعيين حالة التحميل إلى false في حال لم يتم ذلك بالفعل
              const currentState = useGameStore.getState();
              if (currentState.isLoading) {
                currentState.setIsLoading(false);
              }
              
              // إعادة تعيين حالة انتهاء الوقت بعد الانتقال للسؤال التالي
              currentState.setIsTimeUp(false);
              
              // استدعاء دالة انتهاء الوقت إذا كانت موجودة
              if (onTimeEnd) {
                console.log('Calling onTimeEnd callback');
                onTimeEnd();
              }
            }, 800);
          }
        } catch (error) {
          console.error('Error in timer end handling:', error);
          
          // في حالة حدوث خطأ، نحاول إلغاء حالة التحميل بعد فترة
          setTimeout(() => {
            setIsLoading(false);
            setIsTimeUp(false);
          }, 2000);
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
