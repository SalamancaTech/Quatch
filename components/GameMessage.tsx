import React from 'react';
import { Player, Difficulty } from '../types';

interface GameOverModalProps {
  winner: Player;
  humanPlayer: Player;
  aiPlayer: Player;
  turnCount: number;
  gameDuration: number; // in seconds
  difficulty: Difficulty;
  onPlayAgain: () => void;
}

const GameOverModal: React.FC<GameOverModalProps> = ({ winner, humanPlayer, aiPlayer, turnCount, gameDuration, difficulty, onPlayAgain }) => {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isHumanWinner = winner.id === humanPlayer.id;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[300] animate-prompt-fade-in">
      <div className="bg-green-900/95 border-2 border-yellow-500/70 rounded-2xl shadow-2xl p-6 md:p-8 w-11/12 max-w-lg text-white text-center">
        <h1 className={`text-4xl md:text-5xl font-black mb-2 uppercase ${isHumanWinner ? 'text-yellow-400' : 'text-red-500'}`}>
          {isHumanWinner ? 'You Win!' : 'You Lose!'}
        </h1>
        <p className="text-lg text-gray-300 mb-6">
          The winner is <span className="font-bold text-white">{winner.name}</span>!
        </p>

        <div className="bg-black/30 rounded-lg p-4 mb-6 text-left">
          <h2 className="text-xl font-bold text-yellow-300 mb-3 text-center border-b border-yellow-300/20 pb-2">Game Summary</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-md">
            <span className="font-semibold text-gray-300">Difficulty:</span>
            <span className="text-right">{difficulty}</span>

            <span className="font-semibold text-gray-300">Game Time:</span>
            <span className="text-right">{formatDuration(gameDuration)}</span>

            <span className="font-semibold text-gray-300">Turns Taken:</span>
            <span className="text-right">{turnCount}</span>

            <div className="col-span-2 border-t border-yellow-300/20 my-2"></div>
            
            <h3 className="col-span-2 font-bold text-lg text-center mb-1">{humanPlayer.name}</h3>
            <span className="font-semibold text-gray-300">Cards Eaten:</span>
            <span className="text-right">{humanPlayer.cardsEaten}</span>

            <h3 className="col-span-2 font-bold text-lg text-center mt-2 mb-1">{aiPlayer.name}</h3>
            <span className="font-semibold text-gray-300">Cards Eaten:</span>
            <span className="text-right">{aiPlayer.cardsEaten}</span>
          </div>
        </div>
        
        <button 
          onClick={onPlayAgain} 
          className="px-8 py-3 bg-yellow-500 text-gray-900 font-bold rounded-lg shadow-lg hover:bg-yellow-400 transition-colors transform hover:scale-105 text-lg"
        >
          Play Again
        </button>
      </div>
    </div>
  );
};

export default GameOverModal;
