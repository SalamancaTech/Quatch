
export enum Suit {
  Spades = '♠',
  Hearts = '♥',
  Clubs = '♣',
  Diamonds = '♦',
}

export enum Rank {
  Two = '2',
  Three = '3',
  Four = '4',
  Five = '5',
  Six = '6',
  Seven = '7',
  Eight = '8',
  Nine = '9',
  Ten = '10',
  Jack = 'J',
  Queen = 'Q',
  King = 'K',
  Ace = 'A',
}

export interface Card {
  suit: Suit;
  rank: Rank;
  value: number;
  id: string;
}

export interface Player {
  id: number;
  name: string;
  hand: Card[];
  lastChance: Card[];
  lastStand: Card[];
  isAI: boolean;
}

export enum GameStage {
  SETUP = 'SETUP',
  SWAP = 'SWAP',
  PLAY = 'PLAY',
  GAME_OVER = 'GAME_OVER',
}

export interface GameState {
  players: Player[];
  deck: Card[];
  mpa: Card[]; // Main Play Area
  bin: Card[];
  currentPlayerId: number;
  stage: GameStage;
  isPlayerTurn: boolean;
  winner: Player | null;
  turnDirection: number; // 1 for clockwise, -1 for counter-clockwise
}

export type Difficulty = 'Easy' | 'Medium' | 'Hard' | 'Family';
