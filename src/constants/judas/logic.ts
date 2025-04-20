import { JudasGameState, JudasPlayer } from './types';
import { SYSTEM_LIES } from './phrases';
import { getGame } from './game';

// Function to get alive players
export function getAlivePlayers(gameOrId: JudasGameState | string): JudasPlayer[] {
    const game = typeof gameOrId === 'string' ? getGame(gameOrId) : gameOrId;
    return game ? game.players.filter(p => p.isAlive) : [];
}

const SECRETS = [
    "You have a hidden escape route",
    "You found a guard's keycard",
    "You discovered a secret tunnel",
    "You have an informant on the outside",
    "You hacked the security system",
    "You bribed a corrupt guard",
    "You found blueprints of the prison",
    "You have a contact in administration"
];

const FAKE_SECRETS = [
    "You are actually innocent",
    "You were wrongly imprisoned",
    "You have amnesia about your crimes",
    "You are an undercover investigator",
    "You are a reformed criminal",
    "You are a prison psychologist"
];

export function assignSecrets(gameId: string): { success: boolean, judasId?: string } {
    const game = getGame(gameId);
    if (!game || game.started) return { success: false };

    // Shuffle and select secrets based on player count
    const shuffledSecrets = [...SECRETS].sort(() => Math.random() - 0.5);
    const selectedSecrets = shuffledSecrets.slice(0, game.players.length - 1);
    const fakeSecret = FAKE_SECRETS[Math.floor(Math.random() * FAKE_SECRETS.length)];

    // Assign Judas role
    const judasIndex = Math.floor(Math.random() * game.players.length);
    const judasId = game.players[judasIndex].id;

    // Assign secrets to players
    let secretIndex = 0;
    game.players.forEach((player) => {
        if (player.id === judasId) {
            player.secret = fakeSecret;
        } else {
            player.secret = selectedSecrets[secretIndex++];
        }
    });

    game.secrets = selectedSecrets;
    game.fakeSecret = fakeSecret;
    game.judasId = judasId;

    return { success: true, judasId };
}

export function processVote(gameId: string, voterId: string, targetId: string): boolean {
    const game = getGame(gameId);
    if (!game || !game.started) return false;

    const voter = game.players.find(p => p.id === voterId);
    const target = game.players.find(p => p.id === targetId);

    if (!voter || !target || !voter.isAlive) return false;

    game.votes[voterId] = targetId;
    voter.lastAction = Date.now();

    return true;
}

export function resolveVotes(gameId: string): { eliminated: string, isJudas: boolean } | null {
    const game = getGame(gameId);
    if (!game || !game.started) return null;

    const alivePlayers = getAlivePlayers(game);
    const voteCount: Record<string, number> = {};
    
    // Count votes
    Object.values(game.votes).forEach(targetId => {
        voteCount[targetId] = (voteCount[targetId] || 0) + 1;
    });

    // Find player with most votes
    let maxVotes = 0;
    let eliminatedId = '';
    
    Object.entries(voteCount).forEach(([playerId, votes]) => {
        if (votes > maxVotes) {
            maxVotes = votes;
            eliminatedId = playerId;
        }
    });

    // Check if there's a clear majority
    if (maxVotes > alivePlayers.length / 2) {
        const eliminatedPlayer = game.players.find(p => p.id === eliminatedId);
        if (eliminatedPlayer) {
            eliminatedPlayer.isAlive = false;
            game.eliminated.push(eliminatedId);
            return {
                eliminated: eliminatedId,
                isJudas: eliminatedId === game.judasId
            };
        }
    }

    return null;
}

export function getRandomSystemLie(gameId: string): string {
    const game = getGame(gameId);
    if (!game) return '';

    const alivePlayers = getAlivePlayers(game);
    if (alivePlayers.length === 0) return '';

    const targetPlayer = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
    const lie = SYSTEM_LIES[Math.floor(Math.random() * SYSTEM_LIES.length)];

    return lie.replace('{player}', `<@${targetPlayer.id}>`);
}

export function checkGameEnd(gameId: string): { ended: boolean, judasWon?: boolean } {
    const game = getGame(gameId);
    if (!game || !game.started) return { ended: false };

    const alivePlayers = getAlivePlayers(game);
    const judas = game.players.find(p => p.id === game.judasId);

    // Game ends if Judas is eliminated
    if (judas && !judas.isAlive) {
        return { ended: true, judasWon: false };
    }

    // Game ends if only 2 players remain and one is Judas
    if (alivePlayers.length === 2 && judas?.isAlive) {
        return { ended: true, judasWon: true };
    }

    return { ended: false };
}

export function shouldAdvancePhase(gameId: string): boolean {
    const game = getGame(gameId);
    if (!game || !game.started) return false;

    const alivePlayers = game.players.filter(p => p.isAlive);
    switch (game.phase) {
        case 1:
            return alivePlayers.filter(p => p.revealed).length >= Math.ceil(alivePlayers.length / 2);
        case 2:
            return Object.keys(game.votes).length === alivePlayers.length;
        case 3:
            return false;
        default:
            return false;
    }
}

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