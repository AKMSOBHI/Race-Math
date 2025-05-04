import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ClientMessage, ServerMessage } from '@shared/schema';

// Global WebSocket instance
let socket: WebSocket | null = null;
const listeners: ((message: ServerMessage) => void)[] = [];
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 20; // زيادة المحاولات لضمان الاتصال حتى بعد فترات طويلة
const RECONNECT_DELAY = 1500; // تقليل وقت الانتظار بين المحاولات

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
      document.dispatchEvent(new CustomEvent('websocket-disconnected'));
      
      // Only attempt to reconnect if we haven't reached the maximum number of attempts
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        console.log(`Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
        
        setTimeout(() => {
          socket = null;
          connectWebSocket();
        }, RECONNECT_DELAY);
      } else {
        console.error(`Maximum reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) reached.`);
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
    console.log('Socket not open, attempting to connect before sending...');
    socket = connectWebSocket();
    
    // Wait for connection to establish before sending
    setTimeout(() => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        console.log('Socket now open, sending delayed message');
        try {
          socket.send(JSON.stringify(message));
          console.log('تم إرسال الرسالة المؤجلة بنجاح');
        } catch (error) {
          console.error('خطأ عند إرسال الرسالة المؤجلة عبر WebSocket:', error);
        }
      } else {
        console.error('WebSocket still not connected, message not sent. State:', socket?.readyState);
        
        // محاولة إعادة المحاولة مرة أخرى بعد مدة أطول
        setTimeout(() => {
          socket = connectWebSocket();
          if (socket && socket.readyState === WebSocket.OPEN) {
            console.log('محاولة أخيرة لإرسال الرسالة');
            try {
              socket.send(JSON.stringify(message));
              console.log('تم إرسال الرسالة في المحاولة الأخيرة');
            } catch (err) {
              console.error('فشل في إرسال الرسالة حتى في المحاولة الأخيرة:', err);
            }
          }
        }, 2000);
      }
    }, 1000);
  } else {
    // Socket is already open, send immediately
    console.log('Socket open, sending message immediately');
    try {
      socket.send(JSON.stringify(message));
      console.log('تم إرسال الرسالة فوراً بنجاح');
    } catch (error) {
      console.error('خطأ عند إرسال الرسالة الفورية عبر WebSocket:', error);
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
    };
  }, [toast]);
  
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
