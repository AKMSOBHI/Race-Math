import React, { useState, useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useWebSocket } from '@/lib/websocket';
import { soundService } from '@/lib/soundService';
import { useGameStore } from '@/lib/game/gameState';
import { ServerMessage } from '@shared/schema';
import { NavigationBar } from '@/components/Layout/NavigationBar';

/**
 * صفحة انتظار بدء المسابقة - تظهر للطلاب بعد الانضمام للغرفة وقبل بدء المسابقة
 */
export default function WaitingRoom() {
  const [_, navigate] = useLocation();
  const [matchQuery, params] = useRoute<{ roomId: string; gameId: string }>('/waiting?room=:roomId&game=:gameId');
  const routeParams = matchQuery ? params : { roomId: '', gameId: '' };
  const { toast } = useToast();
  const { addMessageListener, sendMessage } = useWebSocket();
  const { currentUser } = useGameStore();
  
  // معلومات الانتظار
  const [roomName, setRoomName] = useState<string>('');
  const [waitingTime, setWaitingTime] = useState<number>(0); // الوقت بالثواني
  const [countdown, setCountdown] = useState<number | null>(null);
  const [sandPercentage, setSandPercentage] = useState<number>(100); // نسبة الرمل في الساعة الرملية (100% - 0%)
  
  // لتخزين مرجع للمستمع النشط
  const activeListenerRef = React.useRef<((message: ServerMessage) => void) | null>(null);
  
  // استخراج معلومات الغرفة واللعبة من عنوان URL
  const roomId = routeParams?.roomId ? parseInt(routeParams.roomId) : null;
  const gameId = routeParams?.gameId || null;
  
  // زيادة مؤقت الانتظار
  useEffect(() => {
    const interval = setInterval(() => {
      setWaitingTime(prev => prev + 1);
      // عند زيادة الوقت، نقلل نسبة الرمل في الساعة الرملية بشكل بطيء
      if (countdown === null) { // نستخدم الساعة الرملية فقط عندما لا يكون هناك عداد تنازلي
        setSandPercentage(prev => {
          const newPercentage = prev - 0.1; // نقلل بنسبة بطيئة
          return newPercentage < 0 ? 100 : newPercentage; // إعادة ملء الساعة الرملية عندما تفرغ
        });
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [countdown]);
  
  // تنظيف المستمع عند إلغاء تحميل المكون
  useEffect(() => {
    return () => {
      // إزالة المستمع عند إلغاء تحميل المكون
      if (activeListenerRef.current) {
        console.log('تنظيف مستمع الرسائل عند مغادرة صفحة الانتظار');
        try {
          // تذكير: addMessageListener يمكن أن تعود مصفوفة المستمعين الحاليين
          // أو تعيد دالة لإضافة مستمع
          // في كلتا الحالتين، نحن فقط نريد أن نضيف مستمع جديد فارغ لتجنب أي أخطاء
          addMessageListener(() => {});
        } catch (error) {
          console.error('خطأ في تنظيف مستمع الرسائل:', error);
        }
        activeListenerRef.current = null;
      }
    };
  }, []);
  
  // الاستماع للرسائل القادمة من الخادم
  useEffect(() => {
    // ضمان عدم وجود مستمع سابق
    if (activeListenerRef.current) {
      console.log('تنظيف مستمع الرسائل السابق');
      try {
        addMessageListener(() => {});
      } catch (error) {
        console.error('خطأ في تنظيف مستمع الرسائل السابق:', error);
      }
      activeListenerRef.current = null;
    }
    
    // إضافة مستمع جديد
    const messageListener = (message: ServerMessage) => {
      console.log("استلام رسالة في صفحة الانتظار:", message);
      
      if (message.type === "contest_countdown") {
        // الرد على رسالة العد التنازلي
        const countdownValue = message.payload.countdown;
        setCountdown(countdownValue);
        console.log(`تم استلام تحديث العد التنازلي: ${countdownValue} ثانية`);
        
        // تحديث نسبة الرمل بناءً على العد التنازلي
        // نفترض أن العد التنازلي يبدأ من 20 ثانية
        const initialCountdown = 20;
        const percentageLeft = (countdownValue / initialCountdown) * 100;
        setSandPercentage(percentageLeft);
      }
      else if (message.type === "game_started") {
        // الرد على رسالة بدء اللعبة
        console.log("تم بدء المسابقة! الانتقال إلى صفحة اللعبة...");
        
        try {
          soundService.play('correct');
        } catch (e) {
          console.log("خطأ في تشغيل صوت بدء اللعبة", e);
        }
        
        toast({
          title: 'بدأت المسابقة!',
          description: 'جاري الانتقال إلى المسابقة...',
        });
        
        // الانتقال إلى صفحة اللعبة
        setTimeout(() => {
          if (message.payload.id) {
            navigate(`/game?id=${message.payload.id}`);
          } else if (gameId) {
            navigate(`/game?id=${gameId}`);
          } else {
            navigate('/');
            toast({
              title: 'خطأ في الانتقال للمسابقة',
              description: 'لم يتم العثور على معرف المسابقة.',
              variant: 'destructive'
            });
          }
        }, 1000);
      }
    };
    
    // حفظ المستمع للتنظيف لاحقاً
    activeListenerRef.current = messageListener;
    
    // إضافة المستمع للإشارات القادمة من الخادم
    addMessageListener(messageListener);
    
    return () => {
      // سيتم استدعاء دالة التنظيف في useEffect أعلاه
    };
  }, [navigate, gameId]);
  
  // تنسيق الوقت المنقضي بتنسيق دقائق:ثواني
  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  // الخروج من غرفة الانتظار
  const handleExit = () => {
    try {
      soundService.play('click');
    } catch (e) {
      console.log("خطأ في تشغيل صوت النقر", e);
    }
    
    navigate('/');
    toast({
      title: 'تم الخروج من غرفة الانتظار',
      description: 'يمكنك الانضمام مرة أخرى في أي وقت.',
    });
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      <NavigationBar />
      
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-0 shadow-xl" style={{ 
          background: 'rgba(69, 31, 146, 0.9)', 
          borderRadius: '16px',
          backdropFilter: 'blur(10px)'
        }}>
          <CardHeader>
            <CardTitle className="text-2xl text-center text-white">
              في انتظار بدء المسابقة
            </CardTitle>
            <CardDescription className="text-center text-gray-200">
              {roomName ? roomName : 'غرفة المسابقة'}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* عرض عداد تنازلي أو ساعة رملية */}
            <div className="text-center">
              {countdown !== null ? (
                <div className="space-y-2">
                  <p className="text-white">ستبدأ المسابقة خلال</p>
                  <div className="text-5xl font-bold text-white countdown-timer">
                    {countdown}
                  </div>
                  <p className="text-gray-300">ثانية</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-white">في انتظار بدء المسابقة...</p>
                  <div className="relative h-32 mx-auto w-24 mb-4 hourglass-container">
                    <div className="hourglass">
                      <div 
                        className="hourglass-top" 
                        style={{ 
                          clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 ${100 - sandPercentage}%)`
                        }}
                      ></div>
                      <div 
                        className="hourglass-bottom" 
                        style={{ 
                          clipPath: `polygon(0 0, 100% 0, 100% ${sandPercentage}%, 0 ${sandPercentage}%)`
                        }}
                      ></div>
                    </div>
                  </div>
                  <p className="text-gray-300">وقت الانتظار: {formatTime(waitingTime)}</p>
                </div>
              )}
            </div>
            
            <div className="text-center text-gray-200 px-4 py-2 rounded-md bg-purple-900/50">
              <p>سيتم نقلك تلقائياً إلى صفحة المسابقة عندما تبدأ المعلمة المسابقة.</p>
              <p className="mt-2 text-sm">يرجى عدم إغلاق هذه الصفحة أثناء الانتظار.</p>
            </div>
          </CardContent>
          
          <CardFooter>
            <Button 
              onClick={handleExit} 
              className="w-full" 
              variant="outline"
              style={{
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: 'white'
              }}
            >
              العودة للصفحة الرئيسية
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        .hourglass-container {
          perspective: 1000px;
        }
        
        .hourglass {
          position: relative;
          height: 100%;
          width: 100%;
          transform-style: preserve-3d;
          animation: rotate 4s infinite linear;
        }
        
        .hourglass-top {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 50%;
          background: linear-gradient(45deg, #FFA500, #FF6347);
          clip-path: polygon(0 0, 100% 0, 75% 100%, 25% 100%);
        }
        
        .hourglass-bottom {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 50%;
          background: linear-gradient(45deg, #FFA500, #FF6347);
          clip-path: polygon(25% 0, 75% 0, 100% 100%, 0 100%);
        }
        
        @keyframes rotate {
          0% {
            transform: rotateY(0deg);
          }
          50% {
            transform: rotateY(180deg);
          }
          100% {
            transform: rotateY(360deg);
          }
        }
        
        .countdown-timer {
          text-shadow: 0 0 10px rgba(255,255,255,0.5);
          animation: pulse 1s infinite;
        }
        
        @keyframes pulse {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
          100% {
            transform: scale(1);
          }
        }
      `}} />
    </div>
  );
}
