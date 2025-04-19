export interface JudasPlayer {
    id: string;
    username: string;
    secret: string;
    revealed: boolean;
    sanity: number;
    merit: number;
    isAlive: boolean;
    vote?: string;
  }
  
  export interface JudasGameState {
    channelId: string;
    hostId: string;
    phase: 1 | 2 | 3;
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
  }