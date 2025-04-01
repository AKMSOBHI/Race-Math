import { FC, useMemo } from 'react';
import { getRandomAnimationDelay } from '@/lib/game/questions';

interface BubbleProps {
  text: string;
  isQuestion?: boolean;
  position?: { top?: string; left?: string } | null;
  onClick: () => void;
}

const Bubble: FC<BubbleProps> = ({ text, isQuestion = false, position, onClick }) => {
  // Generate a unique animation class
  const animationClass = useMemo(() => getRandomAnimationDelay(), []);
  
  // Generate random rotation for asteroids
  const rotation = useMemo(() => Math.floor(Math.random() * 360), []);
  
  // Default position if none is provided or if top/left are missing
  const top = position?.top || `${Math.floor(30 + Math.random() * 40)}%`;
  const left = position?.left || `${Math.floor(20 + Math.random() * 60)}%`;
  
  // Create space-themed styles for the bubble
  const bubbleStyles = isQuestion
    ? {
        background: 'linear-gradient(45deg, rgba(123, 44, 191, 0.8), rgba(36, 0, 70, 0.8))',
        border: '2px solid var(--space-purple)',
        boxShadow: '0 0 20px var(--space-purple)',
      }
    : {
        background: 'linear-gradient(45deg, rgba(229, 0, 164, 0.8), rgba(123, 44, 191, 0.8))',
        border: '2px solid var(--space-pink)',
        boxShadow: '0 0 20px var(--space-pink)',
      };
  
  return (
    <div 
      className={`math-bubble absolute flex items-center justify-center text-center p-2 ${animationClass} cursor-pointer rounded-full shadow-lg transform hover:scale-110 transition-all`}
      style={{ 
        top, 
        left,
        width: isQuestion ? '150px' : '110px',
        height: isQuestion ? '150px' : '110px',
        transform: isQuestion ? `scale(1.1)` : `rotate(${rotation}deg)`,
        animation: `${animationClass} ${isQuestion ? '15s' : '12s'} ease-in-out infinite`,
        ...bubbleStyles
      }}
      onClick={onClick}
    >
      <div className="font-bold text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>
        <span className="text-xl md:text-2xl">{text}</span>
      </div>
    </div>
  );
};

export default Bubble;
