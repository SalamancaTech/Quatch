import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card as CardType, GameState, Player, GameStage, Rank, Difficulty } from './types';
import { initializeGame, isValidPlay, getAIPlay, playerHasValidMove, getAIStartingCard, shuffleDeck } from './utils/gameLogic';
import PlayerArea from './components/PlayerArea';
import GameBoard from './components/GameBoard';
import AnimatedCard from './components/AnimatedCard';
import SpecialEffect from './components/SpecialEffect';
import BinViewModal from './components/BinViewModal';

type AnimationState = {
  cards: CardType[];
  startRect: DOMRect;
  endRect: DOMRect;
  playerWhoPlayed: Player;
} | null;

type EatAnimationItem = {
    card: CardType;
    startRect: DOMRect;
    id: string; // for key
}

type DealAnimationItem = {
  card: CardType;
  startRect: DOMRect;
  endRect: DOMRect;
  delay: number;
  isFaceUp: boolean;
  id: string; // for key
};

type RefillAnimationState = {
  items: DealAnimationItem[];
  context: {
    playedCards: CardType[];
    playerWhoPlayed: Player;
  };
} | null;

type SpecialEffectState = {
  type: 'reset' | 'clear';
  rect: DOMRect;
} | null;

type SpecialMessage = {
  text: string;
  type: 'event' | 'prompt';
} | null;

const getPreciseSlotRect = (centeringRect: DOMRect, targetRect: DOMRect, cardIndex: number, cardWidth: number, spacing: number): DOMRect => {
    const totalCardsWidth = 3 * cardWidth + 2 * spacing;
    const firstCardX = centeringRect.left + (centeringRect.width - totalCardsWidth) / 2;
    const cardX = firstCardX + cardIndex * (cardWidth + spacing);
    
    return new DOMRect(cardX, targetRect.top, cardWidth, targetRect.height);
};

const getHandCardFanRect = (handContainerRect: DOMRect, cardIndex: number, totalCards: number, cardWidth: number, cardHeight: number): DOMRect => {
    if (!handContainerRect) return new DOMRect(0,0,0,0);
    
    // Simulate a fanned out position. Overlap by 60% of card width.
    const effectiveCardSpacing = cardWidth * 0.4; // Show 40% of the next card
    const totalFanWidth = cardWidth + (totalCards - 1) * effectiveCardSpacing;

    const fanStartX = handContainerRect.left + (handContainerRect.width - totalFanWidth) / 2;
    
    const cardX = fanStartX + cardIndex * effectiveCardSpacing;
    // Align to bottom of container
    const cardY = handContainerRect.bottom - cardHeight;

    return new DOMRect(cardX, cardY, cardWidth, cardHeight);
};


