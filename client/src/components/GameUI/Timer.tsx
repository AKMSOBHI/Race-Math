import { FC, useEffect, useState, useRef } from 'react';
import { useGameStore } from '@/lib/game/gameState';
import { soundService } from '@/lib/soundService';
import { convertToArabicNumerals } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface TimerProps {
  duration?: number; // مدة العد التنازلي بالثواني
  onTimeEnd?: () => void; // دالة تنفذ عند انتهاء الوقت
}

/**
 * مكون مؤقت العد التنازلي للعبة - إصدار مبسط ينفذ مهمة واحدة فقط
 */
const Timer: FC<TimerProps> = ({ duration = 15, onTimeEnd }) => {
  // حالة الوقت المتبقي
  const [timeLeft, setTimeLeft] = useState(duration);
  
  // مرجع لتجنب الاستدعاءات المتكررة
  const hasEndedRef = useRef(false);
  
  // للتنبيهات
  const { toast } = useToast();
  
  // استخراج ما نحتاجه من حالة اللعبة
  const { 
    currentGame,
    setIsTimeUp,
    isSoundEnabled
  } = useGameStore();
  
  // إعادة ضبط المؤقت عندما يتغير السؤال أو المرحلة
  useEffect(() => {
    console.log('⏱️ إعادة ضبط المؤقت - سؤال/مرحلة جديدة');
    setTimeLeft(duration);
    hasEndedRef.current = false;
  }, [currentGame?.currentQuestionIndex, currentGame?.stage, duration]);
  
  // مؤقت للعد التنازلي
  useEffect(() => {
    // إذا كان الوقت لم ينتهي، نستمر في العد التنازلي
    if (timeLeft > 0) {
      // تشغيل صوت العد التنازلي عند الثواني الخمسة الأخيرة
      if (timeLeft <= 5 && isSoundEnabled) {
        soundService.play('countdown');
      }
      
      // استمرار العد التنازلي
      const timer = setTimeout(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
      
      return () => clearTimeout(timer);
    } 
    // إذا وصل الوقت للصفر ولم يتم استدعاء الدالة من قبل
    else if (!hasEndedRef.current) {
      console.log('⛔ انتهى الوقت في مكون Timer');
      hasEndedRef.current = true;
      
      // تعيين حالة انتهاء الوقت
      setIsTimeUp(true);
      
      // تشغيل صوت انتهاء الوقت
      if (isSoundEnabled) {
        soundService.play('wrong');
      }
      
      // إظهار رسالة
      toast({
        title: "! انتهى الوفت",
        description: "... انتقلنا إلى سؤال جديد",
        variant: "destructive",
        duration: 7000, // تحديد مدة ظهور الرسالة: 7 ثواني
      });
      
      // استدعاء الدالة الخارجية لإعلام المكون الأب بانتهاء الوقت
      if (onTimeEnd) {
        console.log('♻️ استدعاء دالة onTimeEnd الخارجية');
        setTimeout(() => {
          onTimeEnd();
        }, 100);
      }
    }
  }, [timeLeft, isSoundEnabled, setIsTimeUp, onTimeEnd, toast]);
  
  // عرض المؤقت بشكل جمالي
  return (
    <div className="timer-container w-full mb-2">
      <div className="bg-gradient-to-r from-purple-900/90 to-indigo-900/90 p-2 rounded-lg relative border-2 border-indigo-600" 
        style={{
          boxShadow: '0 0 10px rgba(0, 245, 212, 0.4)',
        }}>
        <div className="relative h-5">
          <div 
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-pink-600 to-purple-600 rounded-md transition-all" 
            style={{ 
              width: `${(timeLeft / duration) * 100}%`,
              boxShadow: '0 0 8px rgba(236, 72, 153, 0.6)'
            }}
          />
        </div>
        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
          <p className="text-white text-xs md:text-sm font-bold" style={{ textShadow: '0 0 3px rgba(0,0,0,0.8)' }}>
            {convertToArabicNumerals(timeLeft)} ثانية
          </p>
        </div>
      </div>
    </div>
  );
};

export default Timer;