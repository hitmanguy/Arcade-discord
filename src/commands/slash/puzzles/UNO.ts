// unoCardGame.ts

function buildDeck(): string[] {
  const deck: string[] = [];
  const colours = ["Red", "Green", "Yellow", "Blue"];
  const values = [
    "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
    "Draw Two", "Skip", "Reverse"
  ];
  const wilds = ["Wild", "Wild Draw Four"];

  for (const colour of colours) {
    for (const value of values) {
      const cardVal = `${colour} ${value}`;
      deck.push(cardVal);
      if (value !== "0") deck.push(cardVal);
    }
  }

  for (let i = 0; i < 4; i++) {
    deck.push(wilds[0]);
    deck.push(wilds[1]);
  }

  return deck;
}

function shuffleDeck(deck: string[]): string[] {
  for (let i = 0; i < deck.length; i++) {
    const randPos = Math.floor(Math.random() * deck.length);
    [deck[i], deck[randPos]] = [deck[randPos], deck[i]];
  }
  return deck;
}

function drawCards(deck: string[], numCards: number): string[] {
  return deck.splice(0, numCards);
}

function showHand(player: number, playerHand: string[]): void {
  console.log(`Player ${player + 1}'s Turn`);
  console.log("Your Hand");
  console.log("------------------");
  playerHand.forEach((card, index) => {
    console.log(`${index + 1}) ${card}`);
  });
  console.log("");
}

function canPlay(colour: string, value: string, playerHand: string[]): boolean {
  return playerHand.some(card => card.includes("Wild") || card.includes(colour) || card.includes(value));
}

// Main Game Logic
let unoDeck = shuffleDeck(shuffleDeck(buildDeck()));
const discards: string[] = [];
const players: string[][] = [];
const colours = ["Red", "Green", "Yellow", "Blue"];

let numPlayers = parseInt(prompt("How many players? (2-4)") || "0");
while (numPlayers < 2 || numPlayers > 4) {
  numPlayers = parseInt(prompt("Invalid. Please enter a number between 2-4.") || "0");
}

for (let i = 0; i < numPlayers; i++) {
  players.push(drawCards(unoDeck, 5));
}

let playerTurn = 0;
let playDirection = 1;
let playing = true;
let winner = "";

// Set first card
discards.push(unoDeck.shift()!);
let [currentColour, ...rest] = discards[0].split(" ");
let cardVal = currentColour === "Wild" ? "Any" : rest.join(" ");

while (playing) {
  const hand = players[playerTurn];
  showHand(playerTurn, hand);
  console.log(`Card on top of discard pile: ${discards[discards.length - 1]}`);

  if (canPlay(currentColour, cardVal, hand)) {
    let cardChosen = parseInt(prompt("Which card do you want to play?") || "0");
    while (!canPlay(currentColour, cardVal, [hand[cardChosen - 1]])) {
      cardChosen = parseInt(prompt("Not a valid card. Which card do you want to play?") || "0");
    }

    const playedCard = hand.splice(cardChosen - 1, 1)[0];
    console.log(`You played ${playedCard}`);
    discards.push(playedCard);

    if (hand.length === 0) {
      playing = false;
      winner = `Player ${playerTurn + 1}`;
      break;
    }

    [currentColour, ...rest] = playedCard.split(" ");
    cardVal = currentColour === "Wild" ? "Any" : rest.join(" ");

    if (currentColour === "Wild") {
      colours.forEach((c, idx) => console.log(`${idx + 1}) ${c}`));
      let newColour = parseInt(prompt("What colour would you like to choose?") || "0");
      while (newColour < 1 || newColour > 4) {
        newColour = parseInt(prompt("Invalid option. What colour would you like to choose?") || "0");
      }
      currentColour = colours[newColour - 1];
    }

    if (cardVal === "Reverse") {
      playDirection *= -1;
    } else if (cardVal === "Skip") {
      playerTurn = (playerTurn + playDirection + numPlayers) % numPlayers;
    } else if (cardVal === "Draw Two") {
      const playerDraw = (playerTurn + playDirection + numPlayers) % numPlayers;
      players[playerDraw].push(...drawCards(unoDeck, 2));
    } else if (cardVal === "Draw Four") {
      const playerDraw = (playerTurn + playDirection + numPlayers) % numPlayers;
      players[playerDraw].push(...drawCards(unoDeck, 4));
    }
  } else {
    console.log("You can't play. You have to draw a card.");
    players[playerTurn].push(...drawCards(unoDeck, 1));
  }

  playerTurn = (playerTurn + playDirection + numPlayers) % numPlayers;
}

console.log("Game Over");
console.log(`${winner} is the Winner!`);
