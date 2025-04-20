import { JudasGameState } from '../constants/judas/types';
import {
    getGame as getGameState,
    createGame as createGameState,
    endGame as endGameState,
    startGame as startGameState
} from '../constants/judas/game';

export function getGame(gameId: string): JudasGameState | undefined {
    return getGameState(gameId);
}

export function createGame(
    channelId: string,
    hostId: string,
    minPlayers: number,
    maxPlayers: number
): JudasGameState {
    return createGameState(channelId, hostId, minPlayers, maxPlayers);
}

export function startGame(gameId: string): Promise<boolean> {
    return startGameState(gameId);
}

export function endGame(gameId: string): void {
    return endGameState(gameId);
}