import React, { useEffect, useState } from 'react';
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
        
        <h1 className="text-3xl font-bold text-center mb-8" style={{ fontFamily: 'Orbitron, sans-serif' }}>
          لوحة تحكم المعلمة
        </h1>
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
