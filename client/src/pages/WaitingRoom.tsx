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
      sendMessage({
        type: "leave_room",
        payload: {
          roomId,
          userId: 1 // في التطبيق الحقيقي، سيتم استخدام معرف المستخدم الحالي
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
                <div className="p-4 rounded-lg" style={{ background: 'rgba(0,0,0,0.2)' }}>
                  <h3 className="text-lg font-semibold mb-2 text-center">انتظري بدء المسابقة...</h3>
                  <p className="text-sm text-center">
                    ستبدأ المسابقة عندما تقوم المعلمة ببدء المسابقة. كوني مستعدة!
                  </p>
                </div>
                
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
      
      {/* أنماط CSS للفقاعات */}
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
      `}} />
    </div>
  );
}
