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
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { BadgeCheck, X, Clock, Award } from "lucide-react";
import { useWebSocket } from '@/lib/websocket';
import { soundService } from '@/lib/soundService';
import { convertToArabicNumerals } from '@/lib/utils';

/**
 * لوحة تحكم الغرفة - تعرض تفاصيل مسابقة محددة وأداء الطالبات
 */
export default function RoomDashboard() {
  const [match, params] = useRoute('/teacher/room/:id');
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const { addMessageListener, sendMessage } = useWebSocket();
  
  // حالة الصفحة
  const [room, setRoom] = useState<any>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  
  // الحصول على معرف الغرفة من عنوان URL
  const roomId = match && params ? parseInt(params.id) : null;
  
  // طلب بيانات لوحة التحكم
  const fetchDashboardData = () => {
    if (!roomId) return;
    
    setIsLoading(true);
    sendMessage({
      type: "get_dashboard_data",
      payload: {
        roomId,
        teacherId: 1 // في التطبيق الحقيقي، سيتم أخذ معرف المعلم من المستخدم الحالي
      }
    });
  };
  
  // الاستماع لتحديثات الغرفة من الخادم
  useEffect(() => {
    if (!roomId) {
      navigate('/teacher');
      return;
    }
    
    const handleMessage = (message: any) => {
      if (message.type === "teacher_dashboard_data") {
        if (message.payload.roomId === roomId) {
          setDashboardData(message.payload);
          setIsLoading(false);
        }
      } else if (message.type === "room_list") {
        const foundRoom = message.payload.find((r: any) => r.id === roomId);
        if (foundRoom) {
          setRoom(foundRoom);
        }
      }
    };
    
    addMessageListener(handleMessage);
    
    // طلب بيانات الغرفة ولوحة التحكم
    sendMessage({
      type: "get_room_list",
      payload: { teacherId: 1 }
    });
    
    fetchDashboardData();
    
    // إعداد تحديث دوري للوحة التحكم كل 5 ثوانٍ
    const interval = setInterval(fetchDashboardData, 5000);
    setRefreshInterval(interval);
    
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [roomId]);
  
  // بدء المسابقة
  const startContest = () => {
    if (!roomId) return;
    
    soundService.play('click');
    
    sendMessage({
      type: "start_contest",
      payload: {
        roomId,
        teacherId: 1,
        difficulty: "easy"
      }
    });
    
    toast({
      title: "تم بدء المسابقة",
      description: "تم بدء المسابقة بنجاح ويمكن للطالبات المشاركة الآن",
    });
  };
  
  // إنهاء المسابقة
  const endContest = () => {
    if (!roomId) return;
    
    soundService.play('click');
    
    sendMessage({
      type: "end_contest",
      payload: {
        roomId,
        teacherId: 1
      }
    });
    
    toast({
      title: "تم إنهاء المسابقة",
      description: "تم إنهاء المسابقة بنجاح",
    });
  };
  
  // العودة للوحة المعلمة
  const goBack = () => {
    soundService.play('click');
    navigate('/teacher');
  };
  
  if (!roomId) {
    return <div className="container py-8">جاري العودة إلى لوحة التحكم...</div>;
  }
  
  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Button 
            variant="ghost" 
            onClick={goBack}
            className="mb-2"
          >
            &larr; العودة للوحة التحكم
          </Button>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            {room ? room.name : 'غرفة المسابقة'}
          </h1>
          {room && (
            <p className="text-space-bright">رمز الغرفة: <span className="font-bold">{room.code}</span></p>
          )}
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={endContest}
            className="flex gap-1"
          >
            <X size={16} /> إنهاء المسابقة
          </Button>
          <Button 
            onClick={startContest}
            className="flex gap-1"
            style={{
              background: 'linear-gradient(45deg, #10b981, #059669)',
              border: '2px solid #34d399',
            }}
          >
            <Clock size={16} /> بدء مسابقة جديدة
          </Button>
        </div>
      </div>
      
      {isLoading ? (
        <div className="grid place-items-center h-48">
          <div className="space-y-4 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-space-bright border-t-transparent mx-auto"></div>
            <p>جاري تحميل بيانات المسابقة...</p>
          </div>
        </div>
      ) : (
        <div>
          {dashboardData ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* قسم الإحصائيات */}
              <div className="lg:col-span-4">
                <Card>
                  <CardHeader>
                    <CardTitle>إحصائيات المسابقة</CardTitle>
                    <CardDescription>إحصائيات عامة عن أداء الطالبات في المسابقة</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-lg bg-slate-900 p-4 text-center">
                        <div className="text-2xl font-bold mb-1" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                          {convertToArabicNumerals(dashboardData.activeStudents.length)}
                        </div>
                        <p className="text-sm text-slate-300">عدد الطالبات المشاركات</p>
                      </div>
                      
                      <div className="rounded-lg bg-slate-900 p-4 text-center">
                        <div className="text-2xl font-bold mb-1" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                          {convertToArabicNumerals(dashboardData.gameStats.questionsAnswered)}
                        </div>
                        <p className="text-sm text-slate-300">الأسئلة المجاب عليها</p>
                      </div>
                      
                      <div className="rounded-lg bg-slate-900 p-4 text-center">
                        <div className="text-2xl font-bold mb-1" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                          {convertToArabicNumerals(dashboardData.gameStats.correctAnswers)}
                        </div>
                        <p className="text-sm text-slate-300">الإجابات الصحيحة</p>
                      </div>
                      
                      <div className="rounded-lg bg-slate-900 p-4 text-center">
                        <div className="text-2xl font-bold mb-1" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                          {convertToArabicNumerals(Math.round(dashboardData.gameStats.averageScore))}
                        </div>
                        <p className="text-sm text-slate-300">متوسط النقاط</p>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <span>نسبة الإجابات الصحيحة</span>
                        <span className="font-bold">
                          {dashboardData.gameStats.questionsAnswered > 0 ? 
                            convertToArabicNumerals(Math.round((dashboardData.gameStats.correctAnswers / dashboardData.gameStats.questionsAnswered) * 100)) + '%' :
                            '٠%'}
                        </span>
                      </div>
                      <Progress 
                        value={
                          dashboardData.gameStats.questionsAnswered > 0 ? 
                            (dashboardData.gameStats.correctAnswers / dashboardData.gameStats.questionsAnswered) * 100 :
                            0
                        } 
                        className="h-2" 
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* قائمة الطالبات المشاركات */}
              <div className="lg:col-span-8">
                <Card>
                  <CardHeader>
                    <CardTitle>قائمة الطالبات المشاركات</CardTitle>
                    <CardDescription>تفاصيل أداء الطالبات في الوقت الحقيقي</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {dashboardData.activeStudents.length === 0 ? (
                      <div className="text-center py-6 text-slate-400">
                        لا يوجد طالبات مشاركات بعد. قم بمشاركة رمز الغرفة مع الطالبات.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="text-sm text-slate-300">
                              <th className="text-right pb-2">الطالبة</th>
                              <th className="text-center pb-2">الحالة</th>
                              <th className="text-center pb-2">التقدم</th>
                              <th className="text-center pb-2">النقاط</th>
                            </tr>
                          </thead>
                          <tbody>
                            {/* فرز الطالبات حسب النقاط */}
                            {[...dashboardData.activeStudents]
                              .sort((a, b) => b.score - a.score)
                              .map((student, index) => (
                                <tr key={student.id} className="border-t border-slate-800">
                                  <td className="py-3 pr-2 font-medium">
                                    <div className="flex items-center">
                                      <div className="w-6 text-slate-500 ml-2">
                                        {convertToArabicNumerals(index + 1)}
                                      </div>
                                      {student.username}
                                      {index === 0 && <Award className="text-yellow-500 ml-1" size={16} />}
                                    </div>
                                  </td>
                                  <td className="py-3 text-center">
                                    {student.status === 'completed' ? (
                                      <span className="text-green-500 flex items-center justify-center">
                                        <BadgeCheck size={16} className="mr-1" /> أكملت
                                      </span>
                                    ) : (
                                      <span className="text-blue-500">قيد اللعب</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-2">
                                    <div className="flex flex-col">
                                      <Progress value={student.progress * 10} className="h-2 mb-1" />
                                      <span className="text-xs text-slate-400 text-center">
                                        {convertToArabicNumerals(student.progress)}%
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-3 text-center font-medium" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                                    {convertToArabicNumerals(student.score)}
                                  </td>
                                </tr>
                              ))
                            }
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400">
              لا تتوفر بيانات عن المسابقة حالياً. قم ببدء مسابقة جديدة لعرض البيانات.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
