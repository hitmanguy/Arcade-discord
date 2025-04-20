"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KingsOfDiamondsGame = void 0;
class KingsOfDiamondsGame {
    players = [];
    round = 0;
    phase = 1;
    eliminationScore = 0;
    hasStarted = false;
    ruleStack = [
        "If a player chooses 0, the player who chooses 100 wins the round.",
        "If a player exactly hits the rounded off Regal's number, the loser penalty is doubled.",
        "If there are 2 people or more who choose the same number, the number they choose becomes invalid and the players who chose the same number will lose a point even if the number is closest to Regal's number."
    ];
    activeRules = [];
    constructor() {
        this.players = [];
        this.round = 0;
        this.phase = 1;
    }
    addPlayer(player) {
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
    hasPlayer(playerId) {
        return this.players.some(p => p.id === playerId);
    }
    getPlayer(playerId) {
        return this.players.find(p => p.id === playerId);
    }
    getPlayers() {
        return [...this.players];
    }
    getActivePlayers() {
        return this.players.filter(p => !p.isEliminated);
    }
    getPlayerCount() {
        return this.players.length;
    }
    startGame() {
        this.hasStarted = true;
        this.round = 0;
    }
    startRound() {
        this.round++;
        this.players.forEach(player => {
            if (!player.isEliminated) {
                player.hasSelected = false;
                player.selectedNumber = null;
            }
        });
    }
    getRound() {
        return this.round;
    }
    selectNumber(playerId, number) {
        const player = this.players.find(p => p.id === playerId && !p.isEliminated);
        if (!player) {
            return false;
        }
        player.selectedNumber = number;
        player.hasSelected = true;
        return true;
    }
    allPlayersSelected() {
        return this.getActivePlayers().every(p => p.hasSelected);
    }
    assignRandomNumbers() {
        this.getActivePlayers().forEach(player => {
            if (!player.hasSelected) {
                player.selectedNumber = Math.floor(Math.random() * 101);
                player.hasSelected = true;
            }
        });
    }
    evaluateRound() {
        const activePlayers = this.getActivePlayers();
        if (!this.allPlayersSelected()) {
            return null;
        }
        const choices = activePlayers.map(p => ({
            id: p.id,
            name: p.name,
            number: p.selectedNumber
        }));
        const numbers = choices.map(c => c.number);
        const regalsNumber = this.computeRegalsNumber(numbers);
        let message = '';
        let winners = [];
        const specialRuleApplied = this.applySpecialRules(choices, regalsNumber);
        if (!specialRuleApplied) {
            if (new Set(numbers).size !== numbers.length) {
                activePlayers.forEach(p => p.score--);
                message = 'some players chose the same number! Everyone loses a point.';
            }
            else {
                let smallestDiff = Infinity;
                let closestPlayers = [];
                choices.forEach(choice => {
                    const diff = Math.abs(choice.number - regalsNumber);
                    if (diff < smallestDiff) {
                        smallestDiff = diff;
                        closestPlayers = [choice.id];
                    }
                    else if (diff === smallestDiff) {
                        closestPlayers.push(choice.id);
                    }
                });
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
        }
        else {
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
    lastRuleMessage = '';
    lastRuleWinners = [];
    applySpecialRules(choices, regalsNumber) {
        const activePlayers = this.getActivePlayers();
        this.lastRuleMessage = '';
        this.lastRuleWinners = [];
        for (let i = this.activeRules.length - 1; i >= 0; i--) {
            const rule = this.activeRules[i];
            if (rule.includes("same number, the number they choose becomes invalid")) {
                const numberFrequency = {};
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
                    duplicates.forEach(dup => {
                        dup.ids.forEach(id => {
                            const player = this.players.find(p => p.id === id);
                            if (player)
                                player.score--;
                        });
                    });
                    const duplicateNumbers = duplicates.map(d => d.number).join(', ');
                    this.lastRuleMessage = `Players chose the same numbers (${duplicateNumbers})! Those who selected duplicate numbers lose a point.`;
                    const nonDuplicatePlayers = choices.filter(choice => !duplicates.some(dup => dup.number === choice.number));
                    if (nonDuplicatePlayers.length > 0) {
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
            if (rule.includes("exactly hits the rounded off Regal's number")) {
                const exactMatch = choices.find(choice => Math.round(choice.number) === Math.round(regalsNumber));
                if (exactMatch) {
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
            if (rule.includes("chooses 0, the player who chooses 100 wins")) {
                const hasZero = choices.some(choice => choice.number === 0);
                const has100 = choices.find(choice => choice.number === 100);
                if (hasZero && has100) {
                    const zeroPlayer = choices.find(choice => choice.number === 0);
                    if (zeroPlayer) {
                        const player = this.players.find(p => p.id === zeroPlayer.id);
                        if (player)
                            player.score--;
                    }
                    this.lastRuleMessage = `${has100.name} chose 100 and someone chose 0! 100 beats 0 - ${has100.name} wins the round!`;
                    this.lastRuleWinners = [has100.id];
                    return true;
                }
            }
        }
        return false;
    }
    checkForEliminations() {
        const eliminated = this.players.filter(p => !p.isEliminated && p.score <= this.eliminationScore);
        eliminated.forEach(player => {
            player.isEliminated = true;
        });
        return eliminated;
    }
    shouldAddNewRule() {
        return this.ruleStack.length > 0 && this.getActivePlayers().length >= 2;
    }
    addNewRule() {
        if (this.ruleStack.length === 0) {
            return "No more rules to add.";
        }
        const newRule = this.ruleStack.pop();
        this.activeRules.push(newRule);
        return newRule;
    }
    isGameOver() {
        return this.getActivePlayers().length <= 1;
    }
    getWinner() {
        const activePlayers = this.getActivePlayers();
        return activePlayers.length === 1 ? activePlayers[0] : null;
    }
    computeRegalsNumber(choices) {
        return Math.round((choices.reduce((acc, cur) => acc + cur, 0) / choices.length) * 0.8 * 100) / 100;
    }
    reducePlayerLife(targetId) {
        const target = this.players.find(p => p.id === targetId);
        if (!target || target.extraLives <= 0)
            return false;
        target.score = target.score - 2;
        if (target.extraLives <= 0 && target.score <= this.eliminationScore) {
            target.isEliminated = true;
        }
        return true;
    }
    formTeam(playerId1, playerId2, combinedNumber) {
        if (this.phase !== 2)
            return false;
        const player1 = this.players.find(p => p.id === playerId1);
        const player2 = this.players.find(p => p.id === playerId2);
        if (!player1 || !player2 || player1.isEliminated || player2.isEliminated)
            return false;
        if (player1.teamMate || player2.teamMate)
            return false;
        player1.teamMate = player2.id;
        player2.teamMate = player1.id;
        player1.combinedNumber = combinedNumber;
        player2.combinedNumber = combinedNumber;
        return true;
    }
    evaluatePhaseTwo() {
        const activePlayers = this.getActivePlayers();
        const choices = [];
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
            }
            else if (!player.teamMate) {
                choices.push({
                    id: player.id,
                    name: player.name,
                    number: player.selectedNumber || 0
                });
            }
        }
        const numbers = choices.map(c => c.number);
        const regalsNumber = this.computeRegalsNumber(numbers);
        let smallestDiff = Infinity;
        let winners = [];
        choices.forEach(choice => {
            const diff = Math.abs(choice.number - regalsNumber);
            if (diff < smallestDiff) {
                smallestDiff = diff;
                winners = [choice.id];
            }
            else if (diff === smallestDiff) {
                winners.push(choice.id);
            }
        });
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
    advancePhase() {
        if (this.phase === 1 && this.getActivePlayers().length <= 4) {
            this.phase = 2;
            this.players.forEach(p => {
                p.teamMate = undefined;
                p.combinedNumber = undefined;
            });
        }
    }
    getPhase() {
        return this.phase;
    }
    getRules() {
        return this.activeRules[-1];
    }
}
exports.KingsOfDiamondsGame = KingsOfDiamondsGame;
//# sourceMappingURL=beauty_context_game.js.map