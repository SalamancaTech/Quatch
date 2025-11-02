import React from 'react';
import { Card as CardType, Rank, Suit, GameStage } from '../types';
import Card from './Card';

interface GameBoardProps {
  deckCount: number;
  mpa: CardType[];
  binCount: number;
  onMpaClick: () => void;
  isPlayerTurn: boolean;
  hasSelectedCards: boolean;
  isInvalidPlay: boolean;
  stage: GameStage;
  onDeckClick: () => void;
  mpaRef: React.RefObject<HTMLDivElement>;
  deckRef: React.RefObject<HTMLDivElement>;
  isEating: boolean;
  dealingStep?: number;
  isCheatingEnabled?: boolean;
  onBinClick?: () => void;
}

const GameBoard: React.FC<GameBoardProps> = ({ deckCount, mpa, binCount, onMpaClick, isPlayerTurn, hasSelectedCards, isInvalidPlay, stage, onDeckClick, mpaRef, deckRef, isEating, dealingStep = 4, isCheatingEnabled = false, onBinClick }) => {
  let mpaClasses = 'flex flex-col items-center p-2 rounded-lg transform transition-all duration-200';

  if (isInvalidPlay) {
    mpaClasses += ' animate-shake ring-4 ring-red-700 scale-105';
  } else if (isPlayerTurn) {
    mpaClasses += ' cursor-pointer';
    if (hasSelectedCards) {
      mpaClasses += ' ring-4 ring-yellow-400 scale-105';
    } else {
      mpaClasses += ' ring-2 ring-red-500 hover:scale-105';
    }
  }

  const deckWrapperClasses = "flex flex-col items-center text-center w-24 md:w-28";
  const isDeckClickable = stage === GameStage.SETUP && dealingStep <= 3;
  const clickableDeckClasses = isDeckClickable ? "cursor-pointer transition-transform hover:scale-105 ring-4 ring-yellow-400 p-2 rounded-lg" : "";
  
  const getInstructionText = () => {
    if (stage !== GameStage.SETUP) return null;
    switch (dealingStep) {
        case 0: return "Click to Shuffle";
        case 1: return "Deal Last Stand";
        case 2: return "Deal Last Chance";
        case 3: return "Deal Hand";
        default: return null;
    }
  }

  const isBinClickable = isCheatingEnabled && binCount > 0;
  const binWrapperClasses = `flex flex-col items-center text-center w-24 md:w-28 transition-transform ${isBinClickable ? 'cursor-pointer hover:scale-105' : ''}`;
  const binRingClass = isBinClickable ? 'ring-2 ring-yellow-400' : '';

  const BinPile = (
    <div className={binWrapperClasses} onClick={isBinClickable ? onBinClick : undefined}>
      <div className={`relative w-20 h-28 md:w-24 md:h-36 ${binRingClass} rounded-lg`}>
        {binCount > 0
          ? <Card card={{ suit: Suit.Spades, rank: Rank.Two, value: 0, id: 'bin-card' }} isFaceUp={false} className="opacity-50"/>
          : <Card card={null} />
        }
      </div>
      {binCount > 0 && <span className="mt-2 text-sm font-bold text-white">{binCount} cards</span>}
    </div>
  );

  const MpaPile = (
    <div
      ref={mpaRef}
      className={`${mpaClasses} text-center w-24 md:w-28`}
      onClick={isPlayerTurn ? onMpaClick : undefined}
      aria-label={isPlayerTurn ? (hasSelectedCards ? 'Play selected cards to the pile' : 'Eat the pile') : 'Main Play Area'}
    >
      <div className={`relative w-20 h-28 md:w-24 md:h-36 transition-opacity ${isEating ? 'opacity-0' : 'opacity-100'}`}>
        {mpa.slice(-3).map((card, index) => (
          <div key={card.id} className="absolute inset-0" style={{ transform: `translateX(${index * 4}px) translateY(${index * 4}px)`}}>
              <Card card={index === mpa.slice(-3).length - 1 ? card : null} isFaceUp={true}/>
          </div>
        ))}
        {mpa.length === 0 && <Card card={null} />}
      </div>
    </div>
  );

  const DeckPile = (
    <div 
      ref={deckRef}
      className={`${deckWrapperClasses} ${isDeckClickable ? clickableDeckClasses : ""}`}
      onClick={isDeckClickable ? onDeckClick : undefined}
    >
      <div className="relative w-20 h-28 md:w-24 md:h-36">
          {deckCount > 0
            ? <Card card={{ suit: Suit.Spades, rank: Rank.Two, value: 0, id: 'deck-card' }} isFaceUp={false} />
            : <Card card={null} />
          }
      </div>
      <span className="mt-2 font-bold text-sm h-6 text-white">
        {stage !== GameStage.SETUP && deckCount > 0 ? `${deckCount} left` : ''}
      </span>
    </div>
  );


  return (
    <div className="flex flex-col items-center">
      {/* Instruction text area - visible only during setup */}
      <div className="h-6 mb-2 font-bold text-yellow-300 text-lg">
          {getInstructionText()}
      </div>

      {/* The row containing board elements */}
      <div className="flex justify-center items-center w-full my-4 h-40 px-4 md:px-8">
          {stage === GameStage.SETUP ? (
              DeckPile
          ) : (
              <div className="flex items-center justify-center space-x-2 md:space-x-4">
                  {BinPile}
                  {MpaPile}
                  {DeckPile}
              </div>
          )}
      </div>
    </div>
  );
};

export default GameBoard;