import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ClientMessage, ServerMessage } from '@shared/schema';

// Global WebSocket instance
let socket: WebSocket | null = null;
const listeners: ((message: ServerMessage) => void)[] = [];
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 300; // زيادة المحاولات بشكل كبير لضمان الاتصال طوال الجلسة
const RECONNECT_DELAY = 1000; // تقليل وقت الانتظار بين المحاولات

// قائمة انتظار للرسائل التي لم يتم إرسالها أثناء قطع الاتصال
const messageQueue: ClientMessage[] = [];

// Estado global de conexión
let isConnected = false;
let lastUserIdSet: number | null = null;

export function connectWebSocket() {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return socket;
  }
  
  // Create WebSocket URL
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/ws`;
  
  console.log(`Connecting to WebSocket: ${wsUrl}`);
  
  try {
    socket = new WebSocket(wsUrl);
    
    socket.onopen = () => {
      console.log('WebSocket connection established');
      // Reset reconnect attempts on successful connection
      reconnectAttempts = 0;
      isConnected = true;
      
      // Si teníamos un userId almacenado, vamos a usarlo para re-identificarnos con el servidor
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      if (currentUser && currentUser.id) {
        console.log(`Re-identifying as user ${currentUser.id} after reconnection`);
        
        // Vamos a enviar un mensaje específico para identificar al usuario en la reconexión
        // Este mensaje dependerá de si el usuario es profesor o estudiante regular
        if (currentUser.isTeacher) {
          // Si es profesor, usamos get_room_list para volver a establecer la conexión
          setTimeout(() => {
            sendMessage({
              type: 'get_room_list',
              payload: { teacherId: currentUser.id }
            });
          }, 500);
        } else {
          // Para estudiantes regulares, simplemente registramos la reconexión
          lastUserIdSet = currentUser.id;
        }
      }
      
      // إرسال الرسائل المؤجلة التي لم يتم إرسالها أثناء قطع الاتصال
      if (messageQueue.length > 0) {
        console.log(`Sending ${messageQueue.length} queued messages after reconnection`);
        
        // نسخة من الصف لتجنب مشاكل التزامن
        const queueCopy = [...messageQueue];
        // تفريغ الصف الأصلي
        messageQueue.length = 0;
        
        // إرسال الرسائل المؤجلة
        queueCopy.forEach(msg => {
          try {
            if (socket && socket.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify(msg));
              console.log('تم إرسال رسالة مؤجلة بعد إعادة الاتصال');
            } else {
              // إعادة الرسالة للصف إذا لم يتم إرسالها
              messageQueue.push(msg);
            }
          } catch (error) {
            console.error('خطأ عند إرسال رسالة مؤجلة بعد إعادة الاتصال:', error);
            // إعادة الرسالة للصف في حالة الخطأ
            messageQueue.push(msg);
          }
        });
      }
      
      // Notify all listeners about connection
      document.dispatchEvent(new CustomEvent('websocket-connected'));
    };
    
    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as ServerMessage;
        console.log('Received WebSocket message:', message);
        listeners.forEach(listener => listener(message));
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };
    
    socket.onclose = (event) => {
      console.log(`WebSocket connection closed: ${event.code} - ${event.reason}`);
      isConnected = false;
      document.dispatchEvent(new CustomEvent('websocket-disconnected'));
      
      // Only attempt to reconnect if we haven't reached the maximum number of attempts
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        console.log(`Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
        
        // الاستراتيجية المتدرجة لإعادة الاتصال مع تأخير متزايد
        const baseDelay = RECONNECT_DELAY;
        const jitter = Math.random() * 300; // إضافة بعض العشوائية لتجنب التزامن في المحاولات
        const delay = baseDelay + jitter;
        
        setTimeout(() => {
          socket = null;
          connectWebSocket();
        }, delay);
        
        // إعادة تحميل الصفحة بعد عدد معين من محاولات الاتصال الفاشلة
        const REFRESH_THRESHOLD = 50; // إعادة تحميل بعد 50 محاولة فاشلة
        if (reconnectAttempts === REFRESH_THRESHOLD) {
          console.warn(`Failed ${REFRESH_THRESHOLD} reconnect attempts. Refreshing page in 5 seconds...`);
          // إظهار رسالة للمستخدم بأن الصفحة سيتم إعادة تحميلها
          const refreshMessage = document.createElement('div');
          refreshMessage.style.position = 'fixed';
          refreshMessage.style.top = '50%';
          refreshMessage.style.left = '50%';
          refreshMessage.style.transform = 'translate(-50%, -50%)';
          refreshMessage.style.background = 'rgba(0, 0, 0, 0.8)';
          refreshMessage.style.color = 'white';
          refreshMessage.style.padding = '20px';
          refreshMessage.style.borderRadius = '10px';
          refreshMessage.style.zIndex = '9999';
          refreshMessage.style.textAlign = 'center';
          refreshMessage.style.fontFamily = 'Arial, sans-serif';
          refreshMessage.innerHTML = `
            <h3>فقدنا الاتصال بالخادم</h3>
            <p>سيتم إعادة تحميل الصفحة تلقائياً خلال خمس ثوانٍ...</p>
          `;
          document.body.appendChild(refreshMessage);
          
          setTimeout(() => {
            window.location.reload();
          }, 5000);
        }
      } else {
        console.error(`Maximum reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) reached. Refreshing page...`);
        // إعادة تحميل الصفحة إذا وصلنا إلى الحد الأقصى من المحاولات
        window.location.reload();
      }
    };
    
    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    return socket;
  } catch (error) {
    console.error('Failed to create WebSocket connection:', error);
    return null;
  }
}

