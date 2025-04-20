// Game player interface
export interface JudasPlayer {
    id: string;
    username: string;
    secret: string;
    revealed: boolean;
    sanity: number;
    merit: number;
    suspiciousLevel: number;
    isAlive: boolean;
    vote?: string;
    accusation?: string;
    lastAction?: number;
}

// Game state interface
export interface JudasGameState {
    gameId: string;
    channelId: string;
    hostId: string;
    phase: 1 | 2 | 3;
    difficulty: 'normal' | 'hard';
    minPlayers: number;
    maxPlayers: number;
    players: JudasPlayer[];
    judasId: string | null;
    secrets: string[];
    fakeSecret: string;
    started: boolean;
    votes: Record<string, string>;
    accusations: Record<string, string>;
    eliminated: string[];
    martyrId?: string;
    martyrUsed?: boolean;
    timer?: NodeJS.Timeout;
    roundStartTime?: number;
    roundDuration: number;
}