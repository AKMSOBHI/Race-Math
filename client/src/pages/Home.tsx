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
    <div className="min-h-screen w-full overflow-hidden font-nunito text-white relative bg-gradient-to-b from-deep-blue to-ocean-blue">
      {/* Ocean background */}
      <div className="ocean-bg"></div>
      
      {/* Main content */}
      <div className="container mx-auto px-4 py-6 flex flex-col items-center justify-center min-h-screen relative z-10">
        <div className="text-center mb-12">
          <h1 className="font-bubblegum text-5xl md:text-7xl mb-4">
            <span className="text-ocean-blue">Math</span>
            <span className="text-coral">Bubbles</span>
          </h1>
          <p className="text-xl md:text-2xl text-white">
            Learn mathematics in a fun, underwater adventure!
          </p>
        </div>
        
        <div className="bg-deep-blue bg-opacity-70 p-8 rounded-xl shadow-2xl max-w-md w-full">
          <h2 className="text-2xl font-bubblegum mb-6 text-center">Ready to play?</h2>
          
          <button 
            className="w-full bg-coral hover:bg-opacity-90 text-white font-bold py-4 px-6 rounded-lg text-xl transition flex items-center justify-center"
            onClick={() => setShowStartModal(true)}
            disabled={!currentUser || !isConnected}
          >
            {!isConnected ? (
              <>Connecting to server...</>
            ) : !currentUser ? (
              <>Creating guest account...</>
            ) : (
              <>
                <i className="fas fa-play mr-2"></i>
                Start Game
              </>
            )}
          </button>
          
          <div className="mt-6 text-center text-sm text-white text-opacity-80">
            Play solo or challenge your friends in our multiplayer mode!
          </div>
        </div>
      </div>
      
      {/* Start Game Modal */}
      {showStartModal && <StartGameModal />}
    </div>
  );
}
