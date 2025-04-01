import { useGameStore } from '@/lib/game/gameState';
import { useLocation } from 'wouter';

export default function NavigationBar() {
  const [_, navigate] = useLocation();
  const { toggleSound, isSoundEnabled } = useGameStore();
  
  const handleExit = () => {
    navigate('/');
  };
  
  return (
    <nav className="relative z-50 space-container px-6 py-3 flex justify-between items-center shadow-lg border-b-2" style={{ borderColor: 'var(--space-bright)' }}>
      <div className="flex items-center">
        <div className="space-title text-2xl md:text-3xl">
          <span className="text-purple-400">Math</span>
          <span className="text-pink-500">Quest</span>
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        <button 
          className="space-button text-white font-bold py-2 px-4 rounded-full transition"
          onClick={handleExit}
          style={{
            background: 'linear-gradient(45deg, var(--space-pink), var(--space-purple))'
          }}
        >
          <i className="fas fa-door-open mr-2"></i>Abort Mission
        </button>
        
        <div 
          className="p-2 rounded-full relative"
          style={{
            background: isSoundEnabled 
              ? 'rgba(0, 245, 212, 0.3)' 
              : 'rgba(229, 0, 164, 0.3)',
            border: `1px solid ${isSoundEnabled ? 'var(--space-bright)' : 'var(--space-pink)'}`,
            boxShadow: `0 0 10px ${isSoundEnabled ? 'var(--space-bright)' : 'var(--space-pink)'}`
          }}
        >
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
