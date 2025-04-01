import { FC, useState } from 'react';
import { useGameStore } from '@/lib/game/gameState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLocation } from 'wouter';

const StartGameModal: FC = () => {
  const [_, navigate] = useLocation();
  const { 
    currentUser, 
    setCurrentUser,
    createGame, 
    setShowStartModal 
  } = useGameStore();
  
  const [gameMode, setGameMode] = useState<'single' | 'multi' | null>(null);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [playerName, setPlayerName] = useState(currentUser?.username || '');
  
  const handleStartGame = () => {
    if (!currentUser) return;
    
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
    
    createGame(isMultiplayer, maxPlayers);
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-white text-deep-blue rounded-xl p-6 max-w-md w-full mx-4">
        <h2 className="text-3xl font-bubblegum text-center mb-6">Math Bubbles</h2>
        
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
          />
        </div>
        
        <button 
          className={`w-full ${
            gameMode ? 'bg-seaweed' : 'bg-gray-400'
          } text-white font-bold py-3 px-4 rounded-lg hover:bg-opacity-90 transition text-xl`}
          onClick={handleStartGame}
          disabled={!gameMode}
        >
          Start Game
        </button>
      </div>
    </div>
  );
};

export default StartGameModal;
