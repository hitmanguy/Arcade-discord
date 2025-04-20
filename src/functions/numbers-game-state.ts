import { 
  TextChannel, 
  EmbedBuilder, 
  Message,
  MessageCollector,
  Client,
  Interaction,
  InteractionType
} from 'discord.js';
import { removeGame } from './numbers-game-lobby';
import { runStandardRound } from './numbers-game-standard-phase';
import { runBetrayalRound } from './numbers-game-betrayal-phase';
import { runFinalDuelRound } from './numbers-game-final-duel';
// Player type definition
export interface Player {
  id: string;
  username: string;
  lives: number;
  currentNumber: number | null;
  teamUpWith: string | null;  // ID of player they want to team up with
  teamUpOffer: string | null; // ID of player who offered to team up
}

export interface TeamUp {
  proposerId: string;
  targetId: string;
  accepted: boolean;
  number: number | null;
}

const modalHandlers = new Map<string, (interaction: Interaction) => Promise<void>>();

export class GameState {
  gameCode: string;
  hostId: string;
  channelId: string;
  players: Player[];
  gameStarted: boolean;
  currentRound: number;
  teamUps: TeamUp[];
  createdAt: number;
  lastActivityAt: number;
  private static handlerRegistered = false;
  
  constructor(gameCode: string, hostId: string, channelId: string) {
    this.gameCode = gameCode;
    this.hostId = hostId;
    this.channelId = channelId;
    this.players = [];
    this.gameStarted = false;
    this.currentRound = 0;
    this.teamUps = [];
    this.createdAt = Date.now();
    this.lastActivityAt = this.createdAt;
  }

  static registerGlobalHandler(client: Client) {
    if (this.handlerRegistered) return;

    client.on('interactionCreate', async (interaction: Interaction) => {
      if (interaction.type === InteractionType.ModalSubmit) {
        const handler = modalHandlers.get(interaction.customId.split('_')[0]);
        if (handler) {
          await handler(interaction);
        }
      }
    });

    this.handlerRegistered = true;
  }

  static registerModalHandler(prefix: string, handler: (interaction: Interaction) => Promise<void>) {
    modalHandlers.set(prefix, handler);
  }

  // Get players who are still alive
  getAlivePlayers(): Player[] {
    return this.players.filter(player => player.lives > 0);
  }
  
  // Reset all player numbers for a new round
  resetRound(): void {
    this.currentRound++;
    this.players.forEach(player => {
      player.currentNumber = null;
      player.teamUpWith = null;
      player.teamUpOffer = null;
    });
    this.teamUps = [];
    this.updateLastActivity();
  }
  
  // Calculate average of all numbers
  calculateAverage(): number | null {
    const alivePlayers = this.getAlivePlayers();
    const validNumbers = alivePlayers
      .filter(player => player.currentNumber !== null)
      .map(player => player.currentNumber!);
    
    if (validNumbers.length === 0) return null;
    
    const sum = validNumbers.reduce((a, b) => a + b, 0);
    return sum / validNumbers.length;
  }
  
  // Find unique numbers (no duplicates)
  getUniqueNumbers(): Map<number, Player[]> {
    const numberMap = new Map<number, Player[]>();
    
    this.getAlivePlayers().forEach(player => {
      if (player.currentNumber === null) return;
      
      if (!numberMap.has(player.currentNumber)) {
        numberMap.set(player.currentNumber, []);
      }
      
      numberMap.get(player.currentNumber)!.push(player);
    });
    
    return numberMap;
  }
  
  // Run standard phase (5-4 players)
  async runStandardPhase(channel: TextChannel): Promise<void> {
    await runStandardRound(channel, this);
    this.updateLastActivity();
  }
  
  // Run betrayal phase (3 players)
  async runBetrayalPhase(channel: TextChannel): Promise<void> {
    await runBetrayalRound(channel, this);
    this.updateLastActivity();
  }
  
  // Run final duel phase (2 players)
  async runFinalDuelPhase(channel: TextChannel): Promise<void> {
    await runFinalDuelRound(channel, this);
    this.updateLastActivity();
  }
  
  // Reduce a player's life
  reduceLife(playerId: string): void {
    const player = this.players.find(p => p.id === playerId);
    if (player) {
      player.lives--;
    }
  }
  
  // Check if game should end
  shouldEndGame(): boolean {
    return this.getAlivePlayers().length <= 1;
  }
  
  // Create a team up proposal
  createTeamUp(proposerId: string, targetId: string): TeamUp {
    const teamUp: TeamUp = {
      proposerId,
      targetId,
      accepted: false,
      number: null
    };
    
    this.teamUps.push(teamUp);
    this.updateLastActivity();
    return teamUp;
  }
  
  // Get team up by players
  getTeamUp(player1Id: string, player2Id: string): TeamUp | undefined {
    return this.teamUps.find(
      t => (t.proposerId === player1Id && t.targetId === player2Id) || 
           (t.proposerId === player2Id && t.targetId === player1Id)
    );
  }
  
  // Accept a team up
  acceptTeamUp(proposerId: string, targetId: string): boolean {
    const teamUp = this.teamUps.find(
      t => t.proposerId === proposerId && t.targetId === targetId
    );
    
    if (teamUp) {
      teamUp.accepted = true;
      this.updateLastActivity();
      return true;
    }
    
    return false;
  }
  
  // Set team up number
  setTeamUpNumber(proposerId: string, targetId: string, number: number): boolean {
    const teamUp = this.teamUps.find(
      t => t.proposerId === proposerId && t.targetId === targetId
    );
    
    if (teamUp) {
      teamUp.number = number;
      this.updateLastActivity();
      return true;
    }
    
    return false;
  }

  // Update last activity timestamp
  private updateLastActivity(): void {
    this.lastActivityAt = Date.now();
  }

  // End game cleanup
  endGame(): void {
    this.updateLastActivity();
    removeGame(this.gameCode);
  }
}
