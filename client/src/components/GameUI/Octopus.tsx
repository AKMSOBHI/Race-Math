import { FC } from 'react';

interface OctopusProps {
  mood: 'neutral' | 'happy' | 'sad';
}

const Octopus: FC<OctopusProps> = ({ mood }) => {
  // Determine expression style based on mood
  const getFaceStyle = () => {
    switch (mood) {
      case 'happy':
        return (
          <>
            <div className="eyes flex space-x-8">
              <div className="w-6 h-6 bg-purple-200 rounded-full flex items-center justify-center border-2 border-purple-700">
                <div className="w-3 h-3 bg-purple-900 rounded-full"></div>
              </div>
              <div className="w-6 h-6 bg-purple-200 rounded-full flex items-center justify-center border-2 border-purple-700">
                <div className="w-3 h-3 bg-purple-900 rounded-full"></div>
              </div>
            </div>
            <div className="mouth w-12 h-3 border-2 border-purple-700 border-t-0 rounded-b-full mt-3 mx-auto"></div>
          </>
        );
      case 'sad':
        return (
          <>
            <div className="eyes flex space-x-8">
              <div className="w-6 h-6 bg-red-200 rounded-full flex items-center justify-center border-2 border-red-700">
                <div className="w-3 h-3 bg-red-900 rounded-full"></div>
              </div>
              <div className="w-6 h-6 bg-red-200 rounded-full flex items-center justify-center border-2 border-red-700">
                <div className="w-3 h-3 bg-red-900 rounded-full"></div>
              </div>
            </div>
            <div className="mouth w-12 h-3 border-2 border-red-700 border-b-0 rounded-t-full mt-3 mx-auto"></div>
          </>
        );
      default:
        return (
          <>
            <div className="eyes flex space-x-8">
              <div className="w-6 h-6 bg-cyan-200 rounded-full flex items-center justify-center border-2 border-cyan-700">
                <div className="w-3 h-3 bg-cyan-900 rounded-full"></div>
              </div>
              <div className="w-6 h-6 bg-cyan-200 rounded-full flex items-center justify-center border-2 border-cyan-700">
                <div className="w-3 h-3 bg-cyan-900 rounded-full"></div>
              </div>
            </div>
            <div className="mouth w-12 h-1 border-2 border-cyan-700 rounded-full mt-4 mx-auto"></div>
          </>
        );
    }
  };
  
  return (
    <div className="absolute left-1/2 bottom-8 transform -translate-x-1/2 z-10">
      <div className="relative">
        {/* Alien spaceship */}
        <div 
          className="w-56 h-24 rounded-full flex items-center justify-center"
          style={{
            background: 'radial-gradient(circle at center, rgba(123, 44, 191, 0.9) 0%, rgba(36, 0, 70, 0.8) 70%)',
            boxShadow: '0 0 20px rgba(123, 44, 191, 0.7), 0 0 40px rgba(123, 44, 191, 0.4)',
            border: '2px solid rgba(0, 245, 212, 0.6)'
          }}
        >
          {/* Cockpit */}
          <div 
            className="w-32 h-32 rounded-full absolute -top-14 flex items-center justify-center overflow-hidden"
            style={{
              background: 'radial-gradient(circle at center, rgba(0, 245, 212, 0.4) 0%, rgba(0, 245, 212, 0.1) 70%)',
              boxShadow: 'inset 0 0 20px rgba(0, 245, 212, 0.6)',
              border: '2px solid rgba(0, 245, 212, 0.8)'
            }}
          >
            {/* Alien */}
            <div className="flex flex-col items-center justify-center">
              {/* Alien head */}
              <div 
                className="w-20 h-24 rounded-full flex flex-col items-center justify-center"
                style={{
                  background: mood === 'happy' 
                    ? 'linear-gradient(to bottom, #a78bfa, #8b5cf6)' 
                    : mood === 'sad' 
                      ? 'linear-gradient(to bottom, #f87171, #ef4444)' 
                      : 'linear-gradient(to bottom, #22d3ee, #06b6d4)'
                }}
              >
                {/* Alien face */}
                {getFaceStyle()}
              </div>
            </div>
          </div>
        </div>
        
        {/* Engine glow */}
        <div 
          className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-20 h-6"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(229, 0, 164, 0.8) 0%, rgba(229, 0, 164, 0) 70%)',
            animation: 'pulse 2s infinite alternate'
          }}
        ></div>
      </div>
      
      {/* Pulsing animation is defined in CSS */}
    </div>
  );
};

export default Octopus;
