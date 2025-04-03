import { FC } from 'react';

interface OctopusProps {
  mood: 'neutral' | 'happy' | 'sad';
}

const Octopus: FC<OctopusProps> = ({ mood }) => {
  // Get eyes based on mood
  const getEyes = () => {
    switch (mood) {
      case 'happy':
        return (
          <div className="eyes flex justify-center space-x-6">
            <div className="eye w-8 h-8 bg-white rounded-full flex items-center justify-center">
              <div className="pupil w-4 h-4 bg-blue-600 rounded-full"></div>
            </div>
            <div className="eye w-8 h-8 bg-white rounded-full flex items-center justify-center">
              <div className="pupil w-4 h-4 bg-blue-600 rounded-full"></div>
            </div>
          </div>
        );
      case 'sad':
        return (
          <div className="eyes flex justify-center space-x-6">
            <div className="eye w-8 h-8 bg-white rounded-full flex items-center justify-center">
              <div className="pupil w-4 h-4 bg-red-600 rounded-full"></div>
            </div>
            <div className="eye w-8 h-8 bg-white rounded-full flex items-center justify-center">
              <div className="pupil w-4 h-4 bg-red-600 rounded-full"></div>
            </div>
          </div>
        );
      default:
        return (
          <div className="eyes flex justify-center space-x-6">
            <div className="eye w-8 h-8 bg-white rounded-full flex items-center justify-center">
              <div className="pupil w-4 h-4 bg-black rounded-full"></div>
            </div>
            <div className="eye w-8 h-8 bg-white rounded-full flex items-center justify-center">
              <div className="pupil w-4 h-4 bg-black rounded-full"></div>
            </div>
          </div>
        );
    }
  };

  // Get mouth based on mood
  const getMouth = () => {
    switch (mood) {
      case 'happy':
        return <div className="mouth w-16 h-6 bg-white mask-happy mt-3"></div>;
      case 'sad':
        return <div className="mouth w-16 h-6 bg-white mask-sad mt-3"></div>;
      default:
        return <div className="mouth w-16 h-2 bg-white rounded-full mt-4"></div>;
    }
  };

  return (
    <div className="flex justify-center items-center h-full py-2">
      <div className="mathbot relative">
        {/* Head */}
        <div 
          className="head w-40 h-40 rounded-2xl relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #7b2cbf 0%, #3a0ca3 100%)',
            boxShadow: '0 0 20px rgba(123, 44, 191, 0.7)',
            border: '3px solid #00f5d4'
          }}
        >
          {/* Screen */}
          <div 
            className="screen w-32 h-32 bg-gray-900 rounded-xl absolute top-4 left-4 flex flex-col justify-center items-center"
            style={{
              boxShadow: 'inset 0 0 10px rgba(0, 245, 212, 0.6)',
              border: '2px solid rgba(0, 245, 212, 0.8)'
            }}
          >
            {/* Face */}
            <div className="face flex flex-col items-center justify-center">
              {getEyes()}
              {getMouth()}
            </div>
          </div>
        </div>
        
        {/* Antenna */}
        <div className="antenna absolute -top-8 left-1/2 transform -translate-x-1/2 flex flex-col items-center">
          <div className="antenna-ball w-6 h-6 rounded-full bg-pink-500" 
            style={{ boxShadow: '0 0 10px #e500a4' }}></div>
          <div className="antenna-stem h-4 w-2 bg-gray-400"></div>
        </div>
        
        {/* Status lights */}
        <div className="lights absolute top-2 right-2 flex flex-col space-y-2">
          <div className="light w-3 h-3 rounded-full bg-green-400" style={{ boxShadow: '0 0 5px #10b981' }}></div>
          <div className="light w-3 h-3 rounded-full bg-blue-400" style={{ boxShadow: '0 0 5px #3b82f6' }}></div>
          <div className="light w-3 h-3 rounded-full bg-red-400" style={{ boxShadow: '0 0 5px #ef4444' }}></div>
        </div>
      </div>
    </div>
  );
};

export default Octopus;
