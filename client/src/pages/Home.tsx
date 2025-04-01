import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useGameStore } from '@/lib/game/gameState';
import StartGameModal from '@/components/Modals/StartGameModal';
import { useToast } from '@/hooks/use-toast';
import { connectWebSocket, useWebSocket } from '@/lib/websocket';
import { apiRequest } from '@/lib/queryClient';

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
            <span className="text-purple-400">Math</span>
            <span className="text-pink-500">Quest</span>
          </h1>
          <p className="text-xl md:text-2xl text-white">
            Solve equations and conquer the galaxy!
          </p>
        </div>
        
        <div className="space-container p-8 rounded-xl max-w-md w-full">
          <h2 className="text-2xl space-title mb-6 text-center">Ready for launch?</h2>
          
          <button 
            className="w-full space-button hover:bg-opacity-90 text-white font-bold py-4 px-6 rounded-lg text-xl transition flex items-center justify-center"
            onClick={() => setShowStartModal(true)}
            disabled={!currentUser || !isConnected}
          >
            {!isConnected ? (
              <>Establishing connection...</>
            ) : !currentUser ? (
              <>Creating space identity...</>
            ) : (
              <>
                <i className="fas fa-rocket mr-2"></i>
                Launch Mission
              </>
            )}
          </button>
          
          <div className="mt-6 text-center text-sm text-white text-opacity-80">
            Explore solo or team up with fellow astronauts in multiplayer mode!
          </div>
        </div>
      </div>
      
      {/* Start Game Modal */}
      {showStartModal && <StartGameModal />}
    </div>
  );
}
