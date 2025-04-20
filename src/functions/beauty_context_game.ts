// src/games/kingsOfDiamonds/KingsOfDiamondsGame.ts
export interface KingsOfDiamondsPlayer {
    id: string;
    name: string;
    score: number;
    sanity: number;
    hasSelected: boolean;
    selectedNumber: number | null;
    isEliminated: boolean;
    extraLives: number;
    teamMate?: string;  // ID of teammate in Phase 2
    combinedNumber?: number;  // Combined number for Phase 2
  }
  
  interface RoundResult {
    message: string;
    choices: { name: string; number: number }[];
    regalsNumber: number;
    winners: string[];
  }
  
  export class KingsOfDiamondsGame {
    private players: KingsOfDiamondsPlayer[] = [];
    private round: number = 0;
    private phase: number = 1;
    private eliminationScore: number = 0;
    private hasStarted: boolean = false;
    private ruleStack: string[] = [
      "If a player chooses 0, the player who chooses 100 wins the round.",
      "If a player exactly hits the rounded off Regal's number, the loser penalty is doubled.",
      "If there are 2 people or more who choose the same number, the number they choose becomes invalid and the players who chose the same number will lose a point even if the number is closest to Regal's number."
    ];
    private activeRules: string[] = [];
  
    constructor() {
      this.players = [];
      this.round = 0;
      this.phase = 1;
    }
  
    public addPlayer(player: { id: string; name: string; sanity: number }): boolean {
      if (this.hasStarted || this.players.length >= 8) {
        return false;
      }
  
      // Check if player already exists
      if (this.players.some(p => p.id === player.id)) {
        return false;
      }
  
      this.players.push({
        id: player.id,
        name: player.name,
        score: 10,
        sanity: player.sanity,
        hasSelected: false,
        selectedNumber: null,
        isEliminated: false,
        extraLives: 1 // Initialize with 10 lives
      });
  
      return true;
    }
  
    public hasPlayer(playerId: string): boolean {
      return this.players.some(p => p.id === playerId);
    }
  
    public getPlayer(playerId: string): KingsOfDiamondsPlayer | undefined {
      return this.players.find(p => p.id === playerId);
    }
  
    public getPlayers(): KingsOfDiamondsPlayer[] {
      return [...this.players];
    }
  
    public getActivePlayers(): KingsOfDiamondsPlayer[] {
      return this.players.filter(p => !p.isEliminated);
    }
  
    public getPlayerCount(): number {
      return this.players.length;
    }
  
    public startGame(): void {
      this.hasStarted = true;
      this.round = 0;
    }
  
    public startRound(): void {
      this.round++;
      
      // Reset player selections
      this.players.forEach(player => {
        if (!player.isEliminated) {
          player.hasSelected = false;
          player.selectedNumber = null;
        }
      });
    }
  
    public getRound(): number {
      return this.round;
    }
  
    public selectNumber(playerId: string, number: number): boolean {
      const player = this.players.find(p => p.id === playerId && !p.isEliminated);
      
      if (!player) {
        return false;
      }
  
      player.selectedNumber = number;
      player.hasSelected = true;
      return true;
    }
  
    public allPlayersSelected(): boolean {
      return this.getActivePlayers().every(p => p.hasSelected);
    }
  
    public assignRandomNumbers(): void {
      this.getActivePlayers().forEach(player => {
        if (!player.hasSelected) {
          player.selectedNumber = Math.floor(Math.random() * 101);
          player.hasSelected = true;
        }
      });
    }
  
    public evaluateRound(): RoundResult | null {
      const activePlayers = this.getActivePlayers();
      
      // Ensure all players have selected a number
      if (!this.allPlayersSelected()) {
        return null;
      }
  
      const choices = activePlayers.map(p => ({
        id: p.id,
        name: p.name,
        number: p.selectedNumber as number
      }));
  
      const numbers = choices.map(c => c.number);
      const regalsNumber = this.computeRegalsNumber(numbers);
      let message = '';
      let winners: string[] = [];
  
      // Try to apply special rules first
      const specialRuleApplied = this.applySpecialRules(choices, regalsNumber);
      
      if (!specialRuleApplied) {
        // Apply default rules
        // Case: All players chose the same number
        if (new Set(numbers).size !== numbers.length) {
          activePlayers.forEach(p => p.score--);
          message = 'some players chose the same number! Everyone loses a point.';
        } else {
          // Find the player(s) closest to Regal's number
          let smallestDiff = Infinity;
          let closestPlayers: string[] = [];
  
          choices.forEach(choice => {
            const diff = Math.abs(choice.number - regalsNumber);
            if (diff < smallestDiff) {
              smallestDiff = diff;
              closestPlayers = [choice.id];
            } else if (diff === smallestDiff) {
              closestPlayers.push(choice.id);
            }
          });
  
          // Assign scores
          activePlayers.forEach(player => {
            if (!closestPlayers.includes(player.id)) {
              player.score--;
            }
          });
  
          const winnerNames = closestPlayers.map(id => {
            const player = this.players.find(p => p.id === id);
            return player ? player.name : "Unknown";
          }).join(", ");
  
          message = `${winnerNames} wins the round!`;
          winners = closestPlayers;
        }
      } else {
        // A special rule was applied, message is set inside the method
        message = this.lastRuleMessage;
        winners = this.lastRuleWinners;
      }
  
      if (this.phase === 2) {
        return this.evaluatePhaseTwo();
      }
  
      return {
        message,
        choices: choices.map(c => ({ name: c.name, number: c.number })),
        regalsNumber,
        winners
      };
    }
  
    private lastRuleMessage: string = '';
    private lastRuleWinners: string[] = [];
  
    private applySpecialRules(choices: { id: string; name: string; number: number }[], regalsNumber: number): boolean {
      const activePlayers = this.getActivePlayers();
      this.lastRuleMessage = '';
      this.lastRuleWinners = [];
  
      // Apply active rules in reverse order (newest first)
      for (let i = this.activeRules.length - 1; i >= 0; i--) {
        const rule = this.activeRules[i];
  
        // Rule: If there are 2 people or more who choose the same number, that number becomes invalid
        if (rule.includes("same number, the number they choose becomes invalid")) {
          const numberFrequency: { [key: number]: string[] } = {};
          
          choices.forEach(choice => {
            if (!numberFrequency[choice.number]) {
              numberFrequency[choice.number] = [];
            }
            numberFrequency[choice.number].push(choice.id);
          });
  
          const duplicates = Object.entries(numberFrequency)
            .filter(([_, ids]) => ids.length > 1)
            .map(([number, ids]) => ({ number: parseInt(number), ids }));
  
          if (duplicates.length > 0) {
            // Players who chose duplicate numbers lose a point
            duplicates.forEach(dup => {
              dup.ids.forEach(id => {
                const player = this.players.find(p => p.id === id);
                if (player) player.score--;
              });
            });
  
            const duplicateNumbers = duplicates.map(d => d.number).join(', ');
            this.lastRuleMessage = `Players chose the same numbers (${duplicateNumbers})! Those who selected duplicate numbers lose a point.`;
            
            // Find winner among non-duplicate players
            const nonDuplicatePlayers = choices.filter(choice => 
              !duplicates.some(dup => dup.number === choice.number)
            );
  
            if (nonDuplicatePlayers.length > 0) {
              // Find player closest to Regal's number among non-duplicates
              let smallestDiff = Infinity;
              let winner = nonDuplicatePlayers[0];
  
              nonDuplicatePlayers.forEach(player => {
                const diff = Math.abs(player.number - regalsNumber);
                if (diff < smallestDiff) {
                  smallestDiff = diff;
                  winner = player;
                }
              });
  
              this.lastRuleWinners = [winner.id];
              this.lastRuleMessage += ` ${winner.name} wins with number ${winner.number}!`;
            }
  
            return true;
          }
        }
  
        // Rule: If a player exactly hits the Regal's number, loser penalty is doubled
        if (rule.includes("exactly hits the rounded off Regal's number")) {
          const exactMatch = choices.find(choice => 
            Math.round(choice.number) === Math.round(regalsNumber)
          );
  
          if (exactMatch) {
            // Double penalty for losers
            activePlayers.forEach(player => {
              if (player.id !== exactMatch.id) {
                player.score -= 2;
              }
            });
  
            this.lastRuleMessage = `${exactMatch.name} exactly hit the Regal's number! All other players lose 2 points.`;
            this.lastRuleWinners = [exactMatch.id];
            return true;
          }
        }
  
        // Rule: If someone chooses 0, the player who chooses 100 wins
        if (rule.includes("chooses 0, the player who chooses 100 wins")) {
          const hasZero = choices.some(choice => choice.number === 0);
          const has100 = choices.find(choice => choice.number === 100);
  
          if (hasZero && has100) {
            // Player who chose 0 loses a point
            const zeroPlayer = choices.find(choice => choice.number === 0);
            if (zeroPlayer) {
              const player = this.players.find(p => p.id === zeroPlayer.id);
              if (player) player.score--;
            }
  
            this.lastRuleMessage = `${has100.name} chose 100 and someone chose 0! 100 beats 0 - ${has100.name} wins the round!`;
            this.lastRuleWinners = [has100.id];
            return true;
          }
        }
      }
  
      return false;
    }
  
    public checkForEliminations(): KingsOfDiamondsPlayer[] {
      const eliminated = this.players.filter(
        p => !p.isEliminated && p.score <= this.eliminationScore
      );
      
      eliminated.forEach(player => {
        player.isEliminated = true;
      });
      
      return eliminated;
    }
  
    public shouldAddNewRule(): boolean {
      return this.ruleStack.length > 0 && this.getActivePlayers().length >= 2;
    }
  
    public addNewRule(): string {
      if (this.ruleStack.length === 0) {
        return "No more rules to add.";
      }
      
      const newRule = this.ruleStack.pop() as string;
      this.activeRules.push(newRule);
      return newRule;
    }
  
    public isGameOver(): boolean {
      return this.getActivePlayers().length <= 1;
    }
  
    public getWinner(): KingsOfDiamondsPlayer | null {
      const activePlayers = this.getActivePlayers();
      return activePlayers.length === 1 ? activePlayers[0] : null;
    }
  
    private computeRegalsNumber(choices: number[]): number {
      return Math.round((choices.reduce((acc, cur) => acc + cur, 0) / choices.length) * 0.8 * 100) / 100;
    }

    public reducePlayerLife(targetId: string): boolean {
      const target = this.players.find(p => p.id === targetId);
      if (!target || target.extraLives <= 0) return false;
      
      target.score=target.score-2;
      if (target.extraLives <= 0 && target.score <= this.eliminationScore) {
        target.isEliminated = true;
      }
      return true;
    }
  
    public formTeam(playerId1: string, playerId2: string, combinedNumber: number): boolean {
      if (this.phase !== 2) return false;
      
      const player1 = this.players.find(p => p.id === playerId1);
      const player2 = this.players.find(p => p.id === playerId2);
      
      if (!player1 || !player2 || player1.isEliminated || player2.isEliminated) return false;
      if (player1.teamMate || player2.teamMate) return false;
      
      player1.teamMate = player2.id;
      player2.teamMate = player1.id;
      player1.combinedNumber = combinedNumber;
      player2.combinedNumber = combinedNumber;
      
      return true;
    }

    private evaluatePhaseTwo(): RoundResult {
      const activePlayers = this.getActivePlayers();
      const choices: { id: string; name: string; number: number }[] = [];
      
      // Process teamed players first
      for (const player of activePlayers) {
        if (player.teamMate && player.combinedNumber !== undefined) {
          const teammate = this.players.find(p => p.id === player.teamMate);
          if (teammate && !choices.some(c => c.id === player.id)) {
            choices.push({
              id: player.id,
              name: `${player.name} & ${teammate.name}`,
              number: player.combinedNumber
            });
          }
        } else if (!player.teamMate) {
          choices.push({
            id: player.id,
            name: player.name,
            number: player.selectedNumber || 0
          });
        }
      }
  
      // Calculate results using the modified choices
      const numbers = choices.map(c => c.number);
      const regalsNumber = this.computeRegalsNumber(numbers);
      
      // Find winners and apply penalties
      let smallestDiff = Infinity;
      let winners: string[] = [];
      
      choices.forEach(choice => {
        const diff = Math.abs(choice.number - regalsNumber);
        if (diff < smallestDiff) {
          smallestDiff = diff;
          winners = [choice.id];
        } else if (diff === smallestDiff) {
          winners.push(choice.id);
        }
      });
  
      // Apply score changes
      activePlayers.forEach(player => {
        if (!winners.includes(player.id) && !winners.includes(player.teamMate || '')) {
          player.score--;
        }
      });
  
      return {
        message: `Phase 2 Round Results - Team victory: ${winners.map(id => {
          const player = this.players.find(p => p.id === id);
          return player ? (player.teamMate ? 
            `${player.name} & ${this.players.find(p => p.id === player.teamMate)?.name}` : 
            player.name) : 'Unknown';
        }).join(', ')}`,
        choices: choices.map(c => ({ name: c.name, number: c.number })),
        regalsNumber,
        winners
      };
    }
  
    public advancePhase(): void {
      if (this.phase === 1 && this.getActivePlayers().length <= 4) {
        this.phase = 2;
        // Reset teams
        this.players.forEach(p => {
          p.teamMate = undefined;
          p.combinedNumber = undefined;
        });
      }
    }
  
    public getPhase(): number {
      return this.phase;
    }
    public getRules(): string{
      return this.activeRules[-1];
    }
  }