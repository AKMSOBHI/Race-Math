import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Game from "@/pages/Game";
import TeacherDashboard from "@/pages/TeacherDashboard";
import RoomDashboard from "@/pages/RoomDashboard";
import JoinRoom from "@/pages/JoinRoom";
import { useEffect } from "react";
import { soundService } from "@/lib/soundService";

function Router() {
  return (
    <Switch>
      {/* الصفحات العامة */}
      <Route path="/" component={Home} />
      <Route path="/game" component={Game} />
      <Route path="/game/:gameId" component={Game} />
      
      {/* صفحات الغرف والانضمام للطالبات */}
      <Route path="/join" component={JoinRoom} />
      <Route path="/join-room" component={JoinRoom} />
      
      {/* صفحات المعلمة */}
      <Route path="/teacher" component={TeacherDashboard} />
      <Route path="/teacher/room/:id" component={RoomDashboard} />
      
      {/* صفحة 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // استدعاء خدمة الصوت عند بدء التطبيق
  useEffect(() => {
    console.log('تهيئة نظام الصوت...');
    // تجهيز الأصوات وتشغيل الموسيقى الخلفية
    try {
      soundService.playBackgroundMusic();
    } catch (error) {
      console.error('خطأ في تهيئة الأصوات:', error);
    }
    
    // تنظيف الأصوات عند إغلاق التطبيق
    return () => {
      soundService.stopAll();
    };
  }, []);
  
  return (
    <>
      <Router />
      <Toaster />
    </>
  );
}

export default App;
