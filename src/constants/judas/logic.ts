import { JudasGameState, JudasPlayer } from './types';
import { SYSTEM_LIES } from './phrases';

export function assignSecrets(players: JudasPlayer[], secrets: string[], fakeSecret: string): { judasId: string, updatedPlayers: JudasPlayer[] } {
  const judasIndex = Math.floor(Math.random() * players.length);
  const judasId = players[judasIndex].id;
  const shuffledSecrets = [...secrets].sort(() => Math.random() - 0.5);

  let secretIdx = 0;
  const updatedPlayers = players.map((p, idx) => {
    if (idx === judasIndex) {
      return { ...p, secret: fakeSecret, revealed: false, sanity: 100, merit: 0, isAlive: true };
    }
    return { ...p, secret: shuffledSecrets[secretIdx++], revealed: false, sanity: 100, merit: 0, isAlive: true };
  });

  return { judasId, updatedPlayers };
}

export function getRandomSystemLie(players: JudasPlayer[]): string {
  const player = players[Math.floor(Math.random() * players.length)];
  const phrase = SYSTEM_LIES[Math.floor(Math.random() * SYSTEM_LIES.length)];
  return phrase.replace('{player}', `<@${player.id}>`);
}

export function getAlivePlayers(game: JudasGameState): JudasPlayer[] {
  return game.players.filter(p => p.isAlive);
}

export function getPlayer(game: JudasGameState, id: string): JudasPlayer | undefined {
  return game.players.find(p => p.id === id);
}