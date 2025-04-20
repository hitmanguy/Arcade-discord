import { 
  TextChannel, 
  EmbedBuilder, 
  Message,
  MessageCollector,
  Client,
  Interaction,
  InteractionType,
  User as DiscordUser
} from 'discord.js';
import { removeGame } from './numbers-game-lobby';
import { runStandardRound } from './numbers-game-standard-phase';
import { runBetrayalRound } from './numbers-game-betrayal-phase';
import { runFinalDuelRound } from './numbers-game-final-duel';
import { User } from '../model/user_status';
import { SANITY_EFFECTS, STORYLINE, PRISON_COLORS } from '../constants/GAME_CONSTANTS';

// Player type definition
export interface Player {
  id: string;
  username: string;
  lives: number;
  currentNumber: number | null;
  teamUpWith: string | null;  // ID of player they want to team up with
  teamUpOffer: string | null; // ID of player who offered to team up
  sanityLevel?: number; // Track individual player sanity
  lastAction?: number; // Timestamp of last action for timeout effects
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
  private visualDistortions = new Map<number, (text: string) => string>([
    [80, (text) => text],
    [60, (text) => text.split('').join('̴') + '...'],
    [40, (text) => text.split('').join('̷')],
    [20, (text) => text.split('').reverse().join('̸') + '?̸'],
    [0, (text) => text.split('').sort(() => Math.random() - 0.5).join('̵̢') + '!̵̢']
  ]);
  
  private sanityEffects = new Map<string, {
    distortedVision: boolean,
    paranoiaLevel: number,
    lastInteraction: number
  }>();

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
  async resetRound(): Promise<void> {
    this.currentRound++;
    
    // Update player sanity levels
    for (const player of this.players) {
      const user = await User.findOne({ discordId: player.id });
      if (user) {
        player.sanityLevel = user.sanity;
      }
    }
    
    this.players.forEach(player => {
      player.currentNumber = null;
      player.teamUpWith = null;
      player.teamUpOffer = null;
      player.lastAction = Date.now();
    });
    
    this.teamUps = [];
    this.updateLastActivity();
  }
  
  // Calculate average with sanity effects
  calculateAverage(): number | null {
    const alivePlayers = this.getAlivePlayers();
    const validNumbers = alivePlayers
      .filter(player => player.currentNumber !== null)
      .map(player => {
        // Apply subtle number distortion for low sanity players
        if (player.sanityLevel && player.sanityLevel < 40 && Math.random() < 0.2) {
          const distortion = Math.floor(Math.random() * 5) - 2; // -2 to +2
          return Math.max(1, Math.min(100, player.currentNumber! + distortion));
        }
        return player.currentNumber!;
      });
    
    if (validNumbers.length === 0) return null;
    
    const sum = validNumbers.reduce((a, b) => a + b, 0);
    return sum / validNumbers.length;
  }
  
  // Find unique numbers with sanity-based validation
  getUniqueNumbers(): Map<number, Player[]> {
    const numberMap = new Map<number, Player[]>();
    
    this.getAlivePlayers().forEach(player => {
      if (player.currentNumber === null) return;
      
      // Apply sanity effects to number recognition
      let effectiveNumber = player.currentNumber;
      if (player.sanityLevel && player.sanityLevel < 30 && Math.random() < 0.15) {
        // Sometimes perceive numbers differently at low sanity
        effectiveNumber = Math.max(1, Math.min(100, effectiveNumber + (Math.random() < 0.5 ? 1 : -1)));
      }
      
      if (!numberMap.has(effectiveNumber)) {
        numberMap.set(effectiveNumber, []);
      }
      
      numberMap.get(effectiveNumber)!.push(player);
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
  
  // Reduce a player's life with sanity effects
  async reduceLife(playerId: string): Promise<void> {
    const player = this.players.find(p => p.id === playerId);
    if (player) {
      player.lives--;
      
      // Update player sanity on life loss
      const user = await User.findOne({ discordId: playerId });
      if (user) {
        const sanityLoss = Math.floor(Math.random() * 3) + 2; // 2-4 sanity loss on life reduction
        user.sanity = Math.max(0, user.sanity - sanityLoss);
        await user.save();
        player.sanityLevel = user.sanity;
      }
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
  
  // Accept a team up with sanity validation
  async acceptTeamUp(proposerId: string, targetId: string): Promise<boolean> {
    const teamUp = this.teamUps.find(
      t => t.proposerId === proposerId && t.targetId === targetId
    );
    
    if (teamUp) {
      teamUp.accepted = true;
      
      // Check for paranoia effects
      const target = this.players.find(p => p.id === targetId);
      if (target && target.sanityLevel && target.sanityLevel < 30) {
        // Small chance of automatic betrayal for very low sanity
        if (Math.random() < 0.2) {
          const user = await User.findOne({ discordId: targetId });
          if (user) {
            user.sanity = Math.max(0, user.sanity - 2); // Further sanity loss from paranoia
            await user.save();
            target.sanityLevel = user.sanity;
          }
        }
      }
      
      this.updateLastActivity();
      return true;
    }
    
    return false;
  }
  
  // Set team up number with trust mechanics
  async setTeamUpNumber(proposerId: string, targetId: string, number: number): Promise<boolean> {
    const teamUp = this.teamUps.find(
      t => t.proposerId === proposerId && t.targetId === targetId
    );
    
    if (teamUp) {
      teamUp.number = number;
      
      // Trust/paranoia mechanics
      const proposer = this.players.find(p => p.id === proposerId);
      const target = this.players.find(p => p.id === targetId);
      
      if (proposer && target) {
        // Check for betrayal attempt
        const isBetrayal = Math.abs((proposer.currentNumber || 0) - (target.currentNumber || 0)) > 10;
        
        if (isBetrayal) {
          // Update sanity for both players
          const users = await Promise.all([
            User.findOne({ discordId: proposerId }),
            User.findOne({ discordId: targetId })
          ]);
          
          if (users[0] && users[1]) {
            // Betrayer loses some sanity from guilt
            users[0].sanity = Math.max(0, users[0].sanity - 3);
            // Betrayed loses more sanity from trust issues
            users[1].sanity = Math.max(0, users[1].sanity - 5);
            
            await Promise.all([users[0].save(), users[1].save()]);
            
            proposer.sanityLevel = users[0].sanity;
            target.sanityLevel = users[1].sanity;
          }
        }
      }
      
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
  async endGame(): Promise<void> {
    // Final sanity adjustments based on game outcome
    for (const player of this.players) {
      const user = await User.findOne({ discordId: player.id });
      if (user) {
        // Winners regain some sanity
        if (player.lives > 0) {
          user.sanity = Math.min(100, user.sanity + 5);
        }
        // Last eliminated player loses extra sanity
        else if (player.lives === 0 && this.currentRound > 1) {
          user.sanity = Math.max(0, user.sanity - 3);
        }
        await user.save();
      }
    }
    
    this.updateLastActivity();
    removeGame(this.gameCode);
  }

  // Apply visual distortion based on sanity
  applyVisualDistortion(text: string, sanityLevel: number): string {
    if (sanityLevel >= 50) return text;
    
    const glitches = ['̷', '̶', '̸', '̵', '̴'];
    const intensity = Math.min(0.3, (50 - sanityLevel) / 100);
    
    return text.split('').map(char => 
      Math.random() < intensity ? char + glitches[Math.floor(Math.random() * glitches.length)] : char
    ).join('');
  }

  public async initializeGame(participants: DiscordUser[]): Promise<void> {
    this.gameStarted = true;
    this.currentRound = 0;
    this.players = [];
    this.teamUps = [];

    for (const user of participants) {
      const playerData = await User.findOne({ discordId: user.id });
      if (playerData) {
        this.players.push({
          id: user.id,
          username: user.username,
          lives: 3,
          currentNumber: null,
          teamUpWith: null,
          teamUpOffer: null
        });
      }
    }
  }

  public async getSanityEffect(playerId: string): Promise<string> {
    const userData = await User.findOne({ discordId: playerId });
    if (!userData) return '';

    const sanityEffects = new Map<number, string[]>([
      [80, ['The shadows seem to move...', 'A whisper in the distance...']],
      [60, ['The walls are breathing...', 'Numbers flash in your peripheral vision...']],
      [40, ['Reality begins to fracture...', 'The void calls your name...']],
      [20, ['S̷a̷n̷i̷t̷y̷ ̷s̷l̷i̷p̷s̷ ̷a̷w̷a̷y̷.̷.̷.', 'T̷h̷e̷ ̷v̷o̷i̷d̷ ̷b̷e̷c̷k̷o̷n̷s̷.̷.̷.']],
      [0, ['T̵H̵E̵ ̵V̵O̵I̵D̵ ̵C̵O̵N̵S̵U̵M̵E̵S̵', 'R̵E̵A̵L̵I̵T̵Y̵ ̵U̵N̵R̵A̵V̵E̵L̵S̵']]
    ]);

    const threshold = Math.floor(userData.sanity / 20) * 20;
    const effects = sanityEffects.get(threshold) || sanityEffects.get(0)!;
    return effects[Math.floor(Math.random() * effects.length)];
  }

  public isGameActive(): boolean {
    return this.gameStarted;
  }

  public getRound(): number {
    return this.currentRound;
  }

  public updateSanity(playerId: string, deltaChange: number): void {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return;
    
    player.sanityLevel = Math.max(0, Math.min(100, (player.sanityLevel ?? 100) + deltaChange));
    
    // Update psychological effects
    if (player.sanityLevel < 40) {
        this.sanityEffects.set(playerId, {
            distortedVision: true,
            paranoiaLevel: Math.floor((40 - player.sanityLevel) / 10),
            lastInteraction: Date.now()
        });
    }
  }

  public getSanityEffects(playerId: string) {
    return this.sanityEffects.get(playerId) || {
        distortedVision: false,
        paranoiaLevel: 0,
        lastInteraction: Date.now()
    };
  }
}