export function sendMessage(message: ClientMessage) {
  console.log('إرسال رسالة:', message);
  
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    console.log('Socket not open, queueing message and connecting...');
    
    // إضافة الرسالة إلى قائمة الانتظار
    messageQueue.push(message);
    console.log(`Message queued. Queue now has ${messageQueue.length} messages.`);
    
    // محاولة الاتصال فوراً
    socket = connectWebSocket();
    
    // لا نقوم ببذل محاولات إضافية هنا لإرسال الرسائل
    // سيتم إرسال الرسائل المنتظرة تلقائياً عند نجاح الاتصال من خلال الدالة onopen
  } else {
    // Socket is already open, send immediately
    console.log('Socket open, sending message immediately');
    try {
      socket.send(JSON.stringify(message));
      console.log('تم إرسال الرسالة فوراً بنجاح');
    } catch (error) {
      console.error('خطأ عند إرسال الرسالة الفورية عبر WebSocket:', error);
      
      // إضافة الرسالة إلى قائمة الانتظار في حالة الفشل
      messageQueue.push(message);
      console.log(`Message added to queue after send failure. Queue now has ${messageQueue.length} messages.`);
      
      // إعادة تشغيل الاتصال في حالة الخطأ
      if (socket.readyState !== WebSocket.OPEN) {
        socket = null;
        connectWebSocket();
      }
    }
  }
}

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const { toast } = useToast();
  
  useEffect(() => {
    // Connect to WebSocket if not already connected
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      connectWebSocket();
    }
    
    // معالجة الشاشة السوداء - إعادة تحميل الصفحة إذا كانت جلسة لعبة نشطة
    const handlePageVisibility = () => {
      // إذا كانت الصفحة مرئية ولكن الاتصال مقطوع
      if (!document.hidden && !isConnected && window.location.pathname.includes('/game/')) {
        // التحقق من أن المستخدم في صفحة لعبة
        console.log('تم اكتشاف صفحة لعبة نشطة مع انقطاع الاتصال');
        
        // محاولة فورية لإعادة الاتصال
        connectWebSocket();
        
        // إذا كان لا يزال منقطعاً بعد 3 ثوانِ نقوم بإعادة تحميل الصفحة
        setTimeout(() => {
          if (!isConnected && window.location.pathname.includes('/game/')) {
            console.log('لا يزال الاتصال مقطوعاً... محاولة إعادة تحميل الصفحة');
            
            // إظهار رسالة للمستخدم
            toast({
              title: "انقطاع الاتصال بالخادم",
              description: "جاري إعادة تحميل الصفحة",
              variant: "destructive"
            });
            
            // إعادة تحميل الصفحة بعد قليل
            setTimeout(() => {
              window.location.reload();
            }, 1500);
          }
        }, 3000);
      }
    };
    
    // إضافة مراقب لتغيير رؤية الصفحة
    document.addEventListener('visibilitychange', handlePageVisibility);
    
    // Handle connection and disconnection events
    const handleConnect = () => {
      console.log('WebSocket connected event received');
      setIsConnected(true);
      toast({
        title: "تم الاتصال بالخادم",
        description: "أنت الآن متصل بخادم اللعب المتعدد",
      });
    };
    
    const handleDisconnect = () => {
      console.log('WebSocket disconnected event received');
      setIsConnected(false);
      toast({
        title: "انقطع الاتصال بالخادم",
        description: "جاري محاولة إعادة الاتصال...",
        variant: "destructive"
      });
      
      // إذا كان المستخدم في صفحة لعبة، نقوم بتفعيل معالج رؤية الصفحة فوراً
      if (window.location.pathname.includes('/game/')) {
        handlePageVisibility();
      }
    };
    
    // Check initial connection status
    if (socket && socket.readyState === WebSocket.OPEN) {
      setIsConnected(true);
    }
    
    // Add event listeners using custom events
    document.addEventListener('websocket-connected', handleConnect);
    document.addEventListener('websocket-disconnected', handleDisconnect);
    
    return () => {
      // Clean up event listeners
      document.removeEventListener('websocket-connected', handleConnect);
      document.removeEventListener('websocket-disconnected', handleDisconnect);
      document.removeEventListener('visibilitychange', handlePageVisibility);
    };
  }, [toast, isConnected]);
  
  const addMessageListener = useCallback((listener: (message: ServerMessage) => void) => {
    listeners.push(listener);
    
    return () => {
      const index = listeners.indexOf(listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    };
  }, []);
  
  return {
    isConnected,
    sendMessage,
    addMessageListener
  };
}
