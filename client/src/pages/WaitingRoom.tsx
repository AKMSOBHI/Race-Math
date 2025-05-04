import React, { useEffect, useState } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useWebSocket } from '@/lib/websocket';
import { soundService } from '@/lib/soundService';
import { convertToArabicNumerals } from '@/lib/utils';

/**
 * صفحة الانتظار - تظهر للطالبات بعد الانضمام للغرفة وقبل بدء المسابقة
 */
export default function WaitingRoom() {
  const [match, params] = useRoute('/waiting-room/:id');
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const { addMessageListener, sendMessage } = useWebSocket();
  
  // حالة الصفحة
  const [roomInfo, setRoomInfo] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null); // للعد التنازلي قبل بدء المسابقة
  const [countdownAnimationActive, setCountdownAnimationActive] = useState(false); // لتأثيرات العد التنازلي
  const [isApproved, setIsApproved] = useState<boolean>(false); // حالة الموافقة على الطالبة
  
  // الحصول على معرف الغرفة من عنوان URL
  const roomId = match && params ? parseInt(params.id) : null;
  
  // رسم الفقاعات المتحركة في الخلفية
  useEffect(() => {
    // إنشاء فقاعات متحركة في الخلفية
    const bubbleContainer = document.getElementById('bubbleContainer');
    if (!bubbleContainer) return;
    
    // إزالة أي فقاعات موجودة مسبقاً
    bubbleContainer.innerHTML = '';
    
    // إنشاء 20 فقاعة عشوائية
    for (let i = 0; i < 20; i++) {
      const bubble = document.createElement('div');
      bubble.className = 'bubble';
      
      // إعداد خصائص الفقاعة العشوائية
      const size = Math.random() * 40 + 10; // حجم بين 10 و60 بكسل
      const x = Math.random() * 100; // موقع X بين 0 و00
      const y = Math.random() * 100; // موقع Y بين 0 و00
      const speed = Math.random() * 50 + 10; // سرعة بين 10 و60
      const delay = Math.random() * 5; // تأخير بين 0 و5 ثوانٍ
      
      // تطبيق الخصائص على عنصر الفقاعة
      bubble.style.width = `${size}px`;
      bubble.style.height = `${size}px`;
      bubble.style.left = `${x}%`;
      bubble.style.bottom = `-${size}px`;
      bubble.style.animationDuration = `${speed}s`;
      bubble.style.animationDelay = `${delay}s`;
      
      // إضافة الفقاعة إلى الحاوية
      bubbleContainer.appendChild(bubble);
    }
  }, []);
  
  // الاستماع لسيرفر WebSocket لتحديثات الغرفة
  useEffect(() => {
    if (!roomId) {
      navigate('/');
      return;
    }
    
    const handleMessage = (message: any) => {
      if (message.type === "room_list") {
        // تحديث معلومات الغرفة
        const foundRoom = message.payload.find((room: any) => room.id === roomId);
        if (foundRoom) {
          setRoomInfo(foundRoom);
          setIsLoading(false);
        }
      }
      else if (message.type === "player_joined") {
        // لاعب جديد انضم للغرفة
        if (message.payload.gameId.toString() === roomId?.toString()) {
          soundService.play('click');
          
          toast({
            title: 'طالبة جديدة!',
            description: `${message.payload.player.username} انضمت إلى المسابقة`,
          });
          
          setPlayers(prev => [...prev, message.payload.player]);
        }
      }
      else if (message.type === "student_approval_updated") {
        // تحديث حالة الموافقة على الطالبة
        if (message.payload.roomId.toString() === roomId?.toString()) {
          // التحقق من أن الرسالة تخص المستخدم الحالي
          const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

          if (currentUser && currentUser.id === message.payload.studentId) {
            if (message.payload.isApproved) {
              soundService.play('correct');
              setIsApproved(true);
              
              toast({
                title: 'تمت الموافقة!',
                description: 'لقد تمت الموافقة على مشاركتك في المسابقة!',
                variant: 'default',
              });
            } else {
              // إذا تم رفض الطالبة
              toast({
                title: 'تم رفض الطلب',
                description: 'لم تتم الموافقة على مشاركتك في هذه المسابقة.',
                variant: 'destructive',
              });
              
              // العودة للصفحة الرئيسية
              setTimeout(() => {
                navigate('/');
              }, 2000);
            }
          }
        }
      }
      else if (message.type === "contest_countdown") {
        // تحديث العد التنازلي لبدء المسابقة
        if (message.payload.roomId.toString() === roomId?.toString()) {
          const seconds = message.payload.countdown;
          console.log(`العد التنازلي: ${seconds} ثوانٍ`);
          
          // تشغيل صوت للعد التنازلي
          if (seconds <= 5) { // صوت للعد التنازلي النهائي
            soundService.play('correct');
          } else if (seconds === 10 || seconds === 15 || seconds === 20) {
            soundService.play('click'); // صوت للإشارات الرئيسية في العد
          }
          
          // تحديث حالة العد التنازلي
          setCountdown(seconds);
          
          // تفعيل تأثير الرسوم المتحركة للعد التنازلي
          setCountdownAnimationActive(true);
          
          // إيقاف التأثير بعد فترة قصيرة
          setTimeout(() => {
            setCountdownAnimationActive(false);
          }, 500);
          
          // إظهار رسالة بدء المسابقة قريباً
          if (seconds === 20) {
            toast({
              title: 'ستبدأ المسابقة قريباً!',
              description: 'المسابقة ستبدأ خلال 20 ثانية. كوني مستعدة!',
            });
          }
        }
      }
      else if (message.type === "game_started") {
        // بدأت المسابقة!
        navigate(`/game?id=${message.payload.id}`);
        
        toast({
          title: 'بدأت المسابقة!',
          description: 'بدأت المسابقة. حظاً موفقاً!',
        });
      }
    };
    
    addMessageListener(handleMessage);
    
    // طلب معلومات الغرفة
    sendMessage({
      type: "get_room_list",
      payload: {}
    });
    
    return () => {
      // سيتم إزالة المستمع عند مغادرة الصفحة
    };
  }, [roomId]);
  
  // العودة للصفحة الرئيسية
  const leaveRoom = () => {
    soundService.play('click');
    
    // إرسال رسالة مغادرة الغرفة
    if (roomId) {
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      const userId = currentUser?.id || 0;
      
      sendMessage({
        type: "leave_room",
        payload: {
          roomId,
          userId: userId
        }
      });
    }
    
    navigate('/');
  };
  
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* حاوية الفقاعات المتحركة */}
      <div id="bubbleContainer" className="absolute inset-0 pointer-events-none z-0 overflow-hidden" />
      
      <div className="flex-1 flex items-center justify-center p-4 z-10">
        <Card className="w-full max-w-md shadow-xl"
          style={{
            background: 'linear-gradient(135deg, rgba(109, 40, 217, 0.85), rgba(76, 29, 149, 0.85))',
            border: '3px solid var(--space-bright)',
            boxShadow: '0 0 20px rgba(0, 245, 212, 0.7)'
          }}
        >
          <CardHeader>
            <CardTitle className="text-2xl text-center" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              غرفة الانتظار
            </CardTitle>
            {roomInfo && (
              <CardDescription className="text-center">
                <div className="font-semibold">{roomInfo.name}</div>
                <div className="mt-1">رمز الغرفة: <span className="font-mono font-bold">{roomInfo.code}</span></div>
              </CardDescription>
            )}
          </CardHeader>
          
          <CardContent className="space-y-6">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-space-bright border-t-transparent"></div>
              </div>
            ) : (
              <>
                {countdown !== null ? (
                  <div 
                    className={`p-6 rounded-lg text-center ${countdownAnimationActive ? 'animate-pulse' : ''}`} 
                    style={{ 
                      background: 'rgba(0,0,0,0.4)',
                      boxShadow: '0 0 15px rgba(0, 245, 212, 0.5)'
                    }}
                  >
                    <h3 className="text-xl font-bold mb-2">
                      المسابقة ستبدأ قريباً!
                    </h3>
                    <div className="flex justify-center items-center my-6">
                      <div 
                        className="relative w-24 h-24 flex items-center justify-center"
                      >
                        {/* دائرة العد التنازلي */}
                        <svg className="absolute top-0 left-0 w-full h-full" viewBox="0 0 100 100">
                          <circle 
                            cx="50" 
                            cy="50" 
                            r="45" 
                            fill="none" 
                            stroke="rgba(60, 247, 255, 0.2)" 
                            strokeWidth="6"
                          />
                          <circle 
                            cx="50" 
                            cy="50" 
                            r="45" 
                            fill="none" 
                            stroke={countdown <= 5 ? '#ff4050' : '#3cf7ff'}
                            strokeWidth="6"
                            strokeDasharray="283"
                            strokeDashoffset={(283 * (1 - countdown / 20)).toString()}
                            transform="rotate(-90 50 50)"
                          />
                        </svg>
                        <div 
                          className="text-5xl font-mono font-bold z-10"
                          style={{ color: countdown <= 5 ? '#ff4050' : '#3cf7ff' }}
                        >
                          {convertToArabicNumerals(countdown)}
                        </div>
                      </div>
                    </div>
                    <p className="text-sm">
                      كوني مستعدة! ستبدأ المسابقة خلال {convertToArabicNumerals(countdown)} ثوانٍ
                    </p>
                  </div>
                ) : (
                  <div className="p-4 rounded-lg" style={{ background: 'rgba(0,0,0,0.2)' }}>
                    <h3 className="text-lg font-semibold mb-2 text-center">انتظري بدء المسابقة...</h3>
                    {!isApproved ? (
                      <div className="mb-3 p-3 rounded-lg" style={{ background: 'rgba(255, 100, 100, 0.2)', border: '1px solid rgba(255, 100, 100, 0.5)' }}>
                        <div className="flex items-center justify-center mb-2">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-300 mr-2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                          <span className="font-semibold text-orange-300">في انتظار موافقة المعلمة</span>
                        </div>
                        <p className="text-sm text-center">
                          يجب أن توافق المعلمة على مشاركتك قبل أن تتمكني من المشاركة في المسابقة.
                        </p>
                      </div>
                    ) : (
                      <div className="mb-3 p-3 rounded-lg" style={{ background: 'rgba(100, 255, 100, 0.2)', border: '1px solid rgba(100, 255, 100, 0.5)' }}>
                        <div className="flex items-center justify-center mb-2">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-300 mr-2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                          <span className="font-semibold text-green-300">تمت الموافقة!</span>
                        </div>
                        <p className="text-sm text-center">
                          لقد تمت الموافقة على مشاركتك! ستبدأ المسابقة عندما تقوم المعلمة ببدء المسابقة.
                        </p>
                      </div>
                    )}
                    <p className="text-sm text-center">
                      كوني مستعدة للمشاركة في المسابقة!
                    </p>
                  </div>
                )}
                
                <div>
                  <h3 className="text-lg font-semibold mb-3">الطالبات المنضمات ({convertToArabicNumerals(players.length)}):</h3>
                  
                  {players.length === 0 ? (
                    <div className="p-4 text-center text-gray-300 italic">
                      لم تنضم طالبات أخريات بعد...
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {players.map((player, index) => (
                        <div 
                          key={player.id} 
                          className="p-2 rounded-lg text-center animate-fadeIn"
                          style={{
                            background: 'rgba(123, 44, 191, 0.4)',
                            border: '1px solid var(--space-bright)',
                          }}
                        >
                          {player.username}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
            
            <div className="pt-4 text-center">
              <Button 
                variant="ghost" 
                onClick={leaveRoom}
                className="text-gray-300 hover:text-white w-full sm:w-auto px-6 py-2 text-sm sm:text-base"
                style={{
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  background: 'rgba(0, 0, 0, 0.2)'
                }}
              >
                مغادرة الغرفة
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* شريط علوي زخرفي */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-purple-900 via-space-bright to-purple-900 z-20"></div>
      
      {/* شريط سفلي زخرفي */}
      <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-purple-900 via-space-bright to-purple-900 z-20"></div>
      
      {/* أنماط CSS للفقاعات والتأثيرات */}
      <style dangerouslySetInnerHTML={{ __html: `
        .bubble {
          position: absolute;
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(123, 44, 191, 0.1), rgba(0, 245, 212, 0.2));
          border: 1px solid rgba(0, 245, 212, 0.3);
          animation: float linear infinite;
          z-index: 1;
        }
        
        @keyframes float {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 0.5;
          }
          90% {
            opacity: 0.4;
          }
          100% {
            transform: translateY(-100vh) rotate(360deg);
            opacity: 0;
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-in;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-pulse {
          animation: pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
      `}} />
    </div>
  );
}
