import { GameState } from './numbers-game-state';

// Store active games
const activeGames: GameState[] = [];

// Generate a random 6-character game code
function generateGameCode(): string {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// Create a new game
export function createGame(hostId: string, channelId: string): string {
  // Check if user is already in a game
  const existingGame = activeGames.find(game => 
    game.players.some(player => player.id === hostId) && !game.gameStarted
  );
  
  if (existingGame) {
    return existingGame.gameCode;
  }
  
  // Create a new game code
  const gameCode = generateGameCode();
  
  // Create a new game state
  const newGame = new GameState(gameCode, hostId, channelId);
  
  // Add the host as the first player
  newGame.players.push({
    id: hostId,
    lives: 10,
    currentNumber: null,
    teamUpWith: null,
    teamUpOffer: null
  });
  
  // Add the game to active games
  activeGames.push(newGame);
  
  return gameCode;
}

// Join a game
export function joinGame(gameCode: string, playerId: string): { 
  success: boolean, 
  message?: string,
  game?: GameState 
} {
  // Find the game
  const game = activeGames.find(g => g.gameCode === gameCode);
  
  if (!game) {
    return { success: false, message: "Game not found with that code." };
  }
  
  if (game.gameStarted) {
    return { success: false, message: "This game has already started." };
  }
  
  // Check if player is already in this game
  if (game.players.some(player => player.id === playerId)) {
    return { success: true, game }; // Already in the game
  }
  
  // Check if game is full
  if (game.players.length >= 5) {
    return { success: false, message: "This game is full (max 5 players)." };
  }
  
  // Add player to the game
  game.players.push({
    id: playerId,
    lives: 10,
    currentNumber: null,
    teamUpWith: null,
    teamUpOffer: null
  });
  
  return { success: true, game };
}

// Start a game
export function startGame(gameCode: string, playerId: string): {
  success: boolean,
  message?: string,
  game?: GameState
} {
  // Find the game
  const game = activeGames.find(g => g.gameCode === gameCode);
  
  if (!game) {
    return { success: false, message: "Game not found with that code." };
  }
  
  if (game.hostId !== playerId) {
    return { success: false, message: "Only the host can start the game." };
  }
  
  if (game.gameStarted) {
    return { success: false, message: "This game has already started." };
  }
  
  if (game.players.length < 3) {
    return { success: false, message: "Need at least 3 players to start the game." };
  }
  
  // Start the game
  game.gameStarted = true;
  
  return { success: true, game };
}

// Get all active games
export function getActiveGames(): GameState[] {
  return activeGames;
}

// Remove a game
export function removeGame(gameCode: string): void {
  const index = activeGames.findIndex(g => g.gameCode === gameCode);
  if (index !== -1) {
    activeGames.splice(index, 1);
  }
}