const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedCards, setSelectedCards] = useState<CardType[]>([]);
  const [isInvalidPlay, setIsInvalidPlay] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [animationState, setAnimationState] = useState<AnimationState>(null);
  const [eatAnimationState, setEatAnimationState] = useState<EatAnimationItem[] | null>(null);
  const [dealAnimationState, setDealAnimationState] = useState<DealAnimationItem[] | null>(null);
  const [refillAnimationState, setRefillAnimationState] = useState<RefillAnimationState | null>(null);
  const [hiddenCardIds, setHiddenCardIds] = useState(new Set<string>());
  const [isInitialPlay, setIsInitialPlay] = useState(false);
  const [specialEffect, setSpecialEffect] = useState<SpecialEffectState>(null);
  const [specialMessage, setSpecialMessage] = useState<SpecialMessage | null>(null);
  const [dealingStep, setDealingStep] = useState(0); // 0: Shuffle, 1: Deal LS, 2: Deal LC, 3: Deal Hand, 4: Done
  const [difficulty, setDifficulty] = useState<Difficulty>('Medium');
  const [isCheatingEnabled, setIsCheatingEnabled] = useState(false);
  const [isBinViewOpen, setIsBinViewOpen] = useState(false);

  const mpaRef = useRef<HTMLDivElement>(null);
  const playerHandRef = useRef<HTMLDivElement>(null);
  const opponentHandRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<HTMLDivElement>(null);
  const playerLastStandRef = useRef<HTMLDivElement>(null);
  const playerLastChanceRef = useRef<HTMLDivElement>(null);
  const opponentLastStandRef = useRef<HTMLDivElement>(null);
  const opponentLastChanceRef = useRef<HTMLDivElement>(null);
  const playerCardTableRef = useRef<HTMLDivElement>(null);
  const opponentCardTableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setGameState(initializeGame());
  }, []);

  const handleCardSelect = (card: CardType) => {
    if (gameState?.stage === GameStage.SWAP) {
      const player = gameState.players.find(p => !p.isAI)!;
      
      const isClickedInHand = player.hand.some(c => c.id === card.id);
      const isClickedInLC = player.lastChance.some(c => c.id === card.id);

      const selected = selectedCards.length === 1 ? selectedCards[0] : null;
      const isSelectedInHand = selected && player.hand.some(c => c.id === selected.id);
      const isSelectedInLC = selected && player.lastChance.some(c => c.id === selected.id);

      if (!selected || (isSelectedInHand && isClickedInHand) || (isSelectedInLC && isClickedInLC)) {
        if (selected?.id === card.id) {
          setSelectedCards([]);
        } else if (isClickedInHand || isClickedInLC) {
          setSelectedCards([card]);
        }
      } 
      else if ((isSelectedInHand && isClickedInLC) || (isSelectedInLC && isClickedInHand)) {
        const card1 = selected!;
        const card2 = card;
        const playerId = player.id;

        setGameState(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                players: prev.players.map(p => {
                    if (p.id === playerId) {
                        const isSelectedInHand = p.hand.some(c => c.id === card1.id);

                        const [cardForHand, cardForLC] = isSelectedInHand ? [card2, card1] : [card1, card2];
                        
                        const newHand = p.hand.filter(c => c.id !== (isSelectedInHand ? card1.id : card2.id)).concat(cardForHand).sort((a,b) => a.value - b.value);
                        const newLastChance = p.lastChance.filter(c => c.id !== (isSelectedInHand ? card2.id : card1.id)).concat(cardForLC);
                        
                        return { ...p, hand: newHand, lastChance: newLastChance };
                    }
                    return p;
                })
            };
        });
        setSelectedCards([]);
      }
      return;
    }

    // Normal card selection logic
    setSelectedCards(prev => {
      const isSelected = prev.some(sc => sc.id === card.id);
      if (isSelected) {
        return prev.filter(sc => sc.id !== card.id);
      } else {
        if (prev.length > 0 && prev[0].rank !== card.rank) {
          return [card];
        }
        return [...prev, card];
      }
    });
  };

  const nextTurn = useCallback((state: GameState, playerWhoPlayedId: number): GameState => {
      const numPlayers = state.players.length;
      const nextPlayerId = (playerWhoPlayedId + state.turnDirection + numPlayers) % numPlayers;
      return {
          ...state,
          currentPlayerId: nextPlayerId,
          isPlayerTurn: nextPlayerId === 0,
      };
  }, []);

  const finalizeTurn = (playedCards: CardType[], playerWhoPlayed: Player) => {
    setGameState(prevState => {
        if (!prevState) return null;

        let mpaCopy = [...prevState.mpa];
        let binCopy = [...prevState.bin];

        const playedCard = playedCards[0];
        let playerPlaysAgain = false;
        let clearMpa = false;
    
        if (playedCard.rank === '10') {
          playerPlaysAgain = true;
          clearMpa = true;
        } else if (mpaCopy.length >= 4) {
          // Check includes the newly played card which is already in the mpa state at this point
          const topFourCards = mpaCopy.slice(-4);
          if (topFourCards.every(c => c.rank === playedCard.rank)) {
            playerPlaysAgain = true;
            clearMpa = true;
          }
        }

        if (clearMpa) {
            binCopy = [...binCopy, ...mpaCopy];
            mpaCopy = [];
        }
        
        const stateAfterPlay: GameState = {
            ...prevState,
            mpa: mpaCopy,
            bin: binCopy,
        };
        
        const playerAfterUpdate = stateAfterPlay.players.find(p => p.id === playerWhoPlayed.id)!;
        const playerHasWon = playerAfterUpdate.hand.length === 0 && playerAfterUpdate.lastChance.length === 0 && playerAfterUpdate.lastStand.length === 0;

        if (playerHasWon) {
            return {
                ...stateAfterPlay,
                winner: playerAfterUpdate,
                stage: GameStage.GAME_OVER,
            };
        }

        if (playerPlaysAgain) {
            return stateAfterPlay; // Return state without changing turn
        }

        return nextTurn(stateAfterPlay, stateAfterPlay.currentPlayerId);
    });
  };

  const completeRefill = () => {
    if (!refillAnimationState) return;
    const { items, context } = refillAnimationState;
    const drawnCards = items.map(i => i.card);

    setGameState(prevState => {
      if (!prevState) return null;
      
      const newPlayers = prevState.players.map(p => {
        if (p.id === context.playerWhoPlayed.id) {
          const newHand = [...p.hand, ...drawnCards].sort((a,b) => a.value - b.value);
          return { ...p, hand: newHand };
        }
        return p;
      });
      // Correctly remove drawn cards from the top of the deck.
      const newDeck = prevState.deck.slice(drawnCards.length);

      return { ...prevState, players: newPlayers, deck: newDeck };
    });

    setRefillAnimationState(null);
    finalizeTurn(context.playedCards, context.playerWhoPlayed);
  };

  const initiateRefillAnimation = (cardsToDraw: CardType[], playerWhoPlayed: Player, playedCards: CardType[]) => {
    const startRect = deckRef.current?.getBoundingClientRect();
    const endRect = playerWhoPlayed.isAI ? opponentHandRef.current?.getBoundingClientRect() : playerHandRef.current?.getBoundingClientRect();

    if (!startRect || !endRect) {
      console.error("Refs missing for refill animation.");
      // Instantly complete if refs are missing
      const drawnCards = cardsToDraw;
      setGameState(prevState => {
          if (!prevState) return null;
          const newPlayers = prevState.players.map(p => p.id === playerWhoPlayed.id ? { ...p, hand: [...p.hand, ...drawnCards].sort((a,b) => a.value - b.value) } : p);
          const newDeck = prevState.deck.slice(drawnCards.length);
          return { ...prevState, players: newPlayers, deck: newDeck };
      });
      finalizeTurn(playedCards, playerWhoPlayed);
      return;
    }

    const animations: DealAnimationItem[] = cardsToDraw.map((card, index) => ({
      card,
      startRect,
      endRect,
      delay: index * 100,
      isFaceUp: !playerWhoPlayed.isAI,
      id: `refill-${card.id}-${index}`
    }));

    setRefillAnimationState({ items: animations, context: { playedCards, playerWhoPlayed } });
  }

  const handlePlayComplete = (playedCards: CardType[], playerWhoPlayed: Player) => {
    const currentState = gameState!;
    const playerInCurrentState = currentState.players.find(p => p.id === playerWhoPlayed.id)!;
    
    let cardsToDraw: CardType[] = [];

    // Use playerWhoPlayed (state before card removal) to determine where cards came from.
    const wasPlayFromHand = playerWhoPlayed.hand.some(c => playedCards.some(pc => pc.id === c.id));

    if (wasPlayFromHand) {
        // playerInCurrentState.hand is already the hand after playing cards.
        const handAfterPlay = playerInCurrentState.hand;
        const cardsNeeded = 3 - handAfterPlay.length;
        if (cardsNeeded > 0 && currentState.deck.length > 0) {
            const numToDraw = Math.min(cardsNeeded, currentState.deck.length);
            // Draw from the top of the deck (consistent with initial deal)
            cardsToDraw = currentState.deck.slice(0, numToDraw);
        }
    }
    // Note: Last Stand/Chance removal is handled before the animation starts, so no extra logic needed here.

    const playedCard = playedCards[0];
    
    const mpaAfterPlay = [...currentState.mpa, ...playedCards];
    if (mpaAfterPlay.length >= 4 && mpaAfterPlay.slice(-4).every(c => c.rank === playedCard.rank)) {
      setSpecialMessage({ text: "4 OF A KIND!", type: 'event' });
    } else if (playedCard.rank === Rank.Ten) {
      setSpecialMessage({ text: "Cleared!", type: 'event' });
    } else if (playedCard.rank === Rank.Two) {
      setSpecialMessage({ text: "Reset!", type: 'event' });
    }

    if ((playedCard.rank === Rank.Two || playedCard.rank === Rank.Ten) && mpaRef.current) {
      const rect = mpaRef.current.getBoundingClientRect();
      setSpecialEffect({ type: playedCard.rank === Rank.Two ? 'reset' : 'clear', rect });
    }

    setGameState(prevState => {
      if (!prevState) return null;
      // This state update mainly just adds card to MPA. Card removal from hand/LC is now done pre-animation.
      // However, we still need to filter here for cases where animation is skipped.
      return {
        ...prevState,
        players: prevState.players.map(p => p.id === playerWhoPlayed.id ? { 
            ...p, 
            hand: p.hand.filter(c => !playedCards.some(sc => sc.id === c.id)), 
            lastChance: p.lastChance.filter(c => !playedCards.some(sc => sc.id === c.id)) 
        } : p),
        mpa: [...prevState.mpa, ...playedCards]
      };
    });

    if (cardsToDraw.length > 0) {
      initiateRefillAnimation(cardsToDraw, playerWhoPlayed, playedCards);
    } else {
      finalizeTurn(playedCards, playerWhoPlayed);
    }
  };

  const initiatePlayAnimation = (cards: CardType[], player: Player, overrideStartRect?: DOMRect) => {
    if (!mpaRef.current || cards.length === 0) {
        handlePlayComplete(cards, player);
        return;
    }

    let startRect: DOMRect | undefined = overrideStartRect;
    const endRect = mpaRef.current.getBoundingClientRect();
    
    if (!startRect) {
        if (player.isAI) {
            if (opponentHandRef.current) {
                const opponentRect = opponentHandRef.current.getBoundingClientRect();
                const cardWidth = 96; // from md:w-24 in Card.tsx
                const cardHeight = 144; // from md:h-36 in Card.tsx
                startRect = new DOMRect(
                    opponentRect.left + (opponentRect.width - cardWidth) / 2,
                    opponentRect.top + (opponentRect.height - cardHeight) / 2,
                    cardWidth,
                    cardHeight
                );
            }
        } else {
            const cardToAnimate = cards[0];
            const cardElement = document.getElementById(cardToAnimate.id);
            if (cardElement) {
                startRect = cardElement.getBoundingClientRect();
            }
        }
    }

    if (!startRect) {
        console.error("Could not determine a starting rectangle for the animation.");
        handlePlayComplete(cards, player);
        return;
    }

    setHiddenCardIds(prev => new Set([...prev, ...cards.map(c => c.id)]));

    setAnimationState({
      cards: cards,
      startRect: startRect,
      endRect: endRect,
      playerWhoPlayed: player,
    });
  };

  const handlePlayCards = () => {
    if (!gameState || !gameState.isPlayerTurn || selectedCards.length === 0 || animationState) return;
    const player = gameState.players.find(p => !p.isAI)!;

    if (isInitialPlay) {
        const aiPlayer = gameState.players.find(p => p.isAI)!;
        const aiChoice = getAIStartingCard(aiPlayer);
        const playerChoice = selectedCards;

        const playerWins = aiChoice.length === 0 || playerChoice[0].value <= aiChoice[0].value;
        
        setSelectedCards([]); // Clear selection regardless of outcome for the player.
        setIsInitialPlay(false); // Turn off the flag immediately.

        if (playerWins) {
            setSpecialMessage({ text: "You go first!", type: 'event' });
            
            // Player's turn continues. Remove cards from player state and animate
            setGameState(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    players: prev.players.map(p => {
                        if (p.id === player.id) {
                            return { ...p, hand: p.hand.filter(c => !playerChoice.some(sc => sc.id === c.id)) };
                        }
                        return p;
                    })
                };
            });
            initiatePlayAnimation(playerChoice, player);
        } else { // AI wins
            setSpecialMessage({ text: "Opponent goes first!", type: 'event' });
            
            // AI plays its cards.
            // Remove cards from AI state and animate
            setGameState(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    currentPlayerId: aiPlayer.id,
                    isPlayerTurn: false,
                    players: prev.players.map(p => {
                        if (p.id === aiPlayer.id) {
                            return { ...p, hand: p.hand.filter(c => !aiChoice.some(sc => sc.id === c.id)) };
                        }
                        return p;
                    })
                };
            });
            initiatePlayAnimation(aiChoice, aiPlayer);
        }
        return;
    }

    const targetCard = gameState.mpa.length > 0 ? gameState.mpa[gameState.mpa.length - 1] : undefined;

    if (!isValidPlay(selectedCards, targetCard)) {
      setIsInvalidPlay(true);
      setTimeout(() => setIsInvalidPlay(false), 500);
      setSelectedCards([]);
      return;
    }

    // Remove cards from state before animating
    setGameState(prev => {
        if (!prev) return null;
        const newPlayers = prev.players.map(p => {
            if (p.id === player.id) {
                return {
                    ...p,
                    hand: p.hand.filter(c => !selectedCards.some(sc => sc.id === c.id)),
                    lastChance: p.lastChance.filter(c => !selectedCards.some(sc => sc.id === c.id))
                };
            }
            return p;
        });
        return { ...prev, players: newPlayers };
    });

    initiatePlayAnimation(selectedCards, player);
    setSelectedCards([]);
  };
  
  const completeEat = useCallback((eatenCards: CardType[]) => {
    setGameState(prevState => {
        if (!prevState) return null;
        
        const eatingPlayerId = prevState.currentPlayerId;

        const newPlayers = prevState.players.map(player => {
            if (player.id === eatingPlayerId) {
                const newHand = [...player.hand, ...eatenCards].sort((a, b) => a.value - b.value);
                return { ...player, hand: newHand };
            }
            return player;
        });

        const stateAfterEat: GameState = { 
          ...prevState, 
          players: newPlayers,
        };
        
        return nextTurn(stateAfterEat, stateAfterEat.currentPlayerId);
    });
    setEatAnimationState(null);
  }, [nextTurn]);

  const initiateEatAnimation = (items: EatAnimationItem[], destination: 'player' | 'opponent') => {
      if (!gameState || items.length === 0) return;
      
      const endRect = (destination === 'player' ? playerHandRef.current : opponentHandRef.current)?.getBoundingClientRect();
      if (!endRect) return;

      setEatAnimationState(items);
  }

  const handleEat = () => {
    if (!gameState || !gameState.isPlayerTurn || eatAnimationState || gameState.mpa.length === 0) return;
    
    const items: EatAnimationItem[] = gameState.mpa.map(card => ({
        card,
        startRect: mpaRef.current!.getBoundingClientRect(),
        id: `eat-${card.id}`
    }));
    
    initiateEatAnimation(items, 'player');
    setGameState(prev => ({ ...prev!, mpa: [] }));
  };

  const handleMpaClick = () => {
    if (!gameState?.isPlayerTurn || animationState || eatAnimationState) return;

    if (selectedCards.length > 0) {
      handlePlayCards();
      return;
    }
    
    const player = gameState.players.find(p => !p.isAI)!;
    
    // In last stand, player cannot choose to eat.
    if (player.hand.length === 0 && player.lastChance.length === 0) {
        return;
    }

    const targetCard = gameState.mpa.length > 0 ? gameState.mpa[gameState.mpa.length - 1] : undefined;

    if (playerHasValidMove(player, targetCard)) {
      setIsInvalidPlay(true);
      setTimeout(() => setIsInvalidPlay(false), 500);
      return; // Prevent eating
    }

    handleEat();
  };

  const handleLastStandCardSelect = (card: CardType, index: number) => {
    if (!gameState || !gameState.isPlayerTurn || animationState || eatAnimationState) return;
    const player = gameState.players.find(p => !p.isAI)!;
    if (player.hand.length > 0 || player.lastChance.length > 0) return;
    
    const targetCard = gameState.mpa.length > 0 ? gameState.mpa[gameState.mpa.length - 1] : undefined;
    const lsCardElement = playerLastStandRef.current?.children[index] as HTMLElement;
    if (!lsCardElement) return;
    const lsCardRect = lsCardElement.getBoundingClientRect();
    
    // Remove card from state immediately
    setGameState(prev => {
        if (!prev) return null;
        const newPlayers = prev.players.map(p => {
            if (p.id === player.id) {
                const newLastStand = [...p.lastStand];
                newLastStand.splice(index, 1);
                return { ...p, lastStand: newLastStand };
            }
            return p;
        });
        return { ...prev, players: newPlayers };
    });

    if (isValidPlay([card], targetCard)) {
        initiatePlayAnimation([card], player, lsCardRect);
    } else {
        // Bust! Eat the pile + the failed card
        const items: EatAnimationItem[] = gameState.mpa.map(c => ({
            card: c,
            startRect: mpaRef.current!.getBoundingClientRect(),
            id: `eat-${c.id}`
        }));
        items.push({
            card,
            startRect: lsCardRect,
            id: `eat-fail-${card.id}`
        });
        initiateEatAnimation(items, 'player');
        setGameState(prev => ({ ...prev!, mpa: [] }));
    }
  }

  const handleDeckClick = () => {
    if (gameState?.stage !== GameStage.SETUP || dealAnimationState || dealingStep > 3) return;

    const startRect = deckRef.current?.getBoundingClientRect();
    if (!startRect) {
        console.error("Deck ref is missing for dealing animation.");
        return;
    }
    
    // --- Step 0: Shuffle ---
    if (dealingStep === 0) {
        if (deckRef.current) {
            deckRef.current.classList.add('animate-shuffle');
            setTimeout(() => deckRef.current?.classList.remove('animate-shuffle'), 500);
        }
        setGameState(prev => ({ ...prev!, deck: shuffleDeck([...prev!.deck]) }));
        setSpecialMessage({ text: "Shuffled!", type: 'event' });
        setDealingStep(1);
        return;
    }

    // --- Steps 1-3: Dealing Cards ---
    const playerLSRect = playerLastStandRef.current?.getBoundingClientRect();
    const playerLCRect = playerLastChanceRef.current?.getBoundingClientRect();
    const playerHandRect = playerHandRef.current?.getBoundingClientRect();
    const opponentLSRect = opponentLastStandRef.current?.getBoundingClientRect();
    const opponentLCRect = opponentLastChanceRef.current?.getBoundingClientRect();
    const opponentHandRect = opponentHandRef.current?.getBoundingClientRect();
    const playerCardTableRect = playerCardTableRef.current?.getBoundingClientRect();
    const opponentCardTableRect = opponentCardTableRef.current?.getBoundingClientRect();

    if (!playerLSRect || !playerLCRect || !playerHandRect || !opponentLSRect || !opponentLCRect || !opponentHandRect || !playerCardTableRect || !opponentCardTableRect) {
      console.error("A container ref is missing for dealing.");
      return;
    }

    const animations: DealAnimationItem[] = [];
    let delay = 0;
    const delayIncrement = 100;
    const cardWidth = window.innerWidth < 768 ? 80 : 96;
    const cardHeight = window.innerWidth < 768 ? 112 : 144;
    const spacing = 16; // Corresponds to space-x-4
    
    let cardsToDeal: {p: CardType[], o: CardType[]};
    let remainingDeck: CardType[];
    let nextStep: number;
    let endMessage: SpecialMessage = null;
    let finalGameStateUpdate: ((prevState: GameState) => GameState) | null = null;
    
    const currentDeck = gameState.deck;
    
    // --- Step 1: Deal LS ---
    if (dealingStep === 1) {
        cardsToDeal = { p: currentDeck.slice(0, 3), o: currentDeck.slice(3, 6) };
        remainingDeck = currentDeck.slice(6);
        nextStep = 2;
        
        for (let i = 0; i < 3; i++) {
            animations.push({ card: cardsToDeal.p[i], startRect, endRect: getPreciseSlotRect(playerCardTableRect, playerLSRect, i, cardWidth, spacing), delay, isFaceUp: false, id: `deal-${cardsToDeal.p[i].id}` });
            delay += delayIncrement;
            animations.push({ card: cardsToDeal.o[i], startRect, endRect: getPreciseSlotRect(opponentCardTableRect, opponentLSRect, i, cardWidth, 8), delay, isFaceUp: false, id: `deal-${cardsToDeal.o[i].id}` });
            delay += delayIncrement;
        }
        
        finalGameStateUpdate = (prev) => ({
            ...prev,
            players: prev.players.map(p => p.isAI ? { ...p, lastStand: cardsToDeal.o } : { ...p, lastStand: cardsToDeal.p }),
            deck: remainingDeck,
        });
    } 
    // --- Step 2: Deal LC ---
    else if (dealingStep === 2) {
        cardsToDeal = { p: currentDeck.slice(0, 3), o: currentDeck.slice(3, 6) };
        remainingDeck = currentDeck.slice(6);
        nextStep = 3;

        for (let i = 0; i < 3; i++) {
            animations.push({ card: cardsToDeal.p[i], startRect, endRect: getPreciseSlotRect(playerCardTableRect, playerLCRect, i, cardWidth, spacing), delay, isFaceUp: true, id: `deal-${cardsToDeal.p[i].id}` });
            delay += delayIncrement;
            animations.push({ card: cardsToDeal.o[i], startRect, endRect: getPreciseSlotRect(opponentCardTableRect, opponentLCRect, i, cardWidth, 8), delay, isFaceUp: true, id: `deal-${cardsToDeal.o[i].id}` });
            delay += delayIncrement;
        }
        
        finalGameStateUpdate = (prev) => ({
            ...prev,
            players: prev.players.map(p => p.isAI ? { ...p, lastChance: cardsToDeal.o } : { ...p, lastChance: cardsToDeal.p }),
            deck: remainingDeck,
        });
    }
    // --- Step 3: Deal Hand ---
    else if (dealingStep === 3) {
        cardsToDeal = { p: currentDeck.slice(0, 3), o: currentDeck.slice(3, 6) };
        remainingDeck = currentDeck.slice(6);
        nextStep = 4;

        for (let i = 0; i < 3; i++) {
            animations.push({ card: cardsToDeal.p[i], startRect, endRect: getHandCardFanRect(playerHandRect, i, 3, cardWidth, cardHeight), delay, isFaceUp: true, id: `deal-${cardsToDeal.p[i].id}` });
            delay += delayIncrement;
            animations.push({ card: cardsToDeal.o[i], startRect, endRect: opponentHandRect, delay, isFaceUp: false, id: `deal-${cardsToDeal.o[i].id}` });
            delay += delayIncrement;
        }
        
        finalGameStateUpdate = (prev) => {
            const playersWithHands = prev.players.map(p => {
                if (p.isAI) return { ...p, hand: cardsToDeal.o };
                return { ...p, hand: cardsToDeal.p.sort((a,b) => a.value - b.value) };
            });
            
            return {
                ...prev,
                players: playersWithHands,
                deck: remainingDeck,
                stage: GameStage.SWAP,
                currentPlayerId: -1,
                isPlayerTurn: false,
            };
        };
    } else {
      return; // Should not happen
    }
    
    setDealAnimationState(animations);
    const totalAnimationTime = delay + 700; // Last card's delay + animation duration
    setTimeout(() => {
        setGameState(finalGameStateUpdate!);
        setDealAnimationState(null);
        setDealingStep(nextStep);
        if (nextStep === 4) {
            setSpecialMessage({ text: "Change Cards?", type: 'event' });
        } else if (endMessage) {
            setSpecialMessage(endMessage);
        }
    }, totalAnimationTime);
  };
  
  const handleStartGame = () => {
      if(!gameState || gameState.stage !== GameStage.SWAP) return;
      setSpecialMessage({ text: "Begin!", type: 'event' });
      setGameState(prev => ({
          ...prev!,
          stage: GameStage.PLAY,
          currentPlayerId: 0,
          isPlayerTurn: true,
      }));
      setIsInitialPlay(true);
      setIsMenuOpen(false);
  }

  const handleResetGame = () => {
    setGameState(initializeGame());
    setSelectedCards([]);
    setIsInvalidPlay(false);
    setAnimationState(null);
    setEatAnimationState(null);
    setDealAnimationState(null);
    setRefillAnimationState(null);
    setHiddenCardIds(new Set());
    setIsInitialPlay(false);
    setSpecialEffect(null);
    setSpecialMessage(null);
    setDealingStep(0);
    setIsMenuOpen(false);
    setIsBinViewOpen(false);
  }

  const handleSetDifficulty = (newDifficulty: Difficulty) => {
    setDifficulty(newDifficulty);
    handleResetGame();
  };

  // AI Turn Logic
  useEffect(() => {
    if (gameState && gameState.stage === GameStage.PLAY && gameState.players[gameState.currentPlayerId].isAI && !gameState.winner && !animationState && !eatAnimationState && !refillAnimationState) {
      const turnTimeout = setTimeout(() => {
        const aiPlayer = gameState.players[gameState.currentPlayerId];
        const targetCard = gameState.mpa.length > 0 ? gameState.mpa[gameState.mpa.length - 1] : undefined;
        
        const play = getAIPlay(aiPlayer, targetCard, gameState.mpa.length, gameState.deck.length, difficulty);

        if (aiPlayer.hand.length === 0 && aiPlayer.lastChance.length === 0) {
            // AI Last Stand Logic
            const cardToPlay = play[0];
            const cardIndex = aiPlayer.lastStand.findIndex(c => c.id === cardToPlay.id);

            // Remove card from state before animating
            setGameState(prev => {
                if (!prev) return null;
                const newPlayers = prev.players.map(p => {
                    if (p.id === aiPlayer.id) {
                        const newLastStand = [...p.lastStand];
                        if (cardIndex > -1) newLastStand.splice(cardIndex, 1);
                        return { ...p, lastStand: newLastStand };
                    }
                    return p;
                });
                return { ...prev, players: newPlayers };
            });

            const startRect = opponentLastStandRef.current?.getBoundingClientRect();
            if (isValidPlay([cardToPlay], targetCard)) {
                initiatePlayAnimation([cardToPlay], aiPlayer, startRect);
            } else {
                // AI Busts!
                const items: EatAnimationItem[] = gameState.mpa.map(c => ({
                    card: c,
                    startRect: mpaRef.current!.getBoundingClientRect(),
                    id: `eat-${c.id}`
                }));
                if (startRect) {
                    items.push({
                        card: cardToPlay,
                        startRect: startRect,
                        id: `eat-fail-${cardToPlay.id}`
                    });
                }
                initiateEatAnimation(items, 'opponent');
                setGameState(prev => ({ ...prev!, mpa: [] }));
            }
        } else if (play.length > 0) {
            // Normal AI Play
            setGameState(prev => {
                if (!prev) return null;
                const newPlayers = prev.players.map(p => {
                    if (p.id === aiPlayer.id) {
                        return {
                            ...p,
                            hand: p.hand.filter(c => !play.some(sc => sc.id === c.id)),
                            lastChance: p.lastChance.filter(c => !play.some(sc => sc.id === c.id))
                        };
                    }
                    return p;
                });
                return { ...prev, players: newPlayers };
            });
            initiatePlayAnimation(play, aiPlayer);
        } else {
            // AI must eat
            const items: EatAnimationItem[] = gameState.mpa.map(card => ({
                card,
                startRect: mpaRef.current!.getBoundingClientRect(),
                id: `eat-${card.id}`
            }));
            initiateEatAnimation(items, 'opponent');
            setGameState(prev => ({ ...prev!, mpa: [] }));
        }
      }, 1000);
      return () => clearTimeout(turnTimeout);
    }
  }, [gameState, animationState, eatAnimationState, refillAnimationState, difficulty]);
  
  if (!gameState) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  const humanPlayer = gameState.players.find(p => !p.isAI)!;
  const aiPlayer = gameState.players.find(p => p.isAI)!;

  const eatenCardsForCompletion = eatAnimationState?.map(item => item.card);

  return (
    <div className="game-board-bg min-h-screen flex flex-col overflow-hidden relative p-2">
      <div 
        className="absolute top-2 left-1/2 -translate-x-1/2 text-white text-sm font-light opacity-25 pointer-events-none select-none"
      >
        created by SalamancaTech
      </div>
      
      {/* Pop-up Messages Layer */}
      {specialMessage && (
        <div 
            className="fixed inset-0 flex items-start justify-center pointer-events-none z-[200] pt-44"
            onAnimationEnd={() => {
                if (specialMessage.type === 'event') {
                    setSpecialMessage(null);
                }
            }}
        >
            {specialMessage.type === 'prompt' ? (
                <div className="text-4xl md:text-5xl font-bold text-yellow-300 animate-prompt-fade-in" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                    {specialMessage.text}
                </div>
            ) : (
                <div 
                    className={`text-6xl md:text-8xl font-black ${specialMessage.text === 'Change Cards?' ? 'text-yellow-300' : 'text-white'} uppercase ${specialMessage.text === 'Begin!' ? 'animate-begin' : 'animate-four-of-a-kind'}`} 
                    style={{ textShadow: '0 0 10px #ff0, 0 0 20px #ff0, 0 0 30px #f0f, 0 0 40px #f0f' }}
                >
                    {specialMessage.text}
                </div>
            )}
        </div>
      )}

      {/* Menu & Animation Layer */}
      <div className="absolute top-4 right-4 z-50">
        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 rounded-full bg-black/30 hover:bg-black/50 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        {isMenuOpen && (
          <div className="absolute top-12 right-0 bg-gray-800 rounded-lg shadow-xl py-2 w-48">
              <button onClick={handleResetGame} className="block w-full text-left px-4 py-2 text-white hover:bg-gray-700 transition-colors">Reset Game</button>
              <div className="border-t border-gray-700 my-2"></div>
              <div className="px-4 py-1 text-sm text-gray-400">Difficulty</div>
              <button onClick={() => handleSetDifficulty('Easy')} className={`block w-full text-left px-4 py-2 text-white hover:bg-gray-700 transition-colors ${difficulty === 'Easy' ? 'font-bold text-yellow-400' : ''}`}>Easy</button>
              <button onClick={() => handleSetDifficulty('Medium')} className={`block w-full text-left px-4 py-2 text-white hover:bg-gray-700 transition-colors ${difficulty === 'Medium' ? 'font-bold text-yellow-400' : ''}`}>Medium</button>
              <button onClick={() => handleSetDifficulty('Hard')} className={`block w-full text-left px-4 py-2 text-white hover:bg-gray-700 transition-colors ${difficulty === 'Hard' ? 'font-bold text-yellow-400' : ''}`}>Hard</button>
              <button onClick={() => handleSetDifficulty('Family')} className={`block w-full text-left px-4 py-2 text-white hover:bg-gray-700 transition-colors ${difficulty === 'Family' ? 'font-bold text-yellow-400' : ''}`}>Playing with the Family</button>
              <div className="border-t border-gray-700 my-2"></div>
              <div className="px-4 py-2 flex justify-between items-center text-white">
                <span>Cheatin'!</span>
                <button 
                  onClick={() => setIsCheatingEnabled(!isCheatingEnabled)} 
                  className={`w-12 h-6 rounded-full flex items-center transition-colors ${isCheatingEnabled ? 'bg-yellow-500' : 'bg-gray-600'}`}
                >
                  <span className={`block w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${isCheatingEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
          </div>
        )}
      </div>

      {specialEffect && (
        <SpecialEffect
          type={specialEffect.type}
          rect={specialEffect.rect}
          onComplete={() => setSpecialEffect(null)}
        />
      )}

      {isBinViewOpen && (
        <BinViewModal cards={gameState.bin} onClose={() => setIsBinViewOpen(false)} />
      )}

      {dealAnimationState && dealAnimationState.map((anim, index) => (
        <AnimatedCard
            key={anim.id}
            card={anim.card}
            startRect={anim.startRect}
            endRect={anim.endRect}
            animationType="play"
            delay={anim.delay}
            zIndex={index}
            isFaceUp={anim.isFaceUp}
            onAnimationEnd={() => {}}
        />
      ))}
      {refillAnimationState && refillAnimationState.items.map((anim, index) => (
        <AnimatedCard
            key={anim.id}
            card={anim.card}
            startRect={anim.startRect}
            endRect={anim.endRect}
            animationType="play"
            delay={anim.delay}
            zIndex={index + 20}
            isFaceUp={anim.isFaceUp}
            onAnimationEnd={() => {
                if (index === refillAnimationState.items.length - 1) {
                    completeRefill();
                }
            }}
        />
      ))}
      {animationState && animationState.cards.map((card, index) => (
        <AnimatedCard
          key={card.id}
          card={card}
          startRect={animationState.startRect}
          endRect={animationState.endRect}
          animationType="play"
          delay={index * 50}
          zIndex={index}
          onAnimationEnd={() => {
            if (index === animationState.cards.length - 1) {
              handlePlayComplete(animationState.cards, animationState.playerWhoPlayed);
              setAnimationState(null);
              setHiddenCardIds(new Set());
            }
          }}
        />
      ))}
      {eatAnimationState && eatAnimationState.map((item, index) => {
          const destination = gameState.players[gameState.currentPlayerId].isAI ? opponentHandRef.current : playerHandRef.current;
          return (
            <AnimatedCard
              key={item.id}
              card={item.card}
              startRect={item.startRect}
              endRect={destination!.getBoundingClientRect()}
              animationType="eat"
              delay={index * 50}
              zIndex={index}
              isFaceUp={true} // Reveal eaten cards
              onAnimationEnd={() => {
                if (index === eatAnimationState.length - 1) {
                  completeEat(eatenCardsForCompletion!);
                }
              }}
            />
          );
      })}

      {/* Opponent's Area */}
      <PlayerArea
        player={aiPlayer}
        isCurrentPlayer={gameState.currentPlayerId === aiPlayer.id}
        selectedCards={[]}
        onCardSelect={() => {}}
        isPlayer={false}
        currentStage={gameState.stage}
        hiddenCardIds={hiddenCardIds}
        playerHandRef={opponentHandRef}
        lastStandRef={opponentLastStandRef}
        lastChanceRef={opponentLastChanceRef}
        cardTableRef={opponentCardTableRef}
      />

      {/* Game Board Wrapper */}
      <div className="flex-grow flex flex-col items-center justify-end pb-72">
          {gameState.stage === GameStage.SWAP && (
            <button 
              onClick={handleStartGame} 
              className="mb-4 px-8 py-3 bg-yellow-500 text-gray-900 font-bold rounded-lg shadow-lg hover:bg-yellow-400 transition-colors z-20 transform hover:scale-105"
            >
              Start Game
            </button>
          )}
          <GameBoard
            deckCount={gameState.deck.length}
            mpa={gameState.mpa}
            binCount={gameState.bin.length}
            onMpaClick={handleMpaClick}
            isPlayerTurn={gameState.isPlayerTurn}
            hasSelectedCards={selectedCards.length > 0}
            isInvalidPlay={isInvalidPlay}
            stage={gameState.stage}
            onDeckClick={handleDeckClick}
            mpaRef={mpaRef}
            deckRef={deckRef}
            isEating={!!eatAnimationState && eatAnimationState.length > 0}
            dealingStep={dealingStep}
            isCheatingEnabled={isCheatingEnabled}
            onBinClick={() => setIsBinViewOpen(true)}
          />
      </div>
      
      {/* Player's Controls & Area */}
      <div className="relative">
        <PlayerArea
          player={humanPlayer}
          isCurrentPlayer={gameState.currentPlayerId === humanPlayer.id}
          selectedCards={selectedCards}
          onCardSelect={handleCardSelect}
          onLastStandCardSelect={handleLastStandCardSelect}
          isPlayer={true}
          currentStage={gameState.stage}
          hiddenCardIds={hiddenCardIds}
          playerHandRef={playerHandRef}
          lastStandRef={playerLastStandRef}
          lastChanceRef={playerLastChanceRef}
          cardTableRef={playerCardTableRef}
        />
      </div>

      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 flex space-x-4">
        {gameState.stage === GameStage.GAME_OVER && (
          <div className="text-center p-4 bg-black/50 rounded-lg">
            <h2 className="text-3xl font-bold mb-4">{gameState.winner?.isAI ? 'You Lose!' : 'You Win!'}</h2>
            <button onClick={() => setGameState(initializeGame())} className="px-6 py-3 bg-gray-200 text-black font-bold rounded-lg shadow-lg hover:bg-white transition-colors">
              Play Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;