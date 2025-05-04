import React, { useEffect, useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, X, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useWebSocket } from '@/lib/websocket';
import { soundService } from '@/lib/soundService';
import { convertToArabicNumerals } from '@/lib/utils';

interface StudentApprovalProps {
  roomId: number;
  teacherId: number;
}

interface WaitingStudent {
  id: number;
  username: string;
  isApproved: boolean;
  joinedAt: string;
}

/**
 * مكون موافقة المعلمة على طلبات الطالبات
 */
export function TeacherStudentApproval({ roomId, teacherId }: StudentApprovalProps) {
  const { toast } = useToast();
  const { addMessageListener, sendMessage } = useWebSocket();
  
  // حالة المكون
  const [waitingStudents, setWaitingStudents] = useState<WaitingStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedSection, setExpandedSection] = useState(true);

  // جلب قائمة الطالبات في الانتظار
  const fetchWaitingStudents = (showLoading = false) => {
    // نعرض حالة التحميل فقط عند التحميل الأولي
    if (showLoading) {
      setIsLoading(true);
    }
    
    sendMessage({
      type: "get_waiting_students",
      payload: { roomId, teacherId }
    });
  };

  // الاستماع لرسائل الخادم
  useEffect(() => {
    const handleMessage = (message: any) => {
      if (message.type === "waiting_students_list") {
        if (message.payload.roomId === roomId) {
          setWaitingStudents(message.payload.students);
          setIsLoading(false);
        }
      } else if (message.type === "student_approval_updated") {
        if (message.payload.roomId === roomId) {
          // تحديث قائمة الطلاب بعد الموافقة/الرفض
          fetchWaitingStudents();
          
          // تشغيل صوت مناسب
          soundService.play(message.payload.isApproved ? 'correct' : 'click');
        }
      }
    };

    addMessageListener(handleMessage);
    // تحميل البيانات للمرة الأولى مع عرض مؤشر التحميل
    fetchWaitingStudents(true);

    // إعداد تحديث دوري للقائمة كل 30 ثانية بدون عرض مؤشر التحميل
    const interval = setInterval(() => fetchWaitingStudents(false), 30000);
    
    return () => {
      clearInterval(interval);
    };
  }, [roomId, teacherId]);

  // الموافقة على الطالبة
  const approveStudent = (studentId: number) => {
    soundService.play('click');
    sendMessage({
      type: "approve_student",
      payload: {
        roomId,
        teacherId,
        studentId,
        approve: true
      }
    });
    
    // تحديث حالة الطالبة محلياً فوراً للاستجابة السريعة
    setWaitingStudents(prev => 
      prev.map(student => 
        student.id === studentId ? { ...student, isApproved: true } : student
      )
    );
    
    toast({
      title: "تمت الموافقة",
      description: "تمت الموافقة على الطالبة بنجاح",
    });
  };

  // رفض الطالبة
  const rejectStudent = (studentId: number) => {
    soundService.play('click');
    sendMessage({
      type: "approve_student",
      payload: {
        roomId,
        teacherId,
        studentId,
        approve: false
      }
    });
    
    // تحديث حالة الطالبة محلياً فوراً للاستجابة السريعة
    setWaitingStudents(prev => 
      prev.filter(student => student.id !== studentId)
    );
    
    toast({
      title: "تم الرفض",
      description: "تم رفض طلب انضمام الطالبة",
    });
  };

  // عدد الطالبات في الانتظار
  const pendingCount = waitingStudents.filter(s => !s.isApproved).length;

  return (
    <Card className="mt-6">
      <CardHeader 
        className="cursor-pointer text-center" 
        onClick={() => setExpandedSection(!expandedSection)}
        style={{
          background: pendingCount > 0 ? 'rgba(255, 170, 0, 0.1)' : undefined,
          borderBottom: pendingCount > 0 ? '1px solid rgba(255, 170, 0, 0.2)' : undefined
        }}
      >
        <div className="flex justify-between items-center">
          <div></div>
          <CardTitle className="text-lg flex items-center">
            <div className="flex items-center">
              {pendingCount > 0 && (
                <Badge className="mr-2 bg-amber-500">
                  {convertToArabicNumerals(pendingCount)}
                </Badge>
              )}
              طلبات الإنضمام
            </div>
          </CardTitle>
          <div className="text-sm">
            {expandedSection ? '▲' : '▼'}
          </div>
        </div>
        <CardDescription className="text-center">
          {pendingCount > 0 ? 'يوجد طالبات في انتظار الموافقة' : 'لا يوجد طلبات انضمام جديدة'}
        </CardDescription>
      </CardHeader>
      
      {expandedSection && (
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-space-bright border-t-transparent"></div>
            </div>
          ) : waitingStudents.length === 0 ? (
            <div className="text-center py-4 text-slate-400">
              <AlertCircle className="h-6 w-6 mx-auto mb-2" />
              لا يوجد طالبات في انتظار الموافقة
            </div>
          ) : (
            <div className="space-y-4">
              {waitingStudents.map(student => (
                <div 
                  key={student.id} 
                  className="flex items-center justify-between p-3 rounded-lg animate-fadeIn"
                  style={{
                    background: student.isApproved
                      ? 'rgba(72, 187, 120, 0.1)'
                      : 'rgba(255, 170, 0, 0.1)',
                    border: `1px solid ${student.isApproved
                      ? 'rgba(72, 187, 120, 0.3)'
                      : 'rgba(255, 170, 0, 0.3)'}`
                  }}
                >
                  <div>
                    <div className="font-medium">{student.username}</div>
                    <div className="text-xs text-slate-400">
                      انضمت {new Date(student.joinedAt).toLocaleTimeString('ar-SA')}
                    </div>
                  </div>
                  
                  {student.isApproved ? (
                    <Badge className="bg-green-600 px-2 py-1 text-xs">
                      <Check className="h-3 w-3 mr-1" /> تمت الموافقة
                    </Badge>
                  ) : (
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        className="bg-red-600 hover:bg-red-700 h-8 px-2"
                        onClick={() => rejectStudent(student.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        className="bg-green-600 hover:bg-green-700 h-8 px-2"
                        onClick={() => approveStudent(student.id)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
