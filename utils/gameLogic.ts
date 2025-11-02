import { Suit, Rank, Card, Player, GameState, GameStage, Difficulty } from '../types';

const getCardValue = (rank: Rank): number => {
  switch (rank) {
    case Rank.Two: return 2;
    case Rank.Three: return 3;
    case Rank.Four: return 4;
    case Rank.Five: return 5;
    case Rank.Six: return 6;
    case Rank.Seven: return 7;
    case Rank.Eight: return 8;
    case Rank.Nine: return 9;
    case Rank.Ten: return 10;
    case Rank.Jack: return 11;
    case Rank.Queen: return 12;
    case Rank.King: return 13;
    case Rank.Ace: return 14;
    default: return 0;
  }
};

export const createDeck = (): Card[] => {
  const suits = Object.values(Suit);
  const ranks = Object.values(Rank);
  const deck: Card[] = [];
  
  suits.forEach(suit => {
    ranks.forEach(rank => {
      deck.push({
        suit,
        rank,
        value: getCardValue(rank),
        id: `${rank}-${suit}`,
      });
    });
  });

  // Modify deck for Quatch rules: only one '2' and one '10'
  const randomSuitForTwo = suits[Math.floor(Math.random() * suits.length)];
  const randomSuitForTen = suits[Math.floor(Math.random() * suits.length)];

  const finalDeck = deck.filter(card => card.rank !== Rank.Two && card.rank !== Rank.Ten);
  
  finalDeck.push({ suit: randomSuitForTwo, rank: Rank.Two, value: getCardValue(Rank.Two), id: `${Rank.Two}-${randomSuitForTwo}`});
  finalDeck.push({ suit: randomSuitForTen, rank: Rank.Ten, value: getCardValue(Rank.Ten), id: `${Rank.Ten}-${randomSuitForTen}`});

  return finalDeck;
};

export const shuffleDeck = <T,>(array: T[]): T[] => {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
};

export const initializeGame = (): GameState => {
    const players: Player[] = [
        { id: 0, name: 'Player 1', hand: [], lastChance: [], lastStand: [], isAI: false },
        { id: 1, name: 'Opponent', hand: [], lastChance: [], lastStand: [], isAI: true },
    ];
    const deck = shuffleDeck(createDeck());
    
    return {
        players,
        deck,
        mpa: [],
        bin: [],
        currentPlayerId: -1, // No player starts until dealing
        stage: GameStage.SETUP,
        isPlayerTurn: false,
        winner: null,
        turnDirection: 1,
    };
};

export const isValidPlay = (selectedCards: Card[], targetCard: Card | undefined): boolean => {
    if (selectedCards.length === 0) return false;

    // All selected cards must be the same rank
    const firstCardRank = selectedCards[0].rank;
    if (!selectedCards.every(card => card.rank === firstCardRank)) return false;

    const playCard = selectedCards[0];

    // A '2' or '10' can be played on anything
    if (playCard.rank === Rank.Two || playCard.rank === Rank.Ten) return true;

    // If MPA is empty, any card is valid (unless it's a reset)
    if (!targetCard) return true;

    // If top card is a '2' (reset), any card is valid
    if (targetCard.rank === Rank.Two) return true;
    
    // Normal play: value must be >= target
    return playCard.value >= targetCard.value;
};

export const playerHasValidMove = (player: Player, targetCard: Card | undefined): boolean => {
    // During last stand, the player's only move is to pick a card. They cannot choose to eat.
    if (player.hand.length === 0 && player.lastChance.length === 0) {
        return true; 
    }

    const sourcePile = player.hand.length > 0 ? player.hand : player.lastChance;

    // Check for single card plays
    for (const card of sourcePile) {
        if (isValidPlay([card], targetCard)) {
            return true;
        }
    }
    
    // Check for multi-card plays
    const rankGroups = sourcePile.reduce((acc, card) => {
        acc[card.rank] = acc[card.rank] || [];
        acc[card.rank].push(card);
        return acc;
    }, {} as Record<Rank, Card[]>);

    for (const rank in rankGroups) {
        const group = rankGroups[rank as Rank];
        if (group.length > 1 && isValidPlay(group, targetCard)) {
            return true;
        }
    }

    return false;
};

export const getAIStartingCard = (player: Player): Card[] => {
    if (player.hand.length === 0) {
        return [];
    }

    // Find the lowest value card in hand
    const lowestValue = Math.min(...player.hand.map(c => c.value));
    
    // Return all cards with that lowest value
    return player.hand.filter(c => c.value === lowestValue);
};

const getAllPossiblePlays = (sourcePile: Card[], targetCard: Card | undefined, difficulty: Difficulty): Card[][] => {
    const possiblePlays: Card[][] = [];

    // Group cards by rank
    const rankGroups = sourcePile.reduce((acc, card) => {
        acc[card.rank] = acc[card.rank] || [];
        acc[card.rank].push(card);
        return acc;
    }, {} as Record<Rank, Card[]>);

    for (const rank in rankGroups) {
        const group = rankGroups[rank as Rank];
        
        if (difficulty === 'Hard' || difficulty === 'Family') {
            // Hard/Family can play subsets of cards
            for (let i = 1; i <= group.length; i++) {
                const subset = group.slice(0, i);
                if (isValidPlay(subset, targetCard)) {
                    possiblePlays.push(subset);
                }
            }
        } else {
            // Easy/Medium must play all cards of a rank at once
            if (isValidPlay(group, targetCard)) {
                possiblePlays.push(group);
            }
        }
    }
    return possiblePlays;
};


export const getAIPlay = (player: Player, targetCard: Card | undefined, mpaSize: number, deckSize: number, difficulty: Difficulty): Card[] => {
    if (player.hand.length === 0 && player.lastChance.length === 0 && player.lastStand.length > 0) {
        // Last Stand phase: AI must pick a random card, logic is the same for all difficulties
        const randomIndex = Math.floor(Math.random() * player.lastStand.length);
        return [player.lastStand[randomIndex]];
    }

    const sourcePile = player.hand.length > 0 ? player.hand : player.lastChance;
    const playableCards = getAllPossiblePlays(sourcePile, targetCard, difficulty);

    if (playableCards.length === 0) {
        return []; // AI must eat
    }

    // --- Difficulty-specific strategies ---

    if (difficulty === 'Easy') {
        // Always play the lowest possible value card(s).
        playableCards.sort((a, b) => a[0].value - b[0].value);
        return playableCards[0];
    }
    
    const specialPlays = playableCards.filter(play => play[0].rank === Rank.Two || play[0].rank === Rank.Ten);
    const normalPlays = playableCards.filter(play => play[0].rank !== Rank.Two && play[0].rank !== Rank.Ten);

    if (difficulty === 'Medium') {
        const isPressureSituation = mpaSize >= 5 || (deckSize <= 10 && mpaSize >= 3);
        if (normalPlays.length > 0) {
            if (isPressureSituation) {
                // High-pressure: play highest value card to force an eat.
                normalPlays.sort((a, b) => b[0].value - a[0].value || b.length - a.length);
                return normalPlays[0];
            } else {
                // Normal situation: play lowest value card to conserve high cards.
                normalPlays.sort((a, b) => a[0].value - b[0].value || b.length - a.length);
                return normalPlays[0];
            }
        }
        if (specialPlays.length > 0) {
            // Prioritize '10' for another turn and to clear the pile.
            const tenPlay = specialPlays.find(play => play[0].rank === Rank.Ten);
            if (tenPlay) return tenPlay;
            const twoPlay = specialPlays.find(play => play[0].rank === Rank.Two);
            if (twoPlay) return twoPlay;
        }
    }

    if (difficulty === 'Hard' || difficulty === 'Family') {
        const isFamilyPressure = difficulty === 'Family' && (mpaSize >= 3 || (deckSize <= 15 && mpaSize >= 2));
        const isHardPressure = mpaSize >= 5 || (deckSize <= 10 && mpaSize >= 3);

        // 1. Strategic '10' Use: Clear a valuable pile or chain plays.
        const tenPlay = specialPlays.find(play => play[0].rank === Rank.Ten);
        if (tenPlay && (mpaSize >= (difficulty === 'Family' ? 3 : 5))) {
            return tenPlay;
        }

        // 2. Pressure Play: Force an eat with a high card.
        if (isHardPressure || isFamilyPressure) {
            if (normalPlays.length > 0) {
                 // Sort by highest value, but prefer playing fewer cards to save others
                normalPlays.sort((a, b) => {
                    if (b[0].value !== a[0].value) return b[0].value - a[0].value;
                    return a.length - b.length; 
                });
                return normalPlays[0];
            }
        }

        // 3. Normal Play: Conserve high cards and special cards.
        if (normalPlays.length > 0) {
            // Play lowest value card.
            normalPlays.sort((a, b) => {
                if (a[0].value !== b[0].value) return a[0].value - b[0].value;
                // Family dumps more cards to thin hand; Hard conserves options.
                return difficulty === 'Family' ? b.length - a.length : a.length - b.length;
            });
            return normalPlays[0];
        }

        // 4. Forced Special Play: No other options, must use a special card.
        if (specialPlays.length > 0) {
            if (tenPlay) return tenPlay; // Prefer '10' for another turn.
            const twoPlay = specialPlays.find(play => play[0].rank === Rank.Two);
            if (twoPlay) return twoPlay; // Use '2' to reset.
        }
    }

    // Fallback: should not be reachable if playableCards has items.
    return playableCards[0] || [];
};
