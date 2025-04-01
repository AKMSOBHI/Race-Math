import { useGameStore } from '@/lib/game/gameState';
import { useLocation } from 'wouter';

export default function NavigationBar() {
  const [_, navigate] = useLocation();
  const { toggleSound, isSoundEnabled } = useGameStore();
  
  const handleExit = () => {
    navigate('/');
  };
  
  return (
    <nav className="relative z-50 bg-deep-blue bg-opacity-80 px-6 py-3 flex justify-between items-center shadow-lg">
      <div className="flex items-center">
        <div className="font-bubblegum text-2xl md:text-3xl text-white">
          <span className="text-ocean-blue">Math</span>
          <span className="text-coral">Bubbles</span>
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        <button 
          className="bg-coral hover:bg-opacity-80 text-white font-bold py-2 px-4 rounded-full transition"
          onClick={handleExit}
        >
          <i className="fas fa-sign-out-alt mr-2"></i>Exit Game
        </button>
        
        <div className="bg-ocean-blue p-2 rounded-full relative">
          <button 
            className="focus:outline-none"
            onClick={toggleSound}
          >
            <i className={`fas ${isSoundEnabled ? 'fa-volume-up' : 'fa-volume-mute'} text-white text-xl`}></i>
          </button>
        </div>
      </div>
    </nav>
  );
}
