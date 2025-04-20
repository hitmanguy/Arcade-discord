import { GameState } from './numbers-game-state';

// Store active games
const activeGames: GameState[] = [];

// Generate a random 6-character game code
function generateGameCode(): string {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed similar looking characters
  let code: string;
  do {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
  } while (activeGames.some(g => g.gameCode === code)); // Ensure unique code

  return code;
}

// Create a new game
export function createGame(hostId: string, channelId: string, username: string): string {
  // Check if user is already in an active game
  const existingGame = activeGames.find(game => 
    game.players.some(player => player.id === hostId) && game.gameStarted
  );
  
  if (existingGame) {
    return existingGame.gameCode;
  }

  // Clean up any inactive games for this channel
  const oldGame = activeGames.find(g => g.channelId === channelId);
  if (oldGame) {
    removeGame(oldGame.gameCode);
  }
  
  // Create a new game code
  const gameCode = generateGameCode();
  
  // Create a new game state
  const newGame = new GameState(gameCode, hostId, channelId);
  
  // Add the host as the first player
  newGame.players.push({
    id: hostId,
    username,
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
export function joinGame(gameCode: string, playerId: string, username: string): { 
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

  // Check if player is in another active game
  const otherGame = activeGames.find(g => 
    g !== game && 
    g.gameStarted && 
    g.players.some(p => p.id === playerId)
  );

  if (otherGame) {
    return { success: false, message: "You are already in another active game." };
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
    username,
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
  
  if (game.players.length > 5) {
    return { success: false, message: "Cannot start with more than 5 players." };
  }
  
  // Start the game
  game.gameStarted = true;
  
  return { success: true, game };
}

// Get all active games
export function getActiveGames(): GameState[] {
  return activeGames.filter(game => !game.gameStarted);
}

// Remove a game and clean up
export function removeGame(gameCode: string): void {
  const index = activeGames.findIndex(g => g.gameCode === gameCode);
  if (index !== -1) {
    const game = activeGames[index];
    game.endGame(); // Call cleanup on the game state
    activeGames.splice(index, 1);
  }
}

// Clean up inactive games
export function cleanupInactiveGames(): void {
  const now = Date.now();
  const inactiveGames = activeGames.filter(game => {
    // Remove games that haven't started after 30 minutes
    if (!game.gameStarted && (now - game.createdAt) > 30 * 60 * 1000) {
      return true;
    }
    // Remove finished games after 5 minutes
    if (game.getAlivePlayers().length <= 1 && (now - game.lastActivityAt) > 5 * 60 * 1000) {
      return true;
    }
    return false;
  });

  inactiveGames.forEach(game => removeGame(game.gameCode));
}

// Run cleanup every 5 minutes
setInterval(cleanupInactiveGames, 5 * 60 * 1000);
