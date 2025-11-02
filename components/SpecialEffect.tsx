import React, { useEffect, useRef } from 'react';

interface SpecialEffectProps {
  type: 'reset' | 'clear';
  rect: DOMRect;
  onComplete: () => void;
}

const SpecialEffect: React.FC<SpecialEffectProps> = ({ type, rect, onComplete }) => {
  const effectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = effectRef.current;
    const handleAnimationEnd = () => {
      onComplete();
    };

    if (node) {
      node.addEventListener('animationend', handleAnimationEnd);
      return () => {
        node.removeEventListener('animationend', handleAnimationEnd);
      };
    }
  }, [onComplete]);

  const color = type === 'reset' ? 'bg-blue-400/50 border-blue-300' : 'bg-yellow-400/50 border-yellow-300';
  const size = Math.min(rect.width, rect.height) * 1.2; // Start slightly larger than the card area

  const style: React.CSSProperties = {
    position: 'fixed',
    top: `${rect.top + (rect.height - size) / 2}px`,
    left: `${rect.left + (rect.width - size) / 2}px`,
    width: `${size}px`,
    height: `${size}px`,
    zIndex: 150,
  };

  return (
    <div ref={effectRef} style={style} className={`rounded-full border-4 ${color} animate-glow pointer-events-none`}></div>
  );
};

export default SpecialEffect;
