import { JudasGameState, JudasPlayer } from './types';
import { assignSecrets } from './logic';
import { User } from '../../model/user_status';
import { PUZZLE_REWARDS } from '../GAME_CONSTANTS';

const games = new Map<string, JudasGameState>();
const GAME_ID_LENGTH = 6;

// Generate a unique game ID
function generateGameId(): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result: string;
    do {
        result = Array.from({ length: GAME_ID_LENGTH }, () => 
            characters.charAt(Math.floor(Math.random() * characters.length))
        ).join('');
    } while (Array.from(games.values()).some(game => game.gameId === result));
    return result;
}

// Get game by game ID
export function getGame(gameId: string): JudasGameState | undefined {
    return Array.from(games.values()).find(game => game.gameId === gameId);
}

// Create new game instance
export function createGame(
    channelId: string, 
    hostId: string,
    minPlayers: number,
    maxPlayers: number
): JudasGameState {
    const gameId = generateGameId();
    const game: JudasGameState = {
        gameId,
        channelId,
        hostId,
        phase: 1,
        difficulty: maxPlayers > 5 ? 'hard' : 'normal',
        minPlayers,
        maxPlayers,
        players: [],
        judasId: null,
        secrets: [],
        fakeSecret: '',
        started: false,
        votes: {},
        accusations: {},
        eliminated: [],
        roundDuration: 120000 // 2 minutes per round
    };
    
    games.set(channelId, game);
    return game;
}

// Start game with assigned roles
export async function startGame(gameId: string): Promise<boolean> {
    const game = getGame(gameId);
    if (!game || game.started || game.players.length < game.minPlayers) {
        return false;
    }

    // Initialize player stats from database
    for (const player of game.players) {
        const userData = await User.findOne({ discordId: player.id });
        if (userData) {
            player.sanity = userData.sanity;
            player.merit = userData.meritPoints;
            player.suspiciousLevel = userData.suspiciousLevel;
        }
    }

    game.started = true;
    game.roundStartTime = Date.now();
    return true;
}

// End game and cleanup
export function endGame(gameId: string): void {
    const game = getGame(gameId);
    if (game) {
        if (game.timer) {
            clearTimeout(game.timer);
        }
        games.delete(game.channelId);
    }
}

// Check if player is in game
export function isPlayerInGame(gameId: string, playerId: string): boolean {
    const game = getGame(gameId);
    return game ? game.players.some(p => p.id === playerId) : false;
}

// Get player from game
export function getPlayer(gameId: string, playerId: string): JudasPlayer | undefined {
    const game = getGame(gameId);
    return game?.players.find(p => p.id === playerId);
}

// Get alive players
export function getAlivePlayers(gameId: string): JudasPlayer[] {
    const game = getGame(gameId);
    return game ? game.players.filter(p => p.isAlive) : [];
}

// Check if game should advance to next phase
export function shouldAdvancePhase(gameId: string): boolean {
    const game = getGame(gameId);
    if (!game || !game.started) return false;

    const alivePlayers = game.players.filter(p => p.isAlive);
    switch (game.phase) {
        case 1:
            // Phase 1 ends when enough secrets are shared or time runs out
            return alivePlayers.filter(p => p.revealed).length >= Math.ceil(alivePlayers.length / 2);
        case 2:
            // Phase 2 ends when all players have voted or time runs out
            return Object.keys(game.votes).length === alivePlayers.length;
        case 3:
            // Phase 3 ends with game end
            return false;
        default:
            return false;
    }
}

// Advance game phase
export function advancePhase(gameId: string): void {
    const game = getGame(gameId);
    if (!game || game.phase >= 3) return;

    game.phase++;
    game.roundStartTime = Date.now();
    game.votes = {};
    game.accusations = {};

    if (game.timer) {
        clearTimeout(game.timer);
        game.timer = setTimeout(() => {
            if (game.phase < 3) {
                advancePhase(gameId);
            }
        }, game.roundDuration);
    }
}

// Reset game votes
export function resetVotes(gameId: string): void {
    const game = getGame(gameId);
    if (game) {
        game.votes = {};
    }
}

// Reset game accusations
export function resetAccusations(gameId: string): void {
    const game = getGame(gameId);
    if (game) {
        game.accusations = {};
    }
}

// Handle player elimination
export function eliminatePlayer(gameId: string, playerId: string): boolean {
    const game = getGame(gameId);
    if (!game) return false;

    const player = game.players.find(p => p.id === playerId);
    if (!player || !player.isAlive) return false;

    player.isAlive = false;
    game.eliminated.push(playerId);
    return true;
}

// Check if game is over
export function isGameOver(gameId: string): boolean {
    const game = getGame(gameId);
    if (!game) return true;

    const alivePlayers = getAlivePlayers(gameId);
    return alivePlayers.length <= 2 || game.phase >= 3;
}

// Get remaining time in current round
export function getRemainingTime(gameId: string): number {
    const game = getGame(gameId);
    if (!game || !game.roundStartTime) return 0;

    const elapsed = Date.now() - game.roundStartTime;
    return Math.max(0, game.roundDuration - elapsed);
}