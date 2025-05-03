import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useGameStore } from '@/lib/game/gameState';
import StartGameModal from '@/components/Modals/StartGameModal';
import TeacherLoginModal from '@/components/Modals/TeacherLoginModal';
import { useToast } from '@/hooks/use-toast';
import { connectWebSocket, useWebSocket } from '@/lib/websocket';
import { apiRequest } from '@/lib/queryClient';
import { soundService } from '@/lib/soundService';

export default function Home() {
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const { 
    setCurrentUser, 
    currentUser,
    currentGame,
    handleServerMessage,
    showStartModal,
    setShowStartModal
  } = useGameStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [showTeacherLogin, setShowTeacherLogin] = useState(false);
  const { isConnected, addMessageListener } = useWebSocket();
  
  // Initialize websocket and listeners
  useEffect(() => {
    connectWebSocket();
    
    const removeListener = addMessageListener((message) => {
      handleServerMessage(message);
    });
    
    return () => {
      removeListener();
    };
  }, [addMessageListener, handleServerMessage]);
  
  // Auto-navigate to game if we have a currentGame
  useEffect(() => {
    if (currentGame) {
      navigate(`/game/${currentGame.id}`);
    }
  }, [currentGame, navigate]);
  
  // Function to create a guest user
  const createGuestUser = async () => {
    try {
      setIsLoading(true);
      const response = await apiRequest('POST', '/api/users/guest', {});
      const user = await response.json();
      setCurrentUser(user);
      setShowStartModal(true);
      toast({
        title: "Welcome!",
        description: `You're playing as ${user.username}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create guest user",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Auto-create guest user if not logged in
  useEffect(() => {
    if (!currentUser && !isLoading) {
      createGuestUser();
    }
  }, [currentUser, isLoading]);
  
  // نريد إغلاق StartGameModal بشكل افتراضي
  useEffect(() => {
    // تأكد من إغلاق النافذة المنبثقة
    setTimeout(() => {
      setShowStartModal(false);
    }, 500);
  }, [setShowStartModal]);
  
  // For debugging
  useEffect(() => {
    console.log("WebSocket connected:", isConnected);
    console.log("Current user:", currentUser);
    console.log("Current game:", currentGame);
    console.log("Show start modal:", showStartModal);
  }, [isConnected, currentUser, currentGame, showStartModal]);
  
  return (
    <div className="min-h-screen w-full overflow-hidden text-white relative">
      {/* Space background */}
      <div className="space-bg">
        <div className="stars"></div>
        <div className="planet planet-1"></div>
        <div className="planet planet-2"></div>
        <div className="planet planet-3"></div>
      </div>
      
      {/* Main content */}
      <div className="container mx-auto px-4 py-6 flex flex-col items-center justify-center min-h-screen relative z-10">
        <div className="text-center mb-12">
          <h1 className="space-title text-5xl md:text-7xl mb-4">
            <span className="text-purple-400">سباق</span>
            <span className="text-pink-500"> الرياضيات</span>
          </h1>
          <p className="text-xl md:text-2xl text-white">
            أطلقي قدراتك وانطلقي نحو النجوم
          </p>
        </div>
        
        <div className="space-container p-8 rounded-xl max-w-md w-full">
          <h2 className="text-2xl space-title mb-6 text-center">اختر ما تريد</h2>
          
          <div className="flex flex-col gap-4">
            {/* زر بدء لعبة جديدة */}
            <button 
              className="w-full space-button hover:bg-opacity-90 text-white font-bold py-3 sm:py-4 px-4 sm:px-6 rounded-lg text-lg sm:text-xl transition flex items-center justify-center"
              onClick={() => {
                soundService.play('click');
                setShowStartModal(true);
              }}
              disabled={!currentUser || !isConnected}
              style={{
                background: 'linear-gradient(45deg, #10b981, #059669)',
                border: '2px solid #34d399',
                minHeight: '55px',
                boxShadow: '0 0 15px rgba(16, 185, 129, 0.4)'
              }}
            >
              {!isConnected ? (
                <>جاري الاتصال...</>
              ) : !currentUser ? (
                <>جاري إنشاء الحساب...</>
              ) : (
                <>
                  <i className="fas fa-rocket mr-2"></i>
                  بدء لعبة جديدة
                </>
              )}
            </button>
            
            {/* زر الانضمام للغرفة */}
            <button 
              className="w-full hover:bg-opacity-90 text-white font-bold py-3 sm:py-4 px-4 sm:px-6 rounded-lg text-lg sm:text-xl transition flex items-center justify-center"
              onClick={() => {
                soundService.play('click');
                navigate('/join');
              }}
              disabled={!currentUser || !isConnected}
              style={{
                background: 'linear-gradient(45deg, #7c3aed, #4c1d95)',
                border: '2px solid #8b5cf6',
                minHeight: '55px',
                boxShadow: '0 0 15px rgba(124, 58, 237, 0.4)'
              }}
            >
              <i className="fas fa-users mr-2"></i>
              الانضمام لغرفة
            </button>
            
            {/* زر صفحة المعلمة */}
            <button 
              className="w-full hover:bg-opacity-90 text-white font-bold py-3 sm:py-4 px-4 sm:px-6 rounded-lg text-lg sm:text-xl transition flex items-center justify-center"
              onClick={() => {
                soundService.play('click');
                setShowTeacherLogin(true);
              }}
              disabled={!currentUser || !isConnected}
              style={{
                background: 'linear-gradient(45deg, #3b82f6, #1d4ed8)',
                border: '2px solid #60a5fa',
                minHeight: '55px',
                boxShadow: '0 0 15px rgba(59, 130, 246, 0.4)'
              }}
            >
              <i className="fas fa-chalkboard-teacher mr-2"></i>
              صفحة المعلمة
            </button>
          </div>
          
          <div className="mt-6 text-center text-sm text-white text-opacity-80">
            بإمكانك اللعب منفرداً أو الانضمام لغرفة مسابقة مع زميلاتك!
          </div>
          
          <div className="mt-4 text-center text-xs text-white text-opacity-50">
            مشروع الطالبة: جوانة أحمد صبحي
          </div>
        </div>
      </div>
      
      {/* Start Game Modal */}
      {showStartModal && <StartGameModal />}
      
      {/* Teacher Login Modal */}
      {showTeacherLogin && (
        <TeacherLoginModal 
          isOpen={showTeacherLogin} 
          onClose={() => setShowTeacherLogin(false)}
        />
      )}
    </div>
  );
}
