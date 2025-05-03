import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useWebSocket } from '@/lib/websocket';
import { ServerMessage } from '@shared/schema';
import { soundService } from '@/lib/soundService';

interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const { addMessageListener } = useWebSocket();
  
  // استماع لرسائل المعلمة
  useEffect(() => {
    const messageListener = (message: ServerMessage) => {
      if (message.type === "teacher_message") {
        // إضافة إشعار جديد
        const newNotification = {
          id: Date.now().toString(),
          title: 'رسالة من المعلمة',
          message: message.payload.message,
          timestamp: new Date(message.payload.timestamp),
          read: false
        };
        
        setNotifications(prev => [newNotification, ...prev]);
        
        // تشغيل صوت الإشعار
        try {
          soundService.play('notification');
        } catch (e) {
          console.log("خطأ في تشغيل صوت الإشعار", e);
        }
      }
    };
    
    // إضافة المستمع للرسائل
    const cleanupListener = addMessageListener(messageListener);
    
    return () => {
      // تنظيف المستمع عند إلغاء تحميل المكون
      if (typeof cleanupListener === 'function') {
        cleanupListener();
      }
    };
  }, [addMessageListener]);
  
  // تمييز إشعار كمقروء
  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(note => 
        note.id === id ? { ...note, read: true } : note
      )
    );
  };
  
  // حذف إشعار
  const removeNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // منع انتشار الحدث للعناصر الأب
    setNotifications(prev => prev.filter(note => note.id !== id));
  };
  
  // حذف جميع الإشعارات
  const clearAllNotifications = () => {
    setNotifications([]);
    try {
      soundService.play('click');
    } catch (e) {
      console.log("خطأ في تشغيل صوت النقر", e);
    }
  };
  
  // عدد الإشعارات غير المقروءة
  const unreadCount = notifications.filter(note => !note.read).length;
  
  return (
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
        <Bell className="text-white" size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
            {unreadCount}
          </span>
        )}
      </Button>
      
      {showNotifications && (
        <div 
          className="fixed z-50 left-1/2 transform -translate-x-1/2 mt-2 bg-slate-950 rounded-lg shadow-lg p-1 border border-purple-800 max-h-80 overflow-y-auto" 
          style={{ maxWidth: 'calc(100vw - 40px)', fontSize: '0.9rem', top: '80px', width: '300px' }}
        >
          <div className="p-1 border-b border-slate-800">
            <h3 className="text-sm font-semibold text-white text-right">الإشعارات</h3>
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
                  className={`p-3 hover:bg-slate-900 relative ${!notification.read ? 'bg-slate-900/50' : ''}`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="absolute top-2 left-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 bg-slate-700 rounded-full hover:bg-red-700"
                      onClick={(e) => removeNotification(notification.id, e)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between mt-1 mb-1">
                    <span className="text-xs text-slate-400 rtl">
                      {new Date(notification.timestamp).toLocaleTimeString('ar-SA')}
                    </span>
                    <h4 className="font-semibold text-white text-right">{notification.title}</h4>
                  </div>
                  <p className="text-sm text-slate-300 mt-1 text-right pr-1">{notification.message}</p>
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
  );
}
