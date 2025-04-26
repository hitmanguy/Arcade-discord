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
    teamMate?: string; 
    combinedNumber?: number;  
    lastAction?: number; 
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
    private lastActionTime: { [key: string]: number } = {};
    private actionCooldown: number = 2000; 
    private ruleStack: string[] = [
      "If a player exactly hits the rounded off Regal's number, the loser penalty is doubled.",
      "If there are 2 people or more who choose the same number, the number they choose becomes invalid and the players who chose the same number will lose a point even if the number is closest to Regal's number.",
      "If the average of all numbers is prime, everyone loses 2 points except the player closest to the average.",
      "If any player's number matches their current score, they lose 3 points.",
      "If all numbers chosen are either even or odd, everyone loses 1 point."
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
        extraLives: 1 
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
      try {
        if (!this.validatePlayerAction(playerId)) {
          return false;
        }

        const player = this.players.find(p => p.id === playerId && !p.isEliminated);
        if (!player) return false;

        if (player.sanity < 30) {
          if (Math.random() < 0.3) {
            const variation = Math.floor(Math.random() * 20) - 10;
            number = Math.max(0, Math.min(100, number + variation));
          }
        }

        player.selectedNumber = number;
        player.hasSelected = true;
        return true;
      } catch (error) {
        console.error('Error in selectNumber:', error);
        return false;
      }
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
  
      const specialRuleApplied = this.applySpecialRules(choices, regalsNumber);
      
      if (!specialRuleApplied) {
        if (new Set(numbers).size !== numbers.length) {
          activePlayers.forEach(p => p.score--);
          message = 'some players chose the same number! Everyone loses a point.';
        } else {
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
  
          const winnerNames = closestPlayers.map(id => {
            const player = this.players.find(p => p.id === id);
            return player ? player.name : "Unknown";
          }).join(", ");
  
          message = `${winnerNames} wins the round!`;
          winners = closestPlayers;
        }
      } else {
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
        this.lastRuleMessage = '';
        this.lastRuleWinners = [];
        const activePlayers = this.getActivePlayers();

        const isPrime = (n: number): boolean => {
            if (n < 2) return false;
            for (let i = 2; i <= Math.sqrt(n); i++) {
                if (n % i === 0) return false;
            }
            return true;
        };

        for (let i = this.activeRules.length - 1; i >= 0; i--) {
            const rule = this.activeRules[i];

            if (rule.includes('same number')) {
                const freq: Record<number, string[]> = {};
                choices.forEach(c => { freq[c.number] = freq[c.number] || []; freq[c.number].push(c.id); });
                const duplicates = Object.entries(freq)
                    .filter(([, ids]) => ids.length > 1)
                    .map(([num, ids]) => ({ num: +num, ids }));
                if (duplicates.length) {
                    duplicates.forEach(d => d.ids.forEach(id => this.players.find(p => p.id === id)!.score--));
                    const invalids = duplicates.map(d => d.num).join(', ');
                    this.lastRuleMessage = `Invalid numbers (${invalids}) chosen: those players lose 1 point.`;
                    const validChoices = choices.filter(c => !duplicates.some(d => d.num === c.number));
                    if (validChoices.length) {
                        let best = validChoices[0]; let diff0 = Math.abs(best.number - regalsNumber);
                        validChoices.forEach(c => { const d = Math.abs(c.number - regalsNumber); if (d < diff0) { best = c; diff0 = d; }});
                        this.lastRuleWinners = [best.id];
                        this.lastRuleMessage += ` ${best.name} wins with ${best.number}.`;
                    }
                    return true;
                }
            }

            if (rule.includes('exactly hits')) {
                const exact = choices.find(c => Math.round(c.number) === Math.round(regalsNumber));
                if (exact) {
                    activePlayers.forEach(p => { if (p.id !== exact.id) p.score -= 2; });
                    this.lastRuleMessage = `${exact.name} hit it exactly! Others lose 2 points.`;
                    this.lastRuleWinners = [exact.id];
                    return true;
                }
            }

            if (rule.includes('chooses 0')) {
                const zero = choices.find(c => c.number === 0);
                const hundred = choices.find(c => c.number === 100);
                if (zero && hundred) {
                    this.players.find(p => p.id === zero.id)!.score--;
                    this.lastRuleMessage = `${hundred.name} beats 0 with 100!`;
                    this.lastRuleWinners = [hundred.id];
                    return true;
                }
            }

            if (rule.includes('average of all numbers is prime')) {
                const avg = regalsNumber;
                if (isPrime(avg)) {
                    let smallestDiff = Infinity;
                    let closest: { id: string } | null = null;
                    choices.forEach(c => {
                        const d = Math.abs(c.number - avg);
                        if (d < smallestDiff) { smallestDiff = d; closest = c; }
                    });
                    activePlayers.forEach(p => { if (p.id !== closest!.id) p.score -= 2; });
                    this.lastRuleMessage = `Average ${avg} is prime: others lose 2 points.`;
                    this.lastRuleWinners = [closest!.id];
                    return true;
                }
            }

            if (rule.includes('matches their current score')) {
                const matched = choices.filter(c => this.players.find(p => p.id === c.id)!.score === c.number);
                if (matched.length) {
                    matched.forEach(m => this.players.find(p => p.id === m.id)!.score -= 3);
                    const names = matched.map(m => m.name).join(', ');
                    this.lastRuleMessage = `${names} matched their score: -3 points each.`;
                    return true;
                }
            }

            if (rule.includes('even or odd')) {
                const allEven = choices.every(c => c.number % 2 === 0);
                const allOdd = choices.every(c => c.number % 2 !== 0);
                if (allEven || allOdd) {
                    activePlayers.forEach(p => p.score--);
                    this.lastRuleMessage = `All numbers were ${allEven ? 'even' : 'odd'}: everyone loses 1 point.`;
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
      if(this.getActivePlayers().length==2){
          this.activeRules.push("If a player chooses 0, the player who chooses 100 wins the round.");
          return "If a player chooses 0, the player who chooses 100 wins the round.";
      }else{
          const newRule = this.ruleStack.pop() as string;
          this.activeRules.push(newRule);
          return newRule;  
      }
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
      if (target.score <= this.eliminationScore) {
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
      try {
        return this.activeRules.length > 0 ? 
            this.activeRules[this.activeRules.length - 1] : 
            'No active rules.';
    } catch (error) {
        console.error('Error getting rules:', error);
        return 'Error retrieving rules.';
    }
    }

    // Error handling for player actions
    private validatePlayerAction(playerId: string): boolean {
      const now = Date.now();
      const lastAction = this.lastActionTime[playerId] || 0;
      
      if (now - lastAction < this.actionCooldown) {
          return false;
      }
      
      this.lastActionTime[playerId] = now;
      return true;
    }
  }
