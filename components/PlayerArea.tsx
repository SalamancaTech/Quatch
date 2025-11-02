import React, { useRef, useState, useEffect } from 'react';
import { Player, Card as CardType, GameStage, Suit, Rank } from '../types';
import Card from './Card';

interface PlayerAreaProps {
  player: Player;
  isCurrentPlayer: boolean;
  selectedCards: CardType[];
  onCardSelect: (card: CardType) => void;
  onLastStandCardSelect?: (card: CardType, index: number) => void;
  isPlayer: boolean;
  currentStage: GameStage;
  hiddenCardIds: Set<string>;
  playerHandRef?: React.RefObject<HTMLDivElement>;
  lastStandRef?: React.RefObject<HTMLDivElement>;
  lastChanceRef?: React.RefObject<HTMLDivElement>;
  cardTableRef?: React.RefObject<HTMLDivElement>;
}

const PlayerArea: React.FC<PlayerAreaProps> = ({ player, isCurrentPlayer, selectedCards, onCardSelect, onLastStandCardSelect, isPlayer, currentStage, hiddenCardIds, playerHandRef, lastStandRef, lastChanceRef, cardTableRef }) => {
  const handContainerRef = useRef<HTMLDivElement>(null);
  const [handLayout, setHandLayout] = useState({
    cardSpacing: 0,
    totalWidth: 0,
    needsScrolling: false,
  });
  const [scrollOffset, setScrollOffset] = useState(0);

  // This effect calculates how hand cards should be spaced and if scrolling is needed
  useEffect(() => {
    const calculateLayout = () => {
      if (!isPlayer || !handContainerRef.current || player.hand.length <= 0) {
        return;
      }
      
      const MIN_CARD_SPACING = 36; // Ensures rank is visible
      const container = handContainerRef.current;
      const containerWidth = container.offsetWidth;
      const cardWidth = window.innerWidth >= 768 ? 96 : 80;
      const numCards = player.hand.length;
      
      const totalCardsWidthNoOverlap = numCards * cardWidth;

      if (totalCardsWidthNoOverlap <= containerWidth) {
        // Plenty of space, center them with some padding
        const spacing = cardWidth + 16;
        setHandLayout({
            cardSpacing: spacing,
            totalWidth: numCards > 0 ? (numCards -1) * spacing + cardWidth : 0,
            needsScrolling: false,
        });
        setScrollOffset(0);
      } else {
        // Overlap is needed
        let spacing = (containerWidth - cardWidth) / (numCards - 1);

        if (spacing < MIN_CARD_SPACING) {
          // Not enough space even when fully consolidated, enable scrolling
          const totalSpacedWidth = (numCards - 1) * MIN_CARD_SPACING + cardWidth;
          setHandLayout({
            cardSpacing: MIN_CARD_SPACING,
            totalWidth: totalSpacedWidth,
            needsScrolling: true,
          });
        } else {
          // Just enough space, consolidate to fit edge-to-edge
          setHandLayout({
            cardSpacing: spacing,
            totalWidth: containerWidth,
            needsScrolling: false,
          });
          setScrollOffset(0);
        }
      }
    };

    const timeoutId = setTimeout(calculateLayout, 0);
    window.addEventListener('resize', calculateLayout);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', calculateLayout);
    };
  }, [isPlayer, player.hand.length]);
  
  const scrollHand = (direction: 'left' | 'right') => {
    const containerWidth = handContainerRef.current?.offsetWidth || 0;
    const scrollAmount = containerWidth * 0.75;
    const maxScroll = Math.max(0, handLayout.totalWidth - containerWidth);
    
    setScrollOffset(prev => {
        const newOffset = direction === 'left' ? prev - scrollAmount : prev + scrollAmount;
        return Math.max(0, Math.min(newOffset, maxScroll));
    });
  };

  const maxScrollOffset = handContainerRef.current ? Math.max(0, handLayout.totalWidth - handContainerRef.current.offsetWidth) : 0;

  // Opponent's consolidated view
  if (!isPlayer) {
    const handCardCount = player.hand.length;
    
    const lcCards = player.lastChance.map((card) => (
        <Card
            key={card.id}
            card={card}
            isFaceUp={true}
            className="w-16 h-24 md:w-20 md:h-28"
        />
    ));
    
    const lsCards = player.lastStand.map((card, index) => (
        <Card
            key={`${card.id}-${index}`}
            card={card}
            isFaceUp={false}
            className="w-16 h-24 md:w-20 md:h-28"
        />
    ));

    return (
        <div className="relative flex justify-center items-center h-40">
            <div className="flex items-end space-x-8">
                {/* Hand Pile */}
                <div ref={playerHandRef} className="flex flex-col items-center w-24 md:w-28">
                    <div className="relative w-16 h-24 md:w-20 md:h-28">
                        {handCardCount > 0 && 
                            <Card 
                                card={{ suit: Suit.Spades, rank: Rank.Two, value: 0, id: 'opponent-hand-pile' }} 
                                isFaceUp={false} 
                                className="opacity-80" 
                            />
                        }
                    </div>
                    <span className="mt-2 text-sm font-bold text-white">{handCardCount > 0 ? `${handCardCount} in hand` : ''}</span>
                </div>

                {/* LC and LS Cards */}
                <div ref={cardTableRef} className="relative flex justify-center items-center">
                    {/* Last Stand cards (behind) */}
                    <div ref={lastStandRef} className="absolute flex justify-center space-x-2">
                      {lsCards}
                    </div>
                    {/* Last Chance cards (in front) */}
                    <div ref={lastChanceRef} className="relative flex justify-center space-x-2">
                      {lcCards}
                    </div>
                </div>
            </div>
        </div>
    );
  }

  // Player's detailed view
  const lcCards = player.lastChance.map((card) => (
      <Card 
        key={card.id} 
        card={card} 
        isFaceUp={true} 
        isSelected={isPlayer && selectedCards.some(sc => sc.id === card.id)}
        onClick={
          isPlayer && (
            currentStage === GameStage.SWAP || 
            (isCurrentPlayer && currentStage === GameStage.PLAY && player.hand.length === 0)
          ) ? () => onCardSelect(card) : undefined
        }
        />
  ));
  
  const isInLastStand = isPlayer && isCurrentPlayer && player.hand.length === 0 && player.lastChance.length === 0;

  const lsCards = player.lastStand.map((card, index) => {
      const isClickable = isInLastStand && onLastStandCardSelect;
      return (
        <Card 
          key={`${card.id}-${index}`} 
          card={card} 
          isFaceUp={false} 
          onClick={isClickable ? () => onLastStandCardSelect(card, index) : undefined}
          className={isClickable ? 'cursor-pointer hover:scale-105 hover:-translate-y-2 ring-2 ring-yellow-400' : ''}
        />
      );
  });

  const containerClasses = isPlayer 
    ? "absolute bottom-0 left-0 right-0"
    : "relative";
    
  const arrowButtonClasses = "absolute top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-black/40 text-white text-2xl font-bold flex items-center justify-center hover:bg-black/60 transition-colors";

  return (
    <div className={`flex flex-col items-center transition-all duration-300 rounded-lg ${containerClasses}`}>
      
      {/* LS and LC cards */}
      <div ref={cardTableRef} className="relative flex flex-col items-center mt-3 -space-y-[92px] md:-space-y-[124px]">
        {/* Last Stand cards (behind) */}
        <div ref={lastStandRef} className="relative flex justify-center space-x-4">
          {lsCards}
        </div>
        {/* Last Chance cards (in front) */}
        <div ref={lastChanceRef} className="relative flex justify-center space-x-4 z-10">
          {lcCards}
        </div>
      </div>


      {/* Hand */}
      <div ref={playerHandRef} className="flex justify-center items-end min-h-[160px] w-full px-2 md:px-4 -mt-5">
        <div className={`w-full relative flex items-center transition-opacity duration-300 ${player.hand.length === 0 ? 'opacity-0' : 'opacity-100'}`}>
            {handLayout.needsScrolling && scrollOffset > 0 && (
                <button onClick={() => scrollHand('left')} className={`${arrowButtonClasses} left-0 md:left-2`}>
                    &#x2190;
                </button>
            )}

            <div ref={handContainerRef} className="w-full h-[144px] overflow-hidden">
                <div 
                    className="relative h-full transition-transform duration-300 ease-out"
                    style={{
                        width: `${handLayout.totalWidth}px`,
                        transform: `translateX(-${scrollOffset}px)`,
                        marginLeft: handLayout.needsScrolling ? '0' : 'auto',
                        marginRight: handLayout.needsScrolling ? '0' : 'auto',
                    }}
                >
                    {player.hand.map((card, index) => (
                        <div
                            key={card.id}
                            className={`absolute bottom-0 transition-all duration-200 ease-out hover:-translate-y-4 hover:z-20 ${hiddenCardIds.has(card.id) ? 'opacity-0' : 'opacity-100'}`}
                            style={{
                                left: `${index * handLayout.cardSpacing}px`,
                                zIndex: index,
                            }}
                        >
                            <Card
                                card={card}
                                isFaceUp={isPlayer}
                                isSelected={isPlayer && selectedCards.some(sc => sc.id === card.id)}
                                onClick={isPlayer && (currentStage === GameStage.SWAP || isCurrentPlayer) ? () => onCardSelect(card) : undefined}
                            />
                        </div>
                    ))}
                </div>
            </div>

            {handLayout.needsScrolling && scrollOffset < maxScrollOffset && (
                <button onClick={() => scrollHand('right')} className={`${arrowButtonClasses} right-0 md:right-2`}>
                    &#x2192;
                </button>
            )}
        </div>
      </div>
    </div>
  );
};

export default PlayerArea;