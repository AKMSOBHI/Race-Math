import React, { useEffect, useState, useCallback } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useWebSocket } from '@/lib/websocket';
import { soundService } from '@/lib/soundService';
import { convertToArabicNumerals } from '@/lib/utils';

/**
 * لوحة تحكم المعلمة - تتيح إنشاء وإدارة الغرف التعليمية
 */
export default function TeacherDashboard() {
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const { addMessageListener, sendMessage } = useWebSocket();
  
  // حالة الصفحة
  const [rooms, setRooms] = useState<any[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // إعداد نموذج إنشاء الغرفة
  const roomFormSchema = z.object({
    name: z.string().min(3, { message: "يجب أن يكون اسم الغرفة 3 أحرف على الأقل" }),
    maxPlayers: z.coerce.number().min(2).max(100).default(100),
    contestMode: z.enum(["synchronized", "asynchronous"]).default("synchronized"),
  });
  
  const roomForm = useForm<z.infer<typeof roomFormSchema>>({
    resolver: zodResolver(roomFormSchema),
    defaultValues: {
      name: "",
      maxPlayers: 100,
      contestMode: "synchronized" as const,
    },
  });
  
  // تتبع الإشعارات وتحديثات الطلاب
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    timestamp: Date;
    read: boolean;
  }>>([]);
  
  // حالة عرض قائمة الإشعارات
  const [showNotifications, setShowNotifications] = useState(false);
  
  // حالة نافذة الرسائل
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [messageType, setMessageType] = useState<'all' | 'room'>('all');
  const [selectedRoomId, setSelectedRoomId] = useState<number | "">("");
  const [messageText, setMessageText] = useState("");
  
  // تمييز إشعار كمقروء
  const markNotificationAsRead = useCallback((id: string) => {
    setNotifications(prev => {
      return prev.map(note => {
        if (note.id === id) {
          return { ...note, read: true };
        }
        return note;
      });
    });
  }, []);
  
  // مسح جميع الإشعارات
  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
    setShowNotifications(false);
    soundService.play('click');
  }, []);
  
  // إرسال رسالة
  const handleSendMessage = useCallback(() => {
    soundService.play('click');
    setIsLoading(true);
    
    // إنشاء البيانات للإرسال
    const payload: {
      type: 'all' | 'room';
      roomId?: number;
      teacherId: number;
      message: string;
    } = {
      type: messageType,
      teacherId: 1, // في التطبيق الحقيقي، سيتم أخذ معرف المعلم من المستخدم الحالي
      message: messageText
    };
    
    // إضافة معرف الغرفة إذا كان محدداً
    if (messageType === 'room' && selectedRoomId !== '') {
      payload.roomId = Number(selectedRoomId);
    }
    
    // إرسال الرسالة إلى الخادم
    sendMessage({
      type: "send_message",
      payload
    });
    
    // نموذج مبسط لعرض نجاح العملية
    setTimeout(() => {
      setIsLoading(false);
      setShowMessageDialog(false);
      setMessageText("");
      
      // إظهار رسالة نجاح
      toast({
        title: "تم إرسال الرسالة بنجاح",
        description: messageType === 'all' 
          ? "تم إرسال رسالتك لجميع المستخدمين في التطبيق" 
          : "تم إرسال رسالتك لطلاب الغرفة المحددة",
        variant: "default"
      });
    }, 1500); // تأخير مصطنع لمحاكاة الطلب
    
  }, [messageType, selectedRoomId, messageText]);

  // الاستماع لتحديثات الغرف من الخادم
  useEffect(() => {
    const handleMessage = (message: any) => {
      if (message.type === "room_created") {
        setRooms(prevRooms => [message.payload, ...prevRooms]);
        toast({
          title: "تم إنشاء الغرفة بنجاح",
          description: `تم إنشاء غرفة "${message.payload.name}" برمز ${message.payload.code}`,
        });
      } else if (message.type === "room_list") {
        setRooms(message.payload);
      } else if (message.type === "student_joined_room") {
        // إضافة إشعار جديد
        const newNotification = {
          id: Date.now().toString(),
          type: "student_joined",
          title: "طالبة جديدة انضمت للغرفة",
          description: `انضمت ${message.payload.studentName} إلى غرفة ${message.payload.roomName}`,
          timestamp: new Date(message.payload.timestamp),
          read: false
        };
        
        setNotifications(prev => [newNotification, ...prev]);
        
        // عرض إشعار توست
        toast({
          title: "طالبة جديدة انضمت للغرفة",
          description: `انضمت ${message.payload.studentName} إلى غرفة ${message.payload.roomName}`,
          variant: "default"
        });
        
        // تشغيل صوت الإشعار
        soundService.play('notification');
      } else if (message.type === "teacher_message") {
        // إذا كانت رسالة من المعلمة (تأكيد الإرسال)
        if (message.payload.teacherId === 1) {
          // إضافة إشعار جديد لسجل الإشعارات
          const msgText = message.payload.message;
          const msgPreview = msgText.length > 30 ? msgText.substring(0, 30) + '...' : msgText;
          
          let description = '';
          if (message.payload.roomId) {
            description = `تم إرسال رسالة إلى غرفة ${message.payload.roomName}: "${msgPreview}"`;
          } else {
            description = `تم إرسال رسالة لجميع المستخدمين: "${msgPreview}"`;
          }
          
          const newNotification = {
            id: Date.now().toString(),
            type: "message_sent",
            title: "تم إرسال رسالة",
            description: description,
            timestamp: new Date(message.payload.timestamp),
            read: true
          };
          
          setNotifications(prev => [newNotification, ...prev]);
        }
      }
    };
    
    addMessageListener(handleMessage);
    
    // طلب قائمة الغرف عند تحميل الصفحة
    sendMessage({
      type: "get_room_list",
      payload: { teacherId: 1 } // في التطبيق الحقيقي، سيتم أخذ معرف المعلم من المستخدم الحالي
    });
    
    return () => {
      // سيتم تنظيف مستمع الرسائل عند إزالة المكون
    };
  }, []);
  
  // إنشاء غرفة جديدة
  const handleCreateRoom = (values: z.infer<typeof roomFormSchema>) => {
    setIsLoading(true);
    
    soundService.play('click');
    
    sendMessage({
      type: "create_room",
      payload: {
        name: values.name,
        teacherId: 1, // في التطبيق الحقيقي، سيتم أخذ معرف المعلم من المستخدم الحالي
        maxPlayers: values.maxPlayers,
        contestMode: values.contestMode,
      }
    });
    
    setIsLoading(false);
    setCreateDialogOpen(false);
    roomForm.reset();
  };
  
  // بدء مسابقة في غرفة
  const startContest = (roomId: number) => {
    soundService.play('click');
    
    sendMessage({
      type: "start_contest",
      payload: {
        roomId,
        teacherId: 1, // في التطبيق الحقيقي، سيتم أخذ معرف المعلم من المستخدم الحالي
        difficulty: "easy"
      }
    });
  };
  
  // فتح لوحة تحكم الغرفة
  const openRoomDashboard = (roomId: number) => {
    soundService.play('click');
    navigate(`/teacher/room/${roomId}`);
  };
  
  return (
    <div className="container-fluid px-2 sm:px-4 md:px-6 py-4 sm:py-8">
      {/* شريط التنقل العلوي */}
      <div className="flex flex-col mb-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between w-full mb-4 gap-3">
          <button 
            className="text-white hover:text-white font-bold rounded-full transition px-3 sm:px-6 py-2 mb-2 sm:mb-0 w-full sm:w-auto text-center text-sm sm:text-base"
            onClick={() => {
              soundService.play('click');
              navigate('/');
            }}
            style={{
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(10px)',
              minWidth: '180px',
              maxWidth: '100%'  
            }}
          >
            ← العودة للصفحة الرئيسية
          </button>
          
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                onClick={() => soundService.play('click')}
                className="rounded-md px-3 sm:px-6 py-2 font-bold w-full sm:w-auto text-sm sm:text-base"
                style={{
                  background: '#00C4A7',
                  border: 'none',
                  minWidth: '130px',
                  maxWidth: '100%'
                }}
              >
                إنشاء غرفة جديدة
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>إنشاء غرفة جديدة</DialogTitle>
                <DialogDescription>
                  قم بإنشاء غرفة جديدة للطالبات للانضمام إليها والمشاركة في المسابقات الرياضية.
                </DialogDescription>
              </DialogHeader>
              
              <Form {...roomForm}>
                <form onSubmit={roomForm.handleSubmit(handleCreateRoom)} className="space-y-4">
                  <FormField
                    control={roomForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>اسم الغرفة</FormLabel>
                        <FormControl>
                          <Input placeholder="الفصل الرابع - الرياضيات" {...field} />
                        </FormControl>
                        <FormDescription>
                          اسم الغرفة الذي سيظهر للطالبات
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={roomForm.control}
                    name="maxPlayers"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>الحد الأقصى للطالبات</FormLabel>
                        <FormControl>
                          <Input type="number" min="2" max="100" placeholder="100" {...field} />
                        </FormControl>
                        <FormDescription>
                          الحد الأقصى لعدد الطالبات في الغرفة (100 كحد أقصى)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={roomForm.control}
                    name="contestMode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>نوع المسابقة</FormLabel>
                        <FormControl>
                          <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            {...field}
                          >
                            <option value="synchronized">متزامنة (تبدأ وتنتهي في نفس الوقت للجميع)</option>
                            <option value="asynchronous">غير متزامنة (يمكن للطالبات اللعب في أي وقت)</option>
                          </select>
                        </FormControl>
                        <FormDescription>
                          نوع المسابقة يحدد كيفية مشاركة الطالبات
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <DialogFooter className="mt-6">
                    <Button
                      type="submit"
                      disabled={isLoading}
                      style={{
                        background: 'linear-gradient(45deg, #10b981, #059669)',
                        border: '2px solid #34d399',
                        boxShadow: '0 0 15px rgba(16, 185, 129, 0.5)'
                      }}
                    >
                      {isLoading ? 'جاري الإنشاء...' : 'إنشاء الغرفة'}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
        
        <div className="flex flex-col md:flex-row items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-center md:text-right mb-4 md:mb-0" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            لوحة تحكم المعلمة
          </h1>
          
          {/* قسم الإشعارات */}
          <div className="flex items-center space-x-2 space-x-reverse">
            <div className="relative">
              <Button 
                onClick={() => setShowNotifications(!showNotifications)}
                variant="outline"
                className="rounded-full p-2 relative"
                style={{ 
                  background: 'rgba(0, 0, 0, 0.2)', 
                  border: '1px solid rgba(255, 255, 255, 0.1)' 
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path></svg>
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                    {notifications.length}
                  </span>
                )}
              </Button>
              
              {showNotifications && (
                <div className="absolute z-50 right-0 mt-2 w-72 xs:w-80 md:w-96 bg-slate-950 rounded-lg shadow-lg p-2 border border-purple-800 max-h-80 overflow-y-auto" style={{ maxWidth: 'calc(100vw - 20px)' }}>
                  <div className="p-2 border-b border-slate-800">
                    <h3 className="text-base font-semibold text-white text-right">الإشعارات</h3>
                  </div>
                  
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-slate-400">
                      لا توجد إشعارات جديدة
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-800">
                      {notifications.map(notification => (
                        <div 
                          key={notification.id} 
                          className={`p-3 hover:bg-slate-900 ${!notification.read ? 'bg-slate-900/50' : ''}`}
                          onClick={() => markNotificationAsRead(notification.id)}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-400 ltr">
                              {new Date(notification.timestamp).toLocaleTimeString('ar-SA')}
                            </span>
                            <h4 className="font-semibold text-white text-right">{notification.title}</h4>
                          </div>
                          <p className="text-sm text-slate-300 mt-1 text-right">{notification.description}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {notifications.length > 0 && (
                    <div className="p-2 border-t border-slate-800 mt-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full text-sm text-slate-400 hover:text-white"
                        onClick={clearAllNotifications}
                      >
                        مسح جميع الإشعارات
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* زر إرسال الرسائل */}
            <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
              <DialogTrigger asChild>
                <Button 
                  onClick={() => {
                    soundService.play('click');
                    setShowMessageDialog(true);
                  }}
                  variant="outline"
                  className="rounded-full p-2"
                  style={{ 
                    background: 'rgba(0, 0, 0, 0.2)', 
                    border: '1px solid rgba(255, 255, 255, 0.1)' 
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="text-right">إرسال رسالة للطالبات</DialogTitle>
                  <DialogDescription className="text-right">
                    يمكنك إرسال رسالة لجميع الطالبات في غرفة محددة أو لجميع المستخدمين.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="messageType" className="text-right block">نوع الرسالة</Label>
                    <select
                      id="messageType"
                      value={messageType}
                      onChange={(e) => {
                        if (e.target.value === 'all' || e.target.value === 'room') {
                          setMessageType(e.target.value);
                        }
                      }}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-right"
                    >
                      <option value="all">جميع المستخدمين</option>
                      <option value="room">غرفة محددة</option>
                    </select>
                  </div>
                  
                  {messageType === 'room' && (
                    <div className="space-y-2">
                      <Label htmlFor="roomSelect" className="text-right block">اختر الغرفة</Label>
                      <select
                        id="roomSelect"
                        value={selectedRoomId}
                        onChange={(e) => setSelectedRoomId(Number(e.target.value))}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-right"
                      >
                        <option value="">-- اختر غرفة --</option>
                        {rooms.map(room => (
                          <option key={room.id} value={room.id}>{room.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="messageText" className="text-right block">نص الرسالة</Label>
                    <textarea
                      id="messageText"
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder="اكتب رسالتك هنا..."
                      className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-right"
                    />
                  </div>
                </div>
                
                <DialogFooter className="mt-6">
                  <Button
                    onClick={handleSendMessage}
                    disabled={isLoading || (messageType === 'room' && !selectedRoomId) || !messageText.trim()}
                    style={{
                      background: 'linear-gradient(45deg, #10b981, #059669)',
                      border: '2px solid #34d399',
                      boxShadow: '0 0 15px rgba(16, 185, 129, 0.5)'
                    }}
                  >
                    {isLoading ? 'جاري الإرسال...' : 'إرسال الرسالة'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rooms.length === 0 ? (
          <p className="col-span-3 text-center py-12 text-gray-300">
            لا توجد غرف حالياً. قم بإنشاء غرفة جديدة لبدء المسابقات.
          </p>
        ) : (
          rooms.map((room) => (
            <Card key={room.id} className="overflow-hidden border-0 shadow-xl" 
              style={{ 
                background: '#451f92', 
                borderRadius: '12px',
                minHeight: '250px'
              }}>
              <CardHeader className="py-3 px-3 sm:px-6 border-b-0">
                <CardTitle className="text-lg sm:text-xl text-white text-center">{room.name}</CardTitle>
                <CardDescription className="text-gray-200 text-center">
                  رمز الغرفة: <span className="font-bold text-white">{room.code}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="px-3 sm:px-6 py-2 pt-0">
                <div className="space-y-2">
                  <div className="flex flex-row-reverse justify-between">
                    <span className="text-white/80 text-sm sm:text-base">الحد الأقصى للطالبات :</span>
                    <span className="font-bold text-white text-right text-sm sm:text-base">{convertToArabicNumerals(room.maxPlayers)}</span>
                  </div>
                  <div className="flex flex-row-reverse justify-between">
                    <span className="text-white/80 text-sm sm:text-base">نوع المسابقة :</span>
                    <span className="font-bold text-white text-right text-sm sm:text-base">
                      {room.contestMode === 'synchronized' ? 'متزامنة' : 'غير متزامنة'}
                    </span>
                  </div>
                  <div className="flex flex-row-reverse justify-between">
                    <span className="text-white/80 text-sm sm:text-base">الحالة :</span>
                    <span className="font-bold text-right text-sm sm:text-base">
                      {room.isActive ? (
                        <span className="text-green-400">نشطة</span>
                      ) : (
                        <span className="text-gray-300">غير نشطة</span>
                      )}
                    </span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="p-3 sm:p-4 pt-0 flex flex-row justify-between gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1 rounded-md text-white/90 border border-white/20 bg-black/20 text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2"
                  onClick={() => {
                    soundService.play('click');
                    openRoomDashboard(room.id);
                  }}
                >
                  لوحة التحكم
                </Button>
                <Button 
                  className="flex-1 rounded-md font-medium text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2"
                  onClick={() => {
                    soundService.play('click');
                    startContest(room.id);
                  }}
                  style={{
                    background: '#00C4A7',
                    border: 'none',
                    color: 'white'
                  }}
                >
                  بدء مسابقة
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
