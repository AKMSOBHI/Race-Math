import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWebSocket } from '@/lib/websocket';
import { soundService } from '@/lib/soundService';
import { useGameStore } from '@/lib/game/gameState';

/**
 * صفحة الانضمام للغرفة - تتيح للطالبات الانضمام إلى غرفة باستخدام الرمز
 */
export default function JoinRoom() {
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const { addMessageListener, sendMessage } = useWebSocket();
  const { currentUser } = useGameStore();
  
  // حالة الصفحة
  const [roomCode, setRoomCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // الانضمام للغرفة
  const handleJoinRoom = () => {
    if (!roomCode.trim()) {
      setError('الرجاء إدخال رمز الغرفة');
      return;
    }
    
    if (!currentUser) {
      setError('يرجى الانتظار حتى يتم تحميل بيانات المستخدم');
      return;
    }
    
    // التحقق من معرف المستخدم الصحيح
    console.log("معرف المستخدم الحالي:", currentUser.id, currentUser);
    
    setError('');
    setIsLoading(true);
    soundService.play('click');
    
    console.log(`محاولة الانضمام للغرفة برمز: ${roomCode.trim()} للمستخدم: ${currentUser.id}`);
    
    // سنضيف مستمع للرسائل القادمة من WebSocket
    const messageListener = (message: any) => {
      console.log("استلام رد من الخادم:", message);
      
      if (message.type === "room_joined") {
        setIsLoading(false);
        
        console.log("تم الانضمام للغرفة بنجاح!", message.payload);
        
        toast({
          title: 'تم الانضمام للغرفة بنجاح',
          description: 'مرحباً بك! ستبدأ المسابقة قريباً.',
        });
        
        // الانتقال إلى صفحة الانتظار
        navigate(`/waiting-room/${message.payload.roomId}`);
      }
      else if (message.type === "error") {
        setIsLoading(false);
        
        // تحديد رسالة الخطأ بشكل أكثر وضوحًا
        let errorMessage = message.payload.message || 'حدث خطأ أثناء الانضمام للغرفة';
        
        if (errorMessage === 'Room not found with the provided code') {
          errorMessage = 'الغرفة غير موجودة بالرمز المدخل';
        } else if (errorMessage === 'Could not join the room') {
          errorMessage = 'تعذر الانضمام للغرفة. قد تكون الغرفة غير نشطة أو ممتلئة';
        }
        
        console.log("خطأ في الانضمام للغرفة:", errorMessage);
        setError(errorMessage);
      }
    };
    
    // إضافة المستمع للرسائل
    addMessageListener(messageListener);
    
    // إرسال طلب الانضمام باستخدام معرف المستخدم الحالي
    // نعرف الرسالة باستخدام النوع ClientMessage من المخطط المشترك
    const joinMessage: any = {
      type: "join_room",
      payload: {
        roomCode: roomCode.trim().toUpperCase(),
        userId: currentUser.id
      }
    };
    
    console.log(`إرسال طلب انضمام للغرفة:`, joinMessage);
    sendMessage(joinMessage);
  };
  
  // العودة للصفحة الرئيسية
  const goToHome = () => {
    soundService.play('click');
    navigate('/');
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md p-4">
        <Card className="overflow-hidden shadow-lg"
          style={{
            background: 'linear-gradient(135deg, rgba(109, 40, 217, 0.9), rgba(76, 29, 149, 0.9))',
            border: '3px solid var(--space-bright)',
            boxShadow: '0 0 20px rgba(0, 245, 212, 0.7)'
          }}
        >
          <CardHeader>
            <CardTitle className="text-2xl text-center" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              الانضمام للمسابقة
            </CardTitle>
            <CardDescription className="text-center">
              أدخلي رمز الغرفة الذي زودتك به معلمتك للانضمام إلى المسابقة
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="roomCode">رمز الغرفة</Label>
              <Input
                id="roomCode"
                placeholder="أدخل رمز الغرفة هنا (مثل: ABC123)"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                className="text-center text-xl tracking-widest"
                style={{
                  background: 'rgba(20, 20, 40, 0.8)',
                  border: '2px solid var(--space-bright)',
                  color: 'white',
                  fontFamily: 'Orbitron, sans-serif'
                }}
                maxLength={8}
              />
              {error && <p className="text-red-500 text-sm">{error}</p>}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button 
              className="w-full py-3 text-base sm:text-lg font-bold" 
              onClick={handleJoinRoom}
              disabled={isLoading}
              style={{
                background: 'linear-gradient(45deg, #10b981, #059669)',
                border: '2px solid #34d399',
                boxShadow: '0 0 15px rgba(16, 185, 129, 0.5)',
                borderRadius: '10px'
              }}
            >
              {isLoading ? 'جاري الانضمام...' : 'انضم للغرفة'}
            </Button>
            <Button 
              variant="ghost" 
              onClick={goToHome} 
              className="w-full py-2 text-sm sm:text-base"
              style={{
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                background: 'rgba(0, 0, 0, 0.2)'
              }}
            >
              العودة للصفحة الرئيسية
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
