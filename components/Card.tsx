import React, { useMemo } from 'react';
import { Card as CardType, Suit } from '../types';

interface CardProps {
  card: CardType | null;
  isFaceUp?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
}

// Fix: Corrected typo from React.-FC to React.-FC
const Card: React.FC<CardProps> = ({ card, isFaceUp = false, isSelected = false, onClick, className = '' }) => {
  if (!card) {
    return <div className={`w-20 h-28 md:w-24 md:h-36 rounded-lg border-2 border-dashed border-blue-300/50 ${className}`} />;
  }

  const suitColor = card.suit === Suit.Hearts || card.suit === Suit.Diamonds ? 'text-red-900' : 'text-stone-900';

  const cardBaseStyle = "relative w-20 h-28 md:w-24 md:h-36 rounded-lg shadow-lg p-2 transition-all duration-200 ease-in-out cursor-pointer select-none";
  const selectedStyle = isSelected ? 'transform -translate-y-4 ring-4 ring-yellow-400' : 'hover:-translate-y-2';

  const dirtStyle = useMemo(() => {
    if (!card) return {};
    // Simple pseudo-random generator based on card ID to keep smudges consistent
    let seed = 0;
    for (let i = 0; i < card.id.length; i++) {
        seed = (seed + card.id.charCodeAt(i) * (i + 1)) % 1000;
    }

    const rand = (min: number, max: number) => {
        seed = (seed * 9301 + 49297) % 233280;
        const rnd = seed / 233280;
        return min + rnd * (max - min);
    };

    const smudges = [];
    const numSmudges = Math.floor(rand(1, 4)); // 1 to 3 smudges

    for (let i = 0; i < numSmudges; i++) {
        const x = rand(10, 90);
        const y = rand(10, 90);
        const size = rand(15, 40);
        const opacity = rand(0.05, 0.15);
        smudges.push(
            `radial-gradient(circle at ${x}% ${y}%, rgba(66, 46, 31, ${opacity}) 0%, transparent ${size}%)`
        );
    }
    
    return {
        backgroundImage: smudges.join(', '),
    };
  }, [card?.id]);

  if (!isFaceUp) {
    return (
      <div
        id={card.id}
        className={`${cardBaseStyle} bg-red-900 border border-black/20 bg-gradient-to-br from-red-800 to-red-950 flex items-center justify-center overflow-hidden shadow-inner shadow-black/40 ${className}`}
        onClick={onClick}
      >
      </div>
    );
  }

  return (
    <div
      id={card.id}
      className={`${cardBaseStyle} bg-amber-200 border border-amber-900/20 shadow-inner shadow-amber-900/40 ${selectedStyle} ${className}`}
      onClick={onClick}
      style={dirtStyle}
    >
      {/* Large center suit */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className={`text-6xl md:text-8xl opacity-15 ${suitColor}`}>{card.suit}</span>
      </div>
    
      {/* Top-left rank and suit */}
      <div className={`relative ${suitColor}`}>
          <div className="font-black text-2xl md:text-3xl leading-none">{card.rank}</div>
          <div className="text-xl md:text-2xl leading-none">{card.suit}</div>
      </div>
    </div>
  );
};

export default Card;
