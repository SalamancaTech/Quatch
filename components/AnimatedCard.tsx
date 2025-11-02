import React from 'react';
import { Card as CardType } from '../types';
import Card from './Card';

interface AnimatedCardProps {
  card: CardType;
  startRect: DOMRect;
  endRect: DOMRect;
  animationType: 'play' | 'eat';
  onAnimationEnd: () => void;
  delay?: number;
  zIndex: number;
  isFaceUp?: boolean;
}

const AnimatedCard: React.FC<AnimatedCardProps> = ({ card, startRect, endRect, animationType, onAnimationEnd, delay = 0, zIndex, isFaceUp = true }) => {
  let style: React.CSSProperties;

  const endXBase = endRect.left - startRect.left;
  const endYBase = endRect.top - startRect.top;

  if (animationType === 'play') {
    const midX = (endXBase / 2);
    const midY = (endYBase / 2) - 80; // A higher arc for more drama
    const endRotation = Math.random() * 12 - 6; // -6 to +6 degrees for a gentle, varied stack

    style = {
      position: 'fixed',
      top: `${startRect.top}px`,
      left: `${startRect.left}px`,
      zIndex: 100 + zIndex,
      '--mid-x': `${midX}px`,
      '--mid-y': `${midY}px`,
      '--end-x': `${endXBase + (Math.random() * 8 - 4)}px`, // Slight random landing spot
      '--end-y': `${endYBase + (Math.random() * 8 - 4)}px`, // Slight random landing spot
      '--end-rot': `${endRotation}deg`,
      '--z-index': zIndex, // For stacking on the pile
      animationDelay: `${delay}ms`,
    } as React.CSSProperties;

  } else { // 'eat'
    const startRotation = Math.random() * 20 - 10;
    const endRotation = (Math.random() > 0.5 ? 1 : -1) * (180 + Math.random() * 180); // Wild spin
    const endXOffset = (Math.random() - 0.5) * endRect.width * 0.7; // Scatter into hand area
    const endYOffset = (Math.random() - 0.5) * endRect.height * 0.4;

    style = {
      position: 'fixed',
      top: `${startRect.top}px`,
      left: `${startRect.left}px`,
      zIndex: 100,
      '--start-rot': `${startRotation}deg`,
      '--end-x': `${endXBase + endXOffset}px`,
      '--end-y': `${endYBase + endYOffset}px`,
      '--end-rot': `${endRotation}deg`,
      animationDelay: `${delay}ms`,
    } as React.CSSProperties;
  }
  
  const animationClass = animationType === 'play' ? 'animate-play-card' : 'animate-eat-card';

  return (
    <div style={style} onAnimationEnd={onAnimationEnd} className={animationClass}>
      <Card card={card} isFaceUp={isFaceUp} />
    </div>
  );
};

export default AnimatedCard;