import { RegisterType, SlashCommand } from '../../../handler';
import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  Message,
  MessageCollector,
  TextChannel
} from 'discord.js';
import { createGame, joinGame, startGame, getActiveGames } from '../../../functions/numbers-game-lobby';
import { GameState } from '../../../functions/numbers-game-state';

export default new SlashCommand({
  registerType: RegisterType.Guild,
  data: new SlashCommandBuilder()
    .setName('numbers')
    .setDescription('Play the Numbers survival game')
    .addSubcommand(subcommand =>
      subcommand
        .setName('create')
        .setDescription('Create a new game lobby')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('join')
        .setDescription('Join an existing game lobby')
        .addStringOption(option =>
          option
            .setName('code')
            .setDescription('The game code to join')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('start')
        .setDescription('Start the game (host only)')
        .addStringOption(option =>
          option
            .setName('code')
            .setDescription('The game code to start')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List all active game lobbies')
    )as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();
    
    switch (subcommand) {
      case 'create':
        await handleCreateGame(interaction);
        break;
      case 'join':
        await handleJoinGame(interaction);
        break;
      case 'start':
        await handleStartGame(interaction);
        break;
      case 'list':
        await handleListGames(interaction);
        break;
    }
  }
});

async function handleCreateGame(interaction: ChatInputCommandInteraction) {
  const gameCode = createGame(interaction.user.id, interaction.channelId);
  
  const embed = new EmbedBuilder()
    .setTitle('🎮 Numbers Game Lobby Created')
    .setDescription(`Game code: **${gameCode}**`)
    .addFields(
      { name: 'Host', value: `<@${interaction.user.id}>` },
      { name: 'Players', value: '1/5' },
      { name: 'How to Join', value: `Type \`/numbers join code:${gameCode}\`` }
    )
    .setColor(0x00ff00)
    .setFooter({ text: 'The host can start the game with /numbers start' });
  
  await interaction.reply({ embeds: [embed] });
}

async function handleJoinGame(interaction: ChatInputCommandInteraction) {
  const gameCode = interaction.options.getString('code', true);
  const result = joinGame(gameCode, interaction.user.id);
  
  if (!result.success) {
    await interaction.reply({ 
      content: `❌ ${result.message}`, 
      ephemeral: true 
    });
    return;
  }
  
  const game = result.game!;
  const playerCount = game.players.length;
  
  const embed = new EmbedBuilder()
    .setTitle('🎮 Joined Numbers Game Lobby')
    .setDescription(`Game code: **${gameCode}**`)
    .addFields(
      { name: 'Host', value: `<@${game.hostId}>` },
      { name: 'Players', value: `${playerCount}/5` },
      { name: 'Players List', value: game.players.map(p => `<@${p.id}>`).join('\n') }
    )
    .setColor(0x00aa00);
  
  await interaction.reply({ embeds: [embed] });
}

async function handleStartGame(interaction: ChatInputCommandInteraction) {
  const gameCode = interaction.options.getString('code', true);
  const result = startGame(gameCode, interaction.user.id);
  
  if (!result.success) {
    await interaction.reply({ 
      content: `❌ ${result.message}`, 
      ephemeral: true 
    });
    return;
  }
  
  const game = result.game!;
  
  const embed = new EmbedBuilder()
    .setTitle('🎮 Numbers Game Starting')
    .setDescription(`The game is about to begin with ${game.players.length} players!`)
    .addFields(
      { name: 'Players', value: game.players.map(p => `<@${p.id}> (10 ❤️)`).join('\n') }
    )
    .setColor(0x0000ff);
  
  await interaction.reply({ embeds: [embed] });
  
  // Get the channel to send messages
  const channel = interaction.channel as TextChannel;
  if (!channel) return;
  
  // Start the game loop
  await startGameLoop(channel, game);
}

async function handleListGames(interaction: ChatInputCommandInteraction) {
  const games = getActiveGames();
  
  if (games.length === 0) {
    await interaction.reply({ 
      content: 'There are no active game lobbies. Create one with `/numbers create`!',
      ephemeral: true 
    });
    return;
  }
  
  const embed = new EmbedBuilder()
    .setTitle('🎮 Active Numbers Game Lobbies')
    .setDescription('Join a game with `/numbers join code:<CODE>`')
    .setColor(0x0099ff);
  
  games.forEach(game => {
    embed.addFields({
      name: `Game Code: ${game.gameCode}`,
      value: `Host: <@${game.hostId}>\nPlayers: ${game.players.length}/5\nStatus: ${game.gameStarted ? 'In Progress' : 'Waiting for players'}`
    });
  });
  
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function startGameLoop(channel: TextChannel, gameState: GameState) {
  const message = await channel.send('Game starting in 5 seconds...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Determine game phase based on player count
  while (gameState.getAlivePlayers().length > 1) {
    const alivePlayers = gameState.getAlivePlayers();
    
    if (alivePlayers.length >= 4) {
      // Phase 1: Standard rounds
      await gameState.runStandardPhase(channel);
    } else if (alivePlayers.length === 3) {
      // Phase 2: Betrayal phase
      await gameState.runBetrayalPhase(channel);
    } else if (alivePlayers.length === 2) {
      // Phase 3: Final duel
      await gameState.runFinalDuelPhase(channel);
    }
    
    // Check if game has ended
    if (gameState.getAlivePlayers().length <= 1) {
      break;
    }
    
    // Short break between rounds
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  // Announce winner
  const winner = gameState.getAlivePlayers()[0];
  
  const winEmbed = new EmbedBuilder()
    .setTitle('🏆 Game Over!')
    .setDescription(`<@${winner.id}> is the last player standing and wins the game!`)
    .setColor(0xFFD700);
  
  await channel.send({ embeds: [winEmbed] });
}
