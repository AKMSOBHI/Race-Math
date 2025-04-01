import { FC, useState, useEffect } from 'react';
import { useGameStore } from '@/lib/game/gameState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLocation } from 'wouter';
import { useWebSocket } from '@/lib/websocket';
import { useToast } from '@/hooks/use-toast';

const StartGameModal: FC = () => {
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const { isConnected } = useWebSocket();
  const { 
    currentUser, 
    setCurrentUser,
    createGame, 
    startGame,
    currentGame,
    setShowStartModal,
    isLoading
  } = useGameStore();
  
  const [gameMode, setGameMode] = useState<'single' | 'multi' | null>(null);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [playerName, setPlayerName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Update player name when currentUser changes
  useEffect(() => {
    if (currentUser) {
      setPlayerName(currentUser.username || '');
    }
  }, [currentUser]);
  
  // Debug logs
  useEffect(() => {
    console.log('Current user:', currentUser);
    console.log('WebSocket connected:', isConnected);
    console.log('Current game:', currentGame);
  }, [currentUser, isConnected, currentGame]);
  
  const handleStartGame = () => {
    if (!currentUser) {
      toast({
        title: "Error",
        description: "Please wait for the guest account to be created",
        variant: "destructive"
      });
      return;
    }
    
    if (!isConnected) {
      toast({
        title: "Connection Error",
        description: "Waiting for connection to the game server...",
        variant: "destructive"
      });
      return;
    }
    
    // Make sure player name is not empty
    if (!playerName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your name",
        variant: "destructive"
      });
      return;
    }
    
    // Start processing
    setIsProcessing(true);
    
    try {
      // Update name if changed
      if (playerName !== currentUser.username) {
        setCurrentUser({
          ...currentUser,
          username: playerName
        });
      }
      
      // Create new game
      const isMultiplayer = gameMode === 'multi';
      const maxPlayers = isMultiplayer ? 4 : 1;
      
      console.log('Creating game with parameters:', {
        isMultiplayer,
        maxPlayers,
        difficulty
      });
      
      // Create the game first
      createGame(isMultiplayer, maxPlayers);
      
      // Show toast when game is being created
      toast({
        title: "Creating Game",
        description: "Setting up your math adventure..."
      });
      
      // Start the game after a short delay to ensure game creation is processed
      setTimeout(() => {
        if (currentGame) {
          console.log('Starting game with ID:', currentGame.id);
          startGame(currentGame.id, difficulty);
        } else {
          // If no game was created after the delay, show an error
          toast({
            title: "Game Creation Error",
            description: "Could not create the game. Please try again.",
            variant: "destructive"
          });
          setIsProcessing(false);
        }
      }, 1500);
    } catch (error) {
      console.error('Error starting the game:', error);
      toast({
        title: "Error",
        description: "Failed to start the game. Please try again.",
        variant: "destructive"
      });
      setIsProcessing(false);
    }
  };
  
  const isButtonDisabled = !gameMode || !playerName.trim() || !currentUser || !isConnected || isProcessing || isLoading;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-white text-deep-blue rounded-xl p-6 max-w-md w-full mx-4">
        <h2 className="text-3xl font-bubblegum text-center mb-6">Math Bubbles</h2>
        
        {/* Connection Status */}
        {!isConnected && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-center">
            Connecting to game server... Please wait.
          </div>
        )}
        
        <div className="mb-6">
          <h3 className="text-xl font-bold mb-3">Select Game Mode:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button 
              className={`${
                gameMode === 'single' 
                  ? 'bg-ocean-blue ring-4 ring-ocean-blue' 
                  : 'bg-ocean-blue bg-opacity-80'
              } text-white font-bold py-3 px-4 rounded-lg hover:bg-opacity-90 transition flex flex-col items-center`}
              onClick={() => setGameMode('single')}
              disabled={!isConnected}
            >
              <i className="fas fa-user text-2xl mb-2"></i>
              Single Player
            </button>
            <button 
              className={`${
                gameMode === 'multi' 
                  ? 'bg-coral ring-4 ring-coral' 
                  : 'bg-coral bg-opacity-80'
              } text-white font-bold py-3 px-4 rounded-lg hover:bg-opacity-90 transition flex flex-col items-center`}
              onClick={() => setGameMode('multi')}
              disabled={!isConnected}
            >
              <i className="fas fa-users text-2xl mb-2"></i>
              Multiplayer
            </button>
          </div>
        </div>
        
        <div className="mb-6">
          <h3 className="text-xl font-bold mb-3">Choose Difficulty:</h3>
          <div className="flex space-x-2">
            <button 
              className={`flex-1 py-2 rounded-lg ${
                difficulty === 'easy' 
                  ? 'bg-green-100 border-2 border-green-500 font-bold text-green-700' 
                  : 'bg-gray-100 border-2 border-gray-300 font-bold text-gray-700'
              }`}
              onClick={() => setDifficulty('easy')}
            >
              Easy
            </button>
            <button 
              className={`flex-1 py-2 rounded-lg ${
                difficulty === 'medium' 
                  ? 'bg-yellow-100 border-2 border-yellow-500 font-bold text-yellow-700' 
                  : 'bg-gray-100 border-2 border-gray-300 font-bold text-gray-700'
              }`}
              onClick={() => setDifficulty('medium')}
            >
              Medium
            </button>
            <button 
              className={`flex-1 py-2 rounded-lg ${
                difficulty === 'hard' 
                  ? 'bg-red-100 border-2 border-red-500 font-bold text-red-700' 
                  : 'bg-gray-100 border-2 border-gray-300 font-bold text-gray-700'
              }`}
              onClick={() => setDifficulty('hard')}
            >
              Hard
            </button>
          </div>
        </div>
        
        <div className="mb-6">
          <h3 className="text-xl font-bold mb-3">Your Name:</h3>
          <Input 
            type="text" 
            placeholder="Enter your name" 
            className="w-full p-3 border-2 border-ocean-blue rounded-lg"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            disabled={!isConnected}
          />
        </div>
        
        <button 
          className={`w-full ${
            !isButtonDisabled ? 'bg-seaweed' : 'bg-gray-400'
          } text-white font-bold py-3 px-4 rounded-lg hover:bg-opacity-90 transition text-xl flex items-center justify-center`}
          onClick={handleStartGame}
          disabled={isButtonDisabled}
        >
          {isProcessing || isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Starting...
            </>
          ) : (
            "Start Game"
          )}
        </button>
      </div>
    </div>
  );
};

export default StartGameModal;
