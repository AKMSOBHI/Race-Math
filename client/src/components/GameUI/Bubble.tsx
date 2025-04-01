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
  
  return (
    <div 
      className={`bubble absolute w-32 h-32 md:w-36 md:h-36 flex items-center justify-center text-center p-2 ${animationClass} cursor-pointer`}
      style={{ top: position.top, left: position.left }}
      onClick={onClick}
    >
      <div className="font-bold text-deep-blue">
        <span className="text-xl md:text-2xl">{text}</span>
      </div>
    </div>
  );
};

export default Bubble;
