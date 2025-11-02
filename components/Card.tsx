import React, { useMemo } from 'react';
import { Card as CardType, Suit } from '../types';

interface CardProps {
  card: CardType | null;
  isFaceUp?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
}

const cardBackLogo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAOEAAADhCAMAAAAJbSJIAAAAbFBMVEUAAAD////MzMzIyMjPz8/JycnR0dH8/Pz4+Pj19fXm5ubU1NTa2trf39/v7+/j4+PZ2dnBwcGoqKjOzs7c3Nzp6enAwMDHx8e7u7vT09N6enqXl5dpaWmsrKygoKCRkZGHh4eioqKtra2urq7Pyt2PAAAD1ElEQVR4nO2d2XKiMBBAURpA8QVBQUFFxft/xQ4sUtuG2tKq3k0H8+A9g5ak6Q5HjACEEEIIIYQQQgghhBBCCHkR4fzxOF4f3k8Iu24M4/cXx2fX/fnx5fD6cRzHt/v5pLzWq398fDyXk/F4eX0uL0/l5fN9vN+d572P13fXJ3w+N/9bXn/P+f/e9Fv+M9Jb/W94fV/X/T/y9q/mG/1+r//G8vr/fn+t/63vH/l+X/8bXl/z/b7+99vL+V/2w/r+r/12vb/f/z+vj8fn/w/r+7/+N+H1/S863+/vv8/Wj8//z0Wd8Pq//78+v5/W/7V1/f7v/P/+/9f2m4PX/l+D1/zH//P+/9T/h8/n7P+D1/Tf5/P6//f14+T/h8/V/P6//bX//8vP7/38+v5/W/8//Pz++Xz8bXm8P/H5+Pl+Pq+/7+v7P2n4X/8f9vV9/f9z+1/g8/m1/9fL+fPz+d/g8/+P9P3P3296/F/28/v/P6/v5/+3/7+P17/L9P0P+Pz/R/s/4vP/Z//v/Q/4/P2f//95Pz+9/m//f2s8/s+H1++n9X/bT+/v5vW/7ffT+n+Z1//L/P3y+v8X+Hz/z/+f1/fL9P/b/0+H1+9/7v89P7+9vr/5//N6/9v+3/b//Pz/V/v/W/9Pvj+P18fV+v9N/n+5+v//+P7X+X7f1/f9/v6v9F3v8/m+vo+v3++/zeuP7f8P+P3/wz/e/x/w+X+/vo/XZ/0P+Pz/V/q/fN/fr7f/L/j8/P2y/78P/H5e3/8/P//vP9P32/X6/+31//L+d/q/3P/f9vX9+v82H7/vr/+3/7/p8/39P2/+L/h8/79N32/T7/v9X23//9/+//+f+n/pY/39P2/7P+3//8P/H7f/r+X//8Dfn8/X/8P+Hz9P37/3/7/T5/v7/v+D/gC5893+f4bXf5nPg8/nw+/3v+31f2z+rzbf1/+34PN//X7//b79P2r//wX39f0/b/++r+/H9f8zvn//376v78flf9N3v+39/8PvL/l+X/8b/P7//j9t/s+P7e+3/0P99vt+fr/vt/u/xf5/8fP75f8fX1//76/631/y/f7+N/i8X/b/Z3y+//9d3+/r/9v+X3//7v9e3/8/Xl/X+3/b1/d/+v9d32//l8d7//b4fv9+377v+/r+/2n/L/v+/y3/v9T//4vj/+/9/zE//7z/P+zz/f7//zN+f/v/26+P7/f/Z//P6//P+V/+fz/f//v/d/3+//7/z/y///9Nf1//P/X9vv//n/9f5vv/+f+v/pP+///P1///+X+j/H+Pz+V///+8//3++/P//v/v//P/9/f3//f3//f3//f/++P//fH///P/8P/99f1///v///31/+v/79//5//f1//f1//f1//f1//f/3//f13x///9f//+///+///9/j5+f//+///9/vP3//f3//n//n//f/3//9/v///f/3//v//v9/eP3//f3//f3//f7//f7//f7//f/3//p///p///h///h///h9/n//n//v///v///h///h///h///P///v///j///h9vj3///v3///j3///P///h9/v///h///h9/v/f/+/9/9/v///v//vP3//vP3//vP3//P///v///v///v99///99///9f//8///8///8///9f//8///8f/3//j//v///j//v///P3//v///v///P3//j3+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+P.O4AAAAASUVORK5CYII=';

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
        <div 
          className="absolute inset-2 bg-contain bg-center bg-no-repeat opacity-80"
          style={{
            backgroundImage: `url('${cardBackLogo}')`,
            filter: 'brightness(0.8) sepia(0.2)'
          }}
        ></div>
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
