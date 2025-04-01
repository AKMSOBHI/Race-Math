import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ClientMessage, ServerMessage } from '@shared/schema';

let socket: WebSocket | null = null;
const listeners: ((message: ServerMessage) => void)[] = [];

export function connectWebSocket() {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return socket;
  }
  
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/ws`;
  
  socket = new WebSocket(wsUrl);
  
  socket.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data) as ServerMessage;
      listeners.forEach(listener => listener(message));
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  };
  
  socket.onclose = () => {
    console.log('WebSocket connection closed');
    // Attempt to reconnect after a delay
    setTimeout(() => {
      socket = null;
      connectWebSocket();
    }, 3000);
  };
  
  socket.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
  
  return socket;
}

export function sendMessage(message: ClientMessage) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    socket = connectWebSocket();
    // Allow some time for the socket to connect
    setTimeout(() => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
      } else {
        console.error('WebSocket not connected, message not sent');
      }
    }, 500);
  } else {
    socket.send(JSON.stringify(message));
  }
}

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const { toast } = useToast();
  
  const connect = useCallback(() => {
    const ws = connectWebSocket();
    
    ws.onopen = () => {
      setIsConnected(true);
      toast({
        title: "Connected to game server",
        description: "You are now connected to the multiplayer server",
      });
    };
    
    ws.onclose = () => {
      setIsConnected(false);
      toast({
        title: "Disconnected from game server",
        description: "Attempting to reconnect...",
        variant: "destructive"
      });
    };
    
    return ws;
  }, [toast]);
  
  useEffect(() => {
    const ws = connect();
    
    return () => {
      // No need to close the socket since it's shared
      // Just remove our specific listeners
    };
  }, [connect]);
  
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
