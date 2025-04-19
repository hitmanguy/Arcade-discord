// UNO.ts

// Types
export type Color = 'red' | 'green' | 'blue' | 'yellow' | 'wild';
export type Value =
  | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
  | 'skip' | 'reverse' | 'draw2'
  | 'wild' | 'wild+4';

export interface Card {
  color: Color;
  value: Value;
}

// Create and shuffle a full UNO deck
export function createDeck(): Card[] {
  const deck: Card[] = [];
  const colors: Color[] = ['red', 'green', 'blue', 'yellow'];

  for (const color of colors) {
    // One 0 card per color
    deck.push({ color, value: '0' });

    // Two of each 1-9, skip, reverse, draw2 per color
    const values: Value[] = [
      '1','2','3','4','5','6','7','8','9',
      'skip','reverse','draw2'
    ];

    for (const value of values) {
      deck.push({ color, value });
      deck.push({ color, value });
    }
  }

  // Wild cards
  for (let i = 0; i < 4; i++) {
    deck.push({ color: 'wild', value: 'wild' });
    deck.push({ color: 'wild', value: 'wild+4' });
  }

  return shuffle(deck);
}

// Shuffle deck in place
export function shuffle(deck: Card[]): Card[] {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

// Deal hand to player
export function dealHand(deck: Card[], count: number = 7): Card[] {
  const hand: Card[] = [];
  for (let i = 0; i < count; i++) {
    const card = deck.pop();
    if (card) hand.push(card);
  }
  return hand;
}

// Debug test
const deck = createDeck();
const playerHand = dealHand(deck);

console.log('Player Hand:', playerHand);
console.log('Deck Remaining:', deck.length);
