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
import { ClientMessage, ServerMessage } from '@shared/schema';
import { NavigationBar } from '@/components/Layout/NavigationBar';

/**
 * صفحة الانضمام للغرفة - تتيح للطالبات الانضمام إلى غرفة باستخدام الرمز
 */
export default function JoinRoom() {
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const { addMessageListener, sendMessage } = useWebSocket();
  const { currentUser } = useGameStore();
  
  // لتخزين مرجع للمستمع النشط
  const activeListenerRef = React.useRef<((message: ServerMessage) => void) | null>(null);
  
  // تنظيف المستمع عند إلغاء تحميل المكون
  useEffect(() => {
    return () => {
      // إزالة المستمع عند إلغاء تحميل المكون
      if (activeListenerRef.current) {
        console.log('تنظيف مستمع الرسائل عند مغادرة صفحة الانضمام للغرفة');
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
  
  // حالة الصفحة
  const [roomCode, setRoomCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // الانضمام للغرفة
  const handleJoinRoom = () => {
    if (!roomCode.trim()) {
      setError('الرجاء إدخال رمز الغرفة');
      return;
    }
    
    if (!fullName.trim()) {
      setError('الرجاء إدخال اسمك الثنائي أو الثلاثي');
      return;
    }
    
    // التحقق من صحة الاسم (يجب أن يكون على الأقل جزءين)
    const nameParts = fullName.trim().split(/\s+/);
    if (nameParts.length < 2) {
      setError('يجب أن يتكون الاسم من جزئين على الأقل (الاسم الأول والعائلة)');
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
    const messageListener = (message: ServerMessage) => {
      console.log("استلام رد من الخادم:", message);
      
      if (message.type === "room_joined") {
        setIsLoading(false);
        
        console.log("تم الانضمام للغرفة بنجاح!", message.payload);
        
        // تشغيل صوت النجاح
        try {
          soundService.play('correct');
        } catch (e) {
          console.log("خطأ في تشغيل صوت النجاح", e);
        }
        
        toast({
          title: 'تم الانضمام للغرفة بنجاح',
          description: 'مرحباً بك! ستبدأ المسابقة قريباً.',
        });
        
        // الانتقال مباشرة إلى اللعبة (تم إلغاء الانتظار)
        setTimeout(() => {
          const currentActiveGame = localStorage.getItem('currentGameId');
          if (currentActiveGame) {
            navigate(`/game?id=${currentActiveGame}`);
          } else {
            // إذا لم يكن هناك لعبة نشطة، ربما تعيد توجيه المستخدم إلى الصفحة الرئيسية
            navigate('/');
            toast({
              title: 'لم يتم العثور على مسابقة نشطة',
              description: 'يرجى التحقق مع المعلمة لبدء مسابقة جديدة.',
              variant: 'destructive'
            });
          }
        }, 500);
      }
      else if (message.type === "error") {
        setIsLoading(false);
        
        // تشغيل صوت الخطأ
        try {
          soundService.play('wrong');
        } catch (e) {
          console.log("خطأ في تشغيل صوت الخطأ", e);
        }
        
        // تحديد رسالة الخطأ بشكل أكثر وضوحًا
        let errorMessage = message.payload.message || 'حدث خطأ أثناء الانضمام للغرفة';
        
        if (errorMessage.includes('Room not found') || errorMessage.includes('with the provided code')) {
          errorMessage = 'الغرفة غير موجودة بالرمز "' + roomCode.trim().toUpperCase() + '". تأكدي من إدخال الرمز الصحيح.';
        } else if (errorMessage.includes('Could not join') || errorMessage.includes('join the room')) {
          errorMessage = 'تعذر الانضمام للغرفة. قد تكون الغرفة غير نشطة أو ممتلئة. يرجى التحقق من المعلمة.';
        }
        
        console.log("خطأ في الانضمام للغرفة:", errorMessage);
        setError(errorMessage);
        
        // عرض رسالة خطأ للمستخدم
        toast({
          title: 'خطأ في الانضمام للغرفة',
          description: errorMessage,
          variant: 'destructive'
        });
      }
    };
    
    // تخزين المستمع في المرجع ليمكن تنظيفه لاحقًا
    activeListenerRef.current = messageListener;
    
    // إضافة المستمع للرسائل
    addMessageListener(messageListener);
    
    // إرسال طلب الانضمام باستخدام معرف المستخدم الحالي
    // نعرف الرسالة باستخدام النوع ClientMessage من المخطط المشترك
    const joinMessage: ClientMessage = {
      type: "join_room",
      payload: {
        roomCode: roomCode.trim().toUpperCase(),
        userId: currentUser.id,
        fullName: fullName.trim() // إرسال الاسم الكامل للمستخدم
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
    <div className="min-h-screen flex flex-col">
      {/* Navigation Bar with Notifications */}
      {currentUser && <NavigationBar />}
      
      <div className="flex-1 flex items-center justify-center">
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
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="fullName">الاسم الثنائي أو الثلاثي</Label>
              <Input
                id="fullName"
                placeholder="أدخل اسمك الثنائي أو الثلاثي بالكامل"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="text-right"
                style={{
                  background: 'rgba(20, 20, 40, 0.8)',
                  border: '2px solid var(--space-bright)',
                  color: 'white'
                }}
              />
              <p className="text-xs text-gray-300">يجب إدخال الاسم الأول والعائلة على الأقل</p>
              
              {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
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
    </div>
  );
}
