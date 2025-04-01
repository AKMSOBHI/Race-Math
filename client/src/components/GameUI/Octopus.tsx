import { FC } from 'react';

interface OctopusProps {
  mood: 'neutral' | 'happy' | 'sad';
}

const Octopus: FC<OctopusProps> = ({ mood }) => {
  // Determine mouth style based on mood
  const getMouthStyle = () => {
    switch (mood) {
      case 'happy':
        return 'w-16 h-4 bg-deep-blue rounded-b-full mt-4 mx-auto';
      case 'sad':
        return 'w-16 h-4 bg-deep-blue rounded-t-full mt-4 mx-auto';
      default:
        return 'w-16 h-2 bg-deep-blue rounded-full mt-4 mx-auto';
    }
  };
  
  // Generate tentacles with different heights
  const tentacleHeights = [32, 44, 36, 40, 38, 42];
  
  return (
    <div className="absolute left-1/2 bottom-0 transform -translate-x-1/2">
      <div className="relative">
        {/* Octopus head */}
        <div className="w-40 h-40 bg-coral rounded-full relative z-10 flex items-center justify-center">
          {/* Octopus face */}
          <div className="absolute">
            {/* Eyes */}
            <div className="flex space-x-10">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                <div className="w-4 h-4 bg-deep-blue rounded-full"></div>
              </div>
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                <div className="w-4 h-4 bg-deep-blue rounded-full"></div>
              </div>
            </div>
            {/* Mouth */}
            <div id="mouth" className={getMouthStyle()}></div>
          </div>
        </div>
        
        {/* Tentacles */}
        <div className="flex justify-center -mt-5">
          {tentacleHeights.map((height, i) => (
            <div 
              key={i} 
              className={`tentacle w-10 h-${height} bg-coral rounded-b-full mx-1 shadow-md transform origin-top`}
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Octopus;
