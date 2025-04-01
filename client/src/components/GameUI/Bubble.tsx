import { FC } from 'react';
import { getRandomAnimationDelay } from '@/lib/game/questions';

interface BubbleProps {
  text: string;
  isQuestion?: boolean;
  position: { top: string; left: string };
  onClick: () => void;
}

const Bubble: FC<BubbleProps> = ({ text, isQuestion = false, position, onClick }) => {
  const animationClass = getRandomAnimationDelay();
  
  // Generate random rotation for asteroids
  const rotation = Math.floor(Math.random() * 360);
  
  return (
    <div 
      className={`math-bubble absolute flex items-center justify-center text-center p-2 ${animationClass} cursor-pointer rounded-full shadow-lg transform hover:scale-110 transition-all`}
      style={{ 
        top: position.top, 
        left: position.left,
        width: isQuestion ? '150px' : '110px',
        height: isQuestion ? '150px' : '110px',
        transform: isQuestion ? `scale(1.1)` : `rotate(${rotation}deg)`,
        animation: `${animationClass} ${isQuestion ? '15s' : '12s'} ease-in-out infinite`
      }}
      onClick={onClick}
    >
      {isQuestion ? (
        <div className="font-bold text-white">
          <span className="text-xl md:text-2xl">{text}</span>
        </div>
      ) : (
        <div className="font-bold text-white">
          <span className="text-xl md:text-2xl">{text}</span>
        </div>
      )}
    </div>
  );
};

export default Bubble;
