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
          <div className="eyes flex justify-center space-x-5">
            <div className="eye w-7 h-7 bg-white rounded-full flex items-center justify-center">
              <div className="pupil w-4 h-4 bg-blue-600 rounded-full"></div>
            </div>
            <div className="eye w-7 h-7 bg-white rounded-full flex items-center justify-center">
              <div className="pupil w-4 h-4 bg-blue-600 rounded-full"></div>
            </div>
          </div>
        );
      case 'sad':
        return (
          <div className="eyes flex justify-center space-x-5">
            <div className="eye w-7 h-7 bg-white rounded-full flex items-center justify-center">
              <div className="pupil w-4 h-4 bg-red-600 rounded-full"></div>
            </div>
            <div className="eye w-7 h-7 bg-white rounded-full flex items-center justify-center">
              <div className="pupil w-4 h-4 bg-red-600 rounded-full"></div>
            </div>
          </div>
        );
      default:
        return (
          <div className="eyes flex justify-center space-x-5">
            <div className="eye w-7 h-7 bg-white rounded-full flex items-center justify-center">
              <div className="pupil w-3.5 h-3.5 bg-black rounded-full"></div>
            </div>
            <div className="eye w-7 h-7 bg-white rounded-full flex items-center justify-center">
              <div className="pupil w-3.5 h-3.5 bg-black rounded-full"></div>
            </div>
          </div>
        );
    }
  };

  // Get mouth based on mood
  const getMouth = () => {
    switch (mood) {
      case 'happy':
        return (
          <div className="mouth-container mt-3 relative">
            <div className="mouth w-14 h-7 bg-white rounded-b-full"></div>
          </div>
        );
      case 'sad':
        return (
          <div className="mouth-container mt-3 relative">
            <div className="mouth w-14 h-7 bg-white rounded-t-full transform rotate-180"></div>
          </div>
        );
      default:
        return <div className="mouth w-12 h-1.5 bg-white rounded-full mt-3"></div>;
    }
  };

  return (
    <div className="flex justify-center items-center h-full py-2">
      <div className="mathbot relative">
        {/* Head */}
        <div 
          className="head w-36 h-36 rounded-3xl relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #6d28d9 0%, #4c1d95 100%)',
            boxShadow: '0 0 20px rgba(109, 40, 217, 0.7)',
            border: '3px solid #00f5d4'
          }}
        >
          {/* Screen */}
          <div 
            className="screen w-28 h-28 bg-gray-900 rounded-2xl absolute top-4 left-4 flex flex-col justify-center items-center"
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
        <div className="antenna absolute -top-7 left-1/2 transform -translate-x-1/2 flex flex-col items-center">
          <div className="antenna-ball w-5 h-5 rounded-full bg-pink-500" 
            style={{ boxShadow: '0 0 10px #e500a4' }}></div>
          <div className="antenna-stem h-3 w-1.5 bg-gray-400"></div>
        </div>
        
        {/* Status lights */}
        <div className="lights absolute top-2 right-2 flex flex-col space-y-1.5">
          <div className="light w-2.5 h-2.5 rounded-full bg-green-400" style={{ boxShadow: '0 0 5px #10b981' }}></div>
          <div className="light w-2.5 h-2.5 rounded-full bg-blue-400" style={{ boxShadow: '0 0 5px #3b82f6' }}></div>
          <div className="light w-2.5 h-2.5 rounded-full bg-red-400" style={{ boxShadow: '0 0 5px #ef4444' }}></div>
        </div>
        
        {/* Ears/Buttons */}
        <div className="left-ear absolute -left-3 top-1/3 w-4 h-7 bg-gray-300 rounded-l-full"
          style={{ background: 'linear-gradient(90deg, #d8b4fe, #a78bfa)' }}></div>
        <div className="right-ear absolute -right-3 top-1/3 w-4 h-7 bg-gray-300 rounded-r-full"
          style={{ background: 'linear-gradient(270deg, #d8b4fe, #a78bfa)' }}></div>
      </div>
    </div>
  );
};

export default Octopus;
