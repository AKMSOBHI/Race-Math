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
  
  // Monitor game creation and start game when created
  useEffect(() => {
    // If we're in the processing state and have a game, start it
    if (isProcessing && currentGame && currentGame.status === 'waiting') {
      console.log('Game was created, starting game with ID:', currentGame.id);
      startGame(currentGame.id, difficulty);
    }
    
    // Set a timeout to cancel the processing state if game creation takes too long
    let timeoutId: NodeJS.Timeout | null = null;
    
    if (isProcessing) {
      timeoutId = setTimeout(() => {
        // If we're still processing after 5 seconds, something went wrong
        if (isProcessing && (!currentGame || currentGame.status === 'waiting')) {
          setIsProcessing(false);
          toast({
            title: "Game Creation Error",
            description: "Could not create the game. Please try again.",
            variant: "destructive"
          });
        }
      }, 5000);
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [currentGame, isProcessing, difficulty, startGame, toast]);
  
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
      
      // We will listen for game updates in the useEffect below
      // Instead of using setTimeout, we'll use the useEffect to monitor changes to currentGame
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
      <div className="space-container rounded-xl p-6 max-w-md w-full mx-4">
        <h2 className="text-3xl space-title text-center mb-6">Math Quest</h2>
        
        {/* Connection Status */}
        {!isConnected && (
          <div className="mb-4 p-3 bg-purple-900 bg-opacity-50 border border-pink-500 text-pink-200 rounded-lg text-center">
            Establishing connection to mission control... Please wait.
          </div>
        )}
        
        <div className="mb-6">
          <h3 className="text-xl text-purple-300 font-bold mb-3">Select Mission Type:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button 
              className={`${
                gameMode === 'single' 
                  ? 'bg-space-purple ring-2 ring-space-bright' 
                  : 'bg-purple-900 bg-opacity-80'
              } text-white font-bold py-3 px-4 rounded-lg hover:bg-opacity-90 transition flex flex-col items-center`}
              onClick={() => setGameMode('single')}
              disabled={!isConnected}
              style={{
                background: gameMode === 'single' 
                  ? 'linear-gradient(45deg, var(--space-purple), var(--space-blue))' 
                  : 'rgba(91, 33, 182, 0.8)'
              }}
            >
              <i className="fas fa-user-astronaut text-2xl mb-2"></i>
              Solo Mission
            </button>
            <button 
              className={`${
                gameMode === 'multi' 
                  ? 'ring-2 ring-space-bright' 
                  : 'bg-opacity-80'
              } text-white font-bold py-3 px-4 rounded-lg hover:bg-opacity-90 transition flex flex-col items-center`}
              onClick={() => setGameMode('multi')}
              disabled={!isConnected}
              style={{
                background: gameMode === 'multi' 
                  ? 'linear-gradient(45deg, var(--space-pink), var(--space-purple))' 
                  : 'rgba(219, 39, 119, 0.8)'
              }}
            >
              <i className="fas fa-users text-2xl mb-2"></i>
              Team Mission
            </button>
          </div>
        </div>
        
        <div className="mb-6">
          <h3 className="text-xl text-purple-300 font-bold mb-3">Mission Difficulty:</h3>
          <div className="flex space-x-2">
            <button 
              className={`flex-1 py-2 rounded-lg ${
                difficulty === 'easy' 
                  ? 'border-2 font-bold' 
                  : 'bg-gray-800 border-2 border-gray-700 font-bold text-gray-400'
              }`}
              onClick={() => setDifficulty('easy')}
              style={{
                backgroundColor: difficulty === 'easy' ? 'rgba(0, 245, 212, 0.2)' : '',
                borderColor: difficulty === 'easy' ? 'var(--space-bright)' : '',
                color: difficulty === 'easy' ? 'var(--space-bright)' : ''
              }}
            >
              Cadet
            </button>
            <button 
              className={`flex-1 py-2 rounded-lg ${
                difficulty === 'medium' 
                  ? 'border-2 font-bold' 
                  : 'bg-gray-800 border-2 border-gray-700 font-bold text-gray-400'
              }`}
              onClick={() => setDifficulty('medium')}
              style={{
                backgroundColor: difficulty === 'medium' ? 'rgba(123, 44, 191, 0.2)' : '',
                borderColor: difficulty === 'medium' ? 'var(--space-purple)' : '',
                color: difficulty === 'medium' ? 'var(--space-purple)' : ''
              }}
            >
              Officer
            </button>
            <button 
              className={`flex-1 py-2 rounded-lg ${
                difficulty === 'hard' 
                  ? 'border-2 font-bold' 
                  : 'bg-gray-800 border-2 border-gray-700 font-bold text-gray-400'
              }`}
              onClick={() => setDifficulty('hard')}
              style={{
                backgroundColor: difficulty === 'hard' ? 'rgba(229, 0, 164, 0.2)' : '',
                borderColor: difficulty === 'hard' ? 'var(--space-pink)' : '',
                color: difficulty === 'hard' ? 'var(--space-pink)' : ''
              }}
            >
              Captain
            </button>
          </div>
        </div>
        
        <div className="mb-6">
          <h3 className="text-xl text-purple-300 font-bold mb-3">Astronaut Name:</h3>
          <Input 
            type="text" 
            placeholder="Enter your code name" 
            className="w-full p-3 bg-gray-900 border-2 border-purple-500 rounded-lg text-white"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            disabled={!isConnected}
          />
        </div>
        
        <button 
          className="w-full space-button py-3 px-4 rounded-lg transition text-xl flex items-center justify-center"
          onClick={handleStartGame}
          disabled={isButtonDisabled}
          style={{
            opacity: isButtonDisabled ? 0.6 : 1,
            cursor: isButtonDisabled ? 'not-allowed' : 'pointer'
          }}
        >
          {isProcessing || isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Initiating Launch Sequence...
            </>
          ) : (
            <>
              <i className="fas fa-rocket mr-2"></i>
              Launch Mission
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default StartGameModal;
