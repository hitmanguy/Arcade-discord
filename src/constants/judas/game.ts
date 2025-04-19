import { JudasGameState, JudasPlayer } from './types';
import { assignSecrets, getRandomSystemLie, getAlivePlayers, getPlayer } from './logic';
import { TextChannel, User, Client, Message, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';

const games = new Map<string, JudasGameState>();

export function getGame(channelId: string) {
  return games.get(channelId);
}

export function createGame(channelId: string, hostId: string, playerList: { id: string, username: string }[], secrets: string[], fakeSecret: string): JudasGameState {
  const players: JudasPlayer[] = playerList.map(p => ({
    ...p,
    secret: '',
    revealed: false,
    sanity: 100,
    merit: 0,
    isAlive: true,
  }));

  const { judasId, updatedPlayers } = assignSecrets(players, secrets, fakeSecret);

  const game: JudasGameState = {
    channelId,
    hostId,
    phase: 1,
    players: updatedPlayers,
    judasId,
    secrets,
    fakeSecret,
    started: false,
    votes: {},
    accusations: {},
    eliminated: [],
  };
  games.set(channelId, game);
  return game;
}

export function endGame(channelId: string) {
  games.delete(channelId);
}