import { FC } from 'react';
import { Player } from '@shared/schema';
import { convertToArabicNumerals } from '@/lib/utils';

interface PlayerScoreboardProps {
  players: Player[];
  currentPlayerId?: number;
}

const PlayerScoreboard: FC<PlayerScoreboardProps> = ({ players, currentPlayerId }) => {
  return (
    <div className="mt-6 bg-deep-blue bg-opacity-70 rounded-lg p-4 shadow-lg">
      <h2 className="text-xl mb-3 text-center" style={{ fontFamily: 'Orbitron, sans-serif' }}>اللاعبون</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {players.map((player, index) => {
          const isCurrentPlayer = player.id === currentPlayerId;
          const progressPercentage = (player.progress / 5) * 100; // 5 questions per stage
          
          return (
            <div 
              key={player.id}
              className={`bg-ocean-blue bg-opacity-50 rounded-lg p-3 flex items-center ${isCurrentPlayer ? 'animate-pulse-slow' : ''}`}
            >
              <div className="w-10 h-10 bg-coral rounded-full flex items-center justify-center text-white font-bold mr-3">
                P{convertToArabicNumerals(index + 1)}
              </div>
              <div className="flex-1">
                <p className="font-bold">{player.username}</p>
                <div className="w-full bg-gray-700 rounded-full h-2.5">
                  <div 
                    className="bg-seaweed h-2.5 rounded-full" 
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
              </div>
              <div className="ml-3">
                <span className="font-bold text-xl">{convertToArabicNumerals(player.score)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PlayerScoreboard;
