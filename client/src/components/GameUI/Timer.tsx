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
  const { nextQuestion, setIsTimeUp, isTimeUp } = useGameStore();

  // مؤقت العد التنازلي مع الانتقال التلقائي
  useEffect(() => {
    // إذا كان الوقت المتبقي صفر أو أقل
    if (timeLeft <= 0) {
      console.log('⛔ انتهى وقت السؤال الحالي ⛔ hasNotified:', hasNotified, 'currentGame:', !!currentGame);
      
      // التأكد من أننا لم نقم بذلك من قبل وأن اللعبة موجودة
      if (!hasNotified && currentGame) {
        console.log('♞ بدء الإجراءات اللازمة للانتقال التلقائي بعد انتهاء الوقت');
        // تعيين التنبيه أولاً لمنع التكرار
        setHasNotified(true);
        
        try {
          console.log('➕ التحضير للانتقال التلقائي للسؤال التالي');

          // التأكد من استجابة الواجهة
          document.body.style.background = 'rgba(25, 25, 60, 1)';
          
          // وضع علم انتهاء الوقت وإعداد حالة التحميل
          setIsTimeUp(true);
          
          // الحصول على الحالة الحالية وتعيين حالة التحميل
          const gameState = useGameStore.getState();
          
          // إخفاء جميع النوافذ المنبثقة قبل الانتقال
          gameState.setShowCorrectModal(false);
          gameState.setShowIncorrectModal(false);
          gameState.setShowStageCompleteModal(false);
          gameState.setIsLoading(true); // لمنع ظهور الشاشة السوداء
          
          // تشغيل صوت انتهاء الوقت
          if (isSoundEnabled) {
            console.log('🔊 تشغيل صوت انتهاء الوقت');
            soundService.play('wrong'); // استخدام صوت الإجابة الخاطئة للتنبيه
          }
          
          // إظهار رسالة انتهاء الوقت
          toast({
            title: "انتهى الوقت!",
            description: "الانتقال للسؤال التالي تلقائياً...",
            variant: "destructive",
          });
          
          // نظام الانتقال التلقائي - شروط السلامة
          if (currentGame) {
            console.log('➕ جاري تجهيز الانتقال التلقائي للسؤال التالي (معرف اللعبة: ' + currentGame.id + ')');
            
            // التأكد من وجود المعرف الصحيح
            const gameId = currentGame.id;
            
            // تصميم نظام متعدد المراحل للانتقال الموثوق
            // المرحلة 1: إرسال الطلب بعد فترة قصيرة (100 مللي ثانية)
            setTimeout(() => {
              try {
                console.log('➕ المرحلة 1: إرسال طلب nextQuestion للخادم - معرف اللعبة:', gameId);
                const { nextQuestion: nextQ } = useGameStore.getState();
                
                // الانتقال الفعلي للسؤال التالي
                nextQ(gameId);
                
                // المرحلة 2: التحقق من حالة الاستجابة (800 مللي ثانية)
                setTimeout(() => {
                  try {
                    console.log('➕ المرحلة 2: التحقق من حالة الاستجابة وإعادة الضبط');
                    
                    // الحصول على الحالة الحالية بعد الاستجابة
                    const currentState = useGameStore.getState();
                    
                    // إعادة ضبط حالة التحميل إذا لزم الأمر
                    if (currentState.isLoading) {
                      console.log('⭕ تنفيذ إعادة ضبط حالة التحميل');
                      currentState.setIsLoading(false);
                    }
                    
                    // إعادة ضبط حالة انتهاء الوقت
                    currentState.setIsTimeUp(false);
                    
                    // استدعاء دالة انتهاء الوقت المخصصة (إن وجدت)
                    if (onTimeEnd) {
                      console.log('✅ تنفيذ إجراءات onTimeEnd');
                      onTimeEnd();
                    }
                    
                    // المرحلة 3: مؤقت أمان إضافي (2000 مللي ثانية)
                    setTimeout(() => {
                      try {
                        console.log('➕ المرحلة 3: مؤقت أمان نهائي للتأكد من الاستجابة');
                        
                        // الحصول على آخر حالة للتأكد
                        const finalState = useGameStore.getState();
                        
                        // إذا كانت حالة التحميل ما زالت نشطة، نعيد ضبطها
                        if (finalState.isLoading) {
                          console.log('⚠️ تنبيه: ما زالت حالة التحميل نشطة بعد كل مراحل الأمان');
                          finalState.setIsLoading(false);
                          
                          // إذا استمرت المشكلة، نعيد تحميل الصفحة كملاذ أخير
                          window.location.reload();
                        } else {
                          console.log('✅ نجاح الانتقال التلقائي للسؤال التالي بعد انتهاء الوقت!');
                        }
                      } catch (e) {
                        console.error('❌ خطأ في مؤقت الأمان النهائي:', e);
                        // إعادة تحميل الصفحة في حالة الخطأ
                      }
                    }, 2000);
                  } catch (timeoutError) {
                    console.error('❌ خطأ في المرحلة 2 من الانتقال التلقائي:', timeoutError);
                    // ضمان إعادة ضبط حالة التحميل في حالة الخطأ
                    const errorState = useGameStore.getState();
                    errorState.setIsLoading(false);
                  }
                }, 800);
              } catch (error) {
                console.error('❌ خطأ في المرحلة 1 من الانتقال التلقائي:', error);
                // إعادة تعيين حالة التحميل في حالة حدوث خطأ
                const errorState = useGameStore.getState();
                errorState.setIsLoading(false);
                
                // محاولة إعادة تنفيذ الاستدعاء بعد فترة
                setTimeout(() => {
                  try {
                    console.log('⚙️ محاولة أخيرة للانتقال التلقائي...');
                    const { nextQuestion: retryNextQ } = useGameStore.getState();
                    retryNextQ(gameId);
                  } catch (retryError) {
                    console.error('❌ فشلت المحاولة الأخيرة للانتقال التلقائي:', retryError);
                  }
                }, 1500);
              }
            }, 100);
          }
        } catch (error) {
          console.error('❌ خطأ في منطق انتهاء الوقت الرئيسي:', error);
          
          // في حالة حدوث خطأ، نحاول إلغاء حالة التحميل بعد فترة
          setTimeout(() => {
            const errorState = useGameStore.getState();
            errorState.setIsLoading(false);
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
