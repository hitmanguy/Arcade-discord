// Main command entry point
import { RegisterType, SlashCommand } from '../../../handler';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ButtonInteraction,
  Collection,
  Snowflake,
  ChannelType,
  type ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
  MessageComponentInteraction,
  TextInputBuilder,
  TextInputStyle,
  ComponentType,
  MessageFlags,
} from 'discord.js';

// Game state management
interface GameState {
  status: 'waiting' | 'starting' | 'playing' | 'ended';
  phase: 1 | 2 | 3;
  players: Map<string, Player>;
  host: string;
  round: number;
  numbersSubmitted: Map<string, number>;
  alliances: Map<string, string>;
  proposedAlliances: Map<string, string>;
  channelId: string;
  lastMessageId?: string;
  timer?: NodeJS.Timeout;
  roundEndTime?: number;
}

interface Player {
  id: string;
  username: string;
  lives: number;
  active: boolean;
}

// Global games storage
const activeGames = new Map<string, GameState>();

// Helper functions
function calculateAverage(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const sum = numbers.reduce((acc, num) => acc + num, 0);
  return sum / numbers.length;
}

function findClosestUniqueNumber(numbers: Map<string, number>, average: number): string | null {
  // Convert map to array of [userId, number] pairs
  const entries = Array.from(numbers.entries());
  
  // Count occurrences of each number
  const numberCounts = new Map<number, number>();
  entries.forEach(([_, num]) => {
    numberCounts.set(num, (numberCounts.get(num) || 0) + 1);
  });
  
  // Filter to only unique numbers
  const uniqueEntries = entries.filter(([_, num]) => numberCounts.get(num) === 1);
  
  if (uniqueEntries.length === 0) return null;
  
  // Find closest to average
  let closest = uniqueEntries[0];
  let minDiff = Math.abs(closest[1] - average);
  
  for (let i = 1; i < uniqueEntries.length; i++) {
    const diff = Math.abs(uniqueEntries[i][1] - average);
    if (diff < minDiff) {
      minDiff = diff;
      closest = uniqueEntries[i];
    }
  }
  
  return closest[0];
}

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

// Main command definition
export default new SlashCommand({
  registerType: RegisterType.Guild,

  data: new SlashCommandBuilder()
    .setName('borderland')
    .setDescription('Play a multiplayer game inspired by Alice in Borderland')
    .addSubcommand(subcommand =>
      subcommand
        .setName('create')
        .setDescription('Create a new game session')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('join')
        .setDescription('Join an existing game session')
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
        .setDescription('Start a game you created')
        .addStringOption(option =>
          option
            .setName('code')
            .setDescription('The game code to start')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('info')
        .setDescription('View information about an active game')
        .addStringOption(option =>
          option
            .setName('code')
            .setDescription('The game code to view')
            .setRequired(true)
        )
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'create') {
      await handleCreateGame(interaction);
    } else if (subcommand === 'join') {
      await handleJoinGame(interaction);
    } else if (subcommand === 'start') {
      await handleStartGame(interaction);
    } else if (subcommand === 'info') {
      await handleGameInfo(interaction);
    }
  },
});

// Game creation handler
async function handleCreateGame(interaction: ChatInputCommandInteraction): Promise<void> {
  // Generate a unique game code
  const gameCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  // Create a new game state
  const gameState: GameState = {
    status: 'waiting',
    phase: 1,
    players: new Map(),
    host: interaction.user.id,
    round: 0,
    numbersSubmitted: new Map(),
    alliances: new Map(),
    proposedAlliances: new Map(),
    channelId: interaction.channelId,
  };
  
  // Add the host as the first player
  gameState.players.set(interaction.user.id, {
    id: interaction.user.id,
    username: interaction.user.username,
    lives: 10,
    active: true,
  });
  
  // Store the game
  activeGames.set(gameCode, gameState);
  
  // Create an embed with game information
  const embed = new EmbedBuilder()
    .setTitle('🎮 Borderland Game Created')
    .setDescription(`A new game has been created!\n\nTo join, use: \`/borderland join code:${gameCode}\``)
    .addFields(
      { name: 'Host', value: `<@${interaction.user.id}>`, inline: true },
      { name: 'Players', value: '1/5', inline: true },
      { name: 'Status', value: 'Waiting for players', inline: true },
      { name: 'Game Code', value: gameCode, inline: false }
    )
    .setColor('#2b2d31')
    .setFooter({ text: 'The host can start the game once at least 3 players have joined' });
  
  // Create buttons for managing the game
  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`borderland:start:${gameCode}`)
        .setLabel('Start Game')
        .setStyle(ButtonStyle.Success)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId(`borderland:join:${gameCode}`)
        .setLabel('Join Game')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`borderland:rules:${gameCode}`)
        .setLabel('View Rules')
        .setStyle(ButtonStyle.Secondary)
    );
  
  await interaction.reply({ embeds: [embed], components: [row] });
  
  // Update the last message ID in the game state
  const replyMessage = await interaction.fetchReply();
  gameState.lastMessageId = replyMessage.id;
}

// Join game handler
async function handleJoinGame(interaction: ChatInputCommandInteraction): Promise<void> {
  const gameCode = interaction.options.getString('code', true).toUpperCase();
  const gameState = activeGames.get(gameCode);
  
  if (!gameState) {
    await interaction.reply({
      content: '❌ Game not found with that code. Please check and try again.',
      ephemeral: true
    });
    return;
  }
  
  if (gameState.status !== 'waiting') {
    await interaction.reply({
      content: '❌ This game has already started. You cannot join it now.',
      ephemeral: true
    });
    return;
  }
  
  if (gameState.players.has(interaction.user.id)) {
    await interaction.reply({
      content: '❌ You are already in this game.',
      ephemeral: true
    });
    return;
  }
  
  if (gameState.players.size >= 5) {
    await interaction.reply({
      content: '❌ This game is full (5/5 players).',
      ephemeral: true
    });
    return;
  }
  
  // Add the player to the game
  gameState.players.set(interaction.user.id, {
    id: interaction.user.id,
    username: interaction.user.username,
    lives: 10,
    active: true,
  });
  
  // Update the game status message
  await updateGameStatusMessage(interaction.client, gameState, gameCode);
  
  // Notify the player that they've joined
  await interaction.reply({
    content: `✅ You have joined the game! (Code: ${gameCode})\nThere are now ${gameState.players.size} players in the game.`,
    ephemeral: true
  });
}

// Start game handler
async function handleStartGame(interaction: ChatInputCommandInteraction): Promise<void> {
  const gameCode = interaction.options.getString('code', true).toUpperCase();
  const gameState = activeGames.get(gameCode);
  
  if (!gameState) {
    await interaction.reply({
      content: '❌ Game not found with that code. Please check and try again.',
      ephemeral: true
    });
    return;
  }
  
  if (gameState.host !== interaction.user.id) {
    await interaction.reply({
      content: '❌ Only the host can start the game.',
      ephemeral: true
    });
    return;
  }
  
  if (gameState.status !== 'waiting') {
    await interaction.reply({
      content: '❌ This game has already started.',
      ephemeral: true
    });
    return;
  }
  
  if (gameState.players.size < 3) {
    await interaction.reply({
      content: '❌ You need at least 3 players to start the game.',
      ephemeral: true
    });
    return;
  }
  
  // Update game state
  gameState.status = 'starting';
  
  // Notify all players that the game is starting
  const channel = interaction.client.channels.cache.get(gameState.channelId);
  if (channel?.type === ChannelType.GuildText) {
    await channel.send({
      content: `🎮 Game (Code: ${gameCode}) is starting with ${gameState.players.size} players!\n${Array.from(gameState.players.values()).map(p => `<@${p.id}>`).join(', ')}\n\nGet ready for Phase 1!`,
    });
  }
  
  // Start the first round after a brief delay
  setTimeout(() => {
    gameState.status = 'playing';
    startNewRound(interaction.client, gameState, gameCode);
  }, 5000);
  
  await interaction.reply({
    content: '✅ The game has been started!',
    ephemeral: true
  });
}

// Game info handler
async function handleGameInfo(interaction: ChatInputCommandInteraction): Promise<void> {
  const gameCode = interaction.options.getString('code', true).toUpperCase();
  const gameState = activeGames.get(gameCode);
  
  if (!gameState) {
    await interaction.reply({
      content: '❌ Game not found with that code. Please check and try again.',
      ephemeral: true
    });
    return;
  }
  
  // Create an embed with game information
  const embed = new EmbedBuilder()
    .setTitle(`🎮 Borderland Game Info (${gameCode})`)
    .addFields(
      { name: 'Status', value: gameState.status, inline: true },
      { name: 'Phase', value: `Phase ${gameState.phase}`, inline: true },
      { name: 'Round', value: gameState.round.toString(), inline: true },
      { name: 'Host', value: `<@${gameState.host}>`, inline: true },
      { name: 'Channel', value: `<#${gameState.channelId}>`, inline: true },
      { name: 'Players', value: `${gameState.players.size}`, inline: true },
    )
    .setColor('#2b2d31');
  
  // Add player information
  const playersInfo = Array.from(gameState.players.values())
    .map(player => `<@${player.id}> - ${player.lives} lives ${player.active ? '🟢' : '🔴'}`)
    .join('\n');
  
  embed.addFields({ name: 'Player Status', value: playersInfo || 'No players', inline: false });
  
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

// Helper function to update the game status message
async function updateGameStatusMessage(client: any, gameState: GameState, gameCode: string): Promise<void> {
  if (!gameState.lastMessageId || !gameState.channelId) return;
  
  const channel = client.channels.cache.get(gameState.channelId);
  if (!channel || channel.type !== ChannelType.GuildText) return;
  
  try {
    const message = await channel.messages.fetch(gameState.lastMessageId);
    if (!message) return;
    
    const embed = new EmbedBuilder()
      .setTitle('🎮 Borderland Game Created')
      .setDescription(`A new game has been created!\n\nTo join, use: \`/borderland join code:${gameCode}\``)
      .addFields(
        { name: 'Host', value: `<@${gameState.host}>`, inline: true },
        { name: 'Players', value: `${gameState.players.size}/5`, inline: true },
        { name: 'Status', value: 'Waiting for players', inline: true },
        { name: 'Game Code', value: gameCode, inline: false }
      )
      .setColor('#2b2d31')
      .setFooter({ text: 'The host can start the game once at least 3 players have joined' });
    
    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`borderland:start:${gameCode}`)
          .setLabel('Start Game')
          .setStyle(ButtonStyle.Success)
          .setDisabled(gameState.players.size < 3),
        new ButtonBuilder()
          .setCustomId(`borderland:join:${gameCode}`)
          .setLabel('Join Game')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(gameState.players.size >= 5),
        new ButtonBuilder()
          .setCustomId(`borderland:rules:${gameCode}`)
          .setLabel('View Rules')
          .setStyle(ButtonStyle.Secondary)
      );
    
    await message.edit({ embeds: [embed], components: [row] });
  } catch (error) {
    console.error('Failed to update game status message:', error);
  }
}



// Game round logic
async function startNewRound(client: any, gameState: GameState, gameCode: string): Promise<void> {
    // Increment round counter
    gameState.round++;
    
    // Clear previous round data
    gameState.numbersSubmitted.clear();
    
    // Check if game should end or change phase
    const activePlayers = Array.from(gameState.players.values()).filter(p => p.active);
    
    if (activePlayers.length <= 1) {
      return endGame(client, gameState, gameCode);
    }
    
    // Determine game phase based on number of active players
    if (activePlayers.length <= 2) {
      gameState.phase = 3;
    } else if (activePlayers.length <= 3) {
      gameState.phase = 2;
    } else {
      gameState.phase = 1;
    }
    
    const channel = client.channels.cache.get(gameState.channelId);
    if (!channel || channel.type !== ChannelType.GuildText) return;
    
    // Create round message based on phase
    if (gameState.phase === 1) {
      await handlePhase1Round(client, channel, gameState, gameCode);
    } else if (gameState.phase === 2) {
      await handlePhase2Round(client, channel, gameState, gameCode);
    } else {
      await handlePhase3Round(client, channel, gameState, gameCode);
    }
  }
  
  // Phase 1 round handler
  async function handlePhase1Round(client: any, channel: any, gameState: GameState, gameCode: string): Promise<void> {
    const activePlayers = Array.from(gameState.players.values()).filter(p => p.active);
    
    // Create round announcement
    const embed = new EmbedBuilder()
      .setTitle(`🎮 Round ${gameState.round} - Phase 1`)
      .setDescription(`Choose a number between 1 and 100. The player with the unique number closest to the average wins!\n\n**Rules:**\n- Closest unique number to the average wins\n- Winner chooses who loses a life\n- Duplicate numbers are invalid`)
      .addFields(
        { name: 'Time Remaining', value: '60 seconds', inline: true },
        { name: 'Players', value: `${activePlayers.length} active`, inline: true }
      )
      .setColor('#FFA500')
      .setFooter({ text: `Game Code: ${gameCode}` });
    
    const message = await channel.send({ embeds: [embed], content: activePlayers.map(p => `<@${p.id}>`).join(' ') });
    
    // Send DMs to each active player asking for their choice
    for (const player of activePlayers) {
      try {
        const user = await client.users.fetch(player.id);
        
        const row = new ActionRowBuilder<ButtonBuilder>();
        for (let i = 1; i <= 10; i++) {
          row.addComponents(
            new ButtonBuilder()
              .setCustomId(`borderland:number:${gameCode}:${(i * 10) - 9}-${i * 10}`)
              .setLabel(`${(i * 10) - 9}-${i * 10}`)
              .setStyle(ButtonStyle.Secondary)
          );
        }
        
        await user.send({
          content: `🎮 **Round ${gameState.round} - Choose a number**\nPick a range first, then you'll select a specific number.`,
          components: [row]
        });
      } catch (error) {
        console.error(`Failed to send DM to player ${player.id}:`, error);
        // Mark player as inactive if we can't DM them
        player.active = false;
      }
    }
    
    // Set a timer for the round
    const roundDuration = 60000; // 60 seconds
    gameState.roundEndTime = Date.now() + roundDuration;
    
    // Update the time remaining every 10 seconds
    const updateInterval = setInterval(async () => {
      const timeRemaining = Math.max(0, Math.floor((gameState.roundEndTime! - Date.now()) / 1000));
      
      if (timeRemaining <= 0) {
        clearInterval(updateInterval);
        return;
      }
      
      const updatedEmbed = new EmbedBuilder()
        .setTitle(`🎮 Round ${gameState.round} - Phase 1`)
        .setDescription(`Choose a number between 1 and 100. The player with the unique number closest to the average wins!\n\n**Rules:**\n- Closest unique number to the average wins\n- Winner chooses who loses a life\n- Duplicate numbers are invalid`)
        .addFields(
          { name: 'Time Remaining', value: `${timeRemaining} seconds`, inline: true },
          { name: 'Players', value: `${activePlayers.length} active`, inline: true },
          { name: 'Submitted', value: `${gameState.numbersSubmitted.size}/${activePlayers.length}`, inline: true }
        )
        .setColor('#FFA500')
        .setFooter({ text: `Game Code: ${gameCode}` });
      
      await message.edit({ embeds: [updatedEmbed] });
    }, 10000);
    
    // Set timeout for the round end
    gameState.timer = setTimeout(() => {
      clearInterval(updateInterval);
      endRound(client, gameState, gameCode);
    }, roundDuration);
  }
  
  // Phase 2 round handler
  async function handlePhase2Round(client: any, channel: any, gameState: GameState, gameCode: string): Promise<void> {
    const activePlayers = Array.from(gameState.players.values()).filter(p => p.active);
    
    // Clear any existing alliances from previous rounds
    gameState.alliances.clear();
    gameState.proposedAlliances.clear();
    
    // Create round announcement
    const embed = new EmbedBuilder()
      .setTitle(`🎮 Round ${gameState.round} - Phase 2: Betrayal Phase`)
      .setDescription(`The game has entered Phase 2! You can now form alliances or play solo.\n\n**Rules:**\n- Solo: Choose a number 1-100, closest unique to average wins\n- Team-Up: Form an alliance with another player and choose the same number\n- Betrayal: Agree to team up but choose a different number to potentially win solo\n\nCheck your DMs to make your choice!`)
      .addFields(
        { name: 'Time Remaining', value: '90 seconds', inline: true },
        { name: 'Players', value: `${activePlayers.length} active`, inline: true }
      )
      .setColor('#FF0000')
      .setFooter({ text: `Game Code: ${gameCode}` });
    
    const message = await channel.send({ embeds: [embed], content: activePlayers.map(p => `<@${p.id}>`).join(' ') });
    
    // Send DMs to each active player asking for their strategy
    for (const player of activePlayers) {
      try {
        const user = await client.users.fetch(player.id);
        
        const otherPlayers = activePlayers.filter(p => p.id !== player.id);
        
        const row = new ActionRowBuilder<ButtonBuilder>()
          .addComponents(
            new ButtonBuilder()
              .setCustomId(`borderland:strategy:${gameCode}:solo`)
              .setLabel('Play Solo')
              .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
              .setCustomId(`borderland:strategy:${gameCode}:team`)
              .setLabel('Propose Alliance')
              .setStyle(ButtonStyle.Success)
          );
        
        await user.send({
          content: `🎮 **Round ${gameState.round} - Phase 2**\nWill you play solo or try to form an alliance?`,
          components: [row]
        });
      } catch (error) {
        console.error(`Failed to send DM to player ${player.id}:`, error);
        // Mark player as inactive if we can't DM them
        player.active = false;
      }
    }
    
    // Set a timer for the round
    const roundDuration = 90000; // 90 seconds
    gameState.roundEndTime = Date.now() + roundDuration;
    
    // Update the time remaining every 15 seconds
    const updateInterval = setInterval(async () => {
      const timeRemaining = Math.max(0, Math.floor((gameState.roundEndTime! - Date.now()) / 1000));
      
      if (timeRemaining <= 0) {
        clearInterval(updateInterval);
        return;
      }
      
      const updatedEmbed = new EmbedBuilder()
        .setTitle(`🎮 Round ${gameState.round} - Phase 2: Betrayal Phase`)
        .setDescription(`The game has entered Phase 2! You can now form alliances or play solo.\n\n**Rules:**\n- Solo: Choose a number 1-100, closest unique to average wins\n- Team-Up: Form an alliance with another player and choose the same number\n- Betrayal: Agree to team up but choose a different number to potentially win solo`)
        .addFields(
          { name: 'Time Remaining', value: `${timeRemaining} seconds`, inline: true },
          { name: 'Players', value: `${activePlayers.length} active`, inline: true },
          { name: 'Submitted', value: `${gameState.numbersSubmitted.size}/${activePlayers.length}`, inline: true }
        )
        .setColor('#FF0000')
        .setFooter({ text: `Game Code: ${gameCode}` });
      
      await message.edit({ embeds: [updatedEmbed] });
    }, 15000);
    
    // Set timeout for the round end
    gameState.timer = setTimeout(() => {
      clearInterval(updateInterval);
      endRound(client, gameState, gameCode);
    }, roundDuration);
  }
  
  // Phase 3 round handler
  async function handlePhase3Round(client: any, channel: any, gameState: GameState, gameCode: string): Promise<void> {
    const activePlayers = Array.from(gameState.players.values()).filter(p => p.active);
    
    // Create round announcement
    const embed = new EmbedBuilder()
      .setTitle(`🎮 Round ${gameState.round} - Phase 3: Final Duel`)
      .setDescription(`It's down to the final 2 players! This is the Final Duel phase.\n\n**Rules:**\n- Each player must choose either 0 or 100\n- Player A wins if they choose the same number as Player B\n- Player B wins if they choose a different number than Player A\n\nCheck your DMs to make your choice!`)
      .addFields(
        { name: 'Time Remaining', value: '30 seconds', inline: true },
        { name: 'Players', value: activePlayers.map(p => `<@${p.id}>`).join(' vs '), inline: true }
      )
      .setColor('#800080')
      .setFooter({ text: `Game Code: ${gameCode}` });
    
    const message = await channel.send({ embeds: [embed], content: activePlayers.map(p => `<@${p.id}>`).join(' ') });
    
    // Randomly assign player A and player B
    const playerA = activePlayers[0];
    const playerB = activePlayers[1];
    
    // Send DMs to each player
    try {
      const userA = await client.users.fetch(playerA.id);
      const userB = await client.users.fetch(playerB.id);
      
      const rowA = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`borderland:duel:${gameCode}:0`)
            .setLabel('Choose 0')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`borderland:duel:${gameCode}:100`)
            .setLabel('Choose 100')
            .setStyle(ButtonStyle.Danger)
        );
      
      const rowB = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`borderland:duel:${gameCode}:0`)
            .setLabel('Choose 0')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`borderland:duel:${gameCode}:100`)
            .setLabel('Choose 100')
            .setStyle(ButtonStyle.Danger)
        );
      
      await userA.send({
        content: `🎮 **Round ${gameState.round} - Final Duel**\nYou are Player A. You win if you choose the same number as Player B. Choose 0 or 100:`,
        components: [rowA]
      });
      
      await userB.send({
        content: `🎮 **Round ${gameState.round} - Final Duel**\nYou are Player B. You win if you choose a different number than Player A. Choose 0 or 100:`,
        components: [rowB]
      });
    } catch (error) {
      console.error('Failed to send DMs to players:', error);
    }
    
    // Set a timer for the round
    const roundDuration = 30000; // 30 seconds
    gameState.roundEndTime = Date.now() + roundDuration;
    
    // Update the time remaining every 10 seconds
    const updateInterval = setInterval(async () => {
      const timeRemaining = Math.max(0, Math.floor((gameState.roundEndTime! - Date.now()) / 1000));
      
      if (timeRemaining <= 0) {
        clearInterval(updateInterval);
        return;
      }
      
      const updatedEmbed = new EmbedBuilder()
        .setTitle(`🎮 Round ${gameState.round} - Phase 3: Final Duel`)
        .setDescription(`It's down to the final 2 players! This is the Final Duel phase.\n\n**Rules:**\n- Each player must choose either 0 or 100\n- Player A wins if they choose the same number as Player B\n- Player B wins if they choose a different number than Player A`)
        .addFields(
          { name: 'Time Remaining', value: `${timeRemaining} seconds`, inline: true },
          { name: 'Players', value: activePlayers.map(p => `<@${p.id}>`).join(' vs '), inline: true },
          { name: 'Submitted', value: `${gameState.numbersSubmitted.size}/2`, inline: true }
        )
        .setColor('#800080')
        .setFooter({ text: `Game Code: ${gameCode}` });
      
      await message.edit({ embeds: [updatedEmbed] });
    }, 10000);
    
    // Set timeout for the round end
    gameState.timer = setTimeout(() => {
      clearInterval(updateInterval);
      endRound(client, gameState, gameCode);
    }, roundDuration);
  }
  
  

  // Round conclusion handler
async function endRound(client: any, gameState: GameState, gameCode: string): Promise<void> {
    // Clear the round timer
    if (gameState.timer) {
      clearTimeout(gameState.timer);
      gameState.timer = undefined;
    }
    
    const channel = client.channels.cache.get(gameState.channelId);
    if (!channel || channel.type !== ChannelType.GuildText) return;
    
    const activePlayers = Array.from(gameState.players.values()).filter(p => p.active);
    
    // Handle submission timeout - players who didn't submit lose a life
    for (const player of activePlayers) {
      if (!gameState.numbersSubmitted.has(player.id)) {
        player.lives -= 1;
        
        // Check if player is eliminated
        if (player.lives <= 0) {
          player.active = false;
          await channel.send(`💀 <@${player.id}> has been eliminated for not submitting a number!`);
        } else {
          await channel.send(`⚠️ <@${player.id}> didn't submit a number and loses 1 life! (${player.lives} remaining)`);
        }
      }
    }
    
    // If we have enough submissions, process the round results
    if (gameState.numbersSubmitted.size > 0) {
      // Different logic based on the game phase
      if (gameState.phase === 1) {
        await processPhase1Results(client, channel, gameState, gameCode);
      } else if (gameState.phase === 2) {
        await processPhase2Results(client, channel, gameState, gameCode);
      } else if (gameState.phase === 3) {
        await processPhase3Results(client, channel, gameState, gameCode);
      }
    } else {
      // No submissions at all, just start a new round
      await channel.send('⚠️ No players submitted a number this round!');
    }
    
    // Check if game should continue or end
    const remainingActivePlayers = Array.from(gameState.players.values()).filter(p => p.active);
    
    if (remainingActivePlayers.length <= 1) {
      // Game is over
      return endGame(client, gameState, gameCode);
    }
    
    // Start the next round after a delay
    setTimeout(() => {
      startNewRound(client, gameState, gameCode);
    }, 5000);
  }
  
  // Process Phase 1 results
  async function processPhase1Results(client: any, channel: any, gameState: GameState, gameCode: string): Promise<void> {
    const numbers = Array.from(gameState.numbersSubmitted.values());
    const playersWhoSubmitted = Array.from(gameState.numbersSubmitted.keys());
    
    // Calculate average
    const average = calculateAverage(numbers);
    
    // Find the closest unique number
    const winnerId = findClosestUniqueNumber(gameState.numbersSubmitted, average);
    
    // Create a result embed
    const embed = new EmbedBuilder()
      .setTitle(`🎮 Round ${gameState.round} Results - Phase 1`)
      .setDescription(`The numbers have been submitted and the results are in!`)
      .addFields(
        { name: 'Average', value: average.toFixed(2), inline: true },
        { name: 'Submissions', value: `${gameState.numbersSubmitted.size} players`, inline: true }
      )
      .setColor('#2b2d31')
      .setFooter({ text: `Game Code: ${gameCode}` });
    
    // Add all players' numbers to the embed
    let submissionsText = '';
    for (const [playerId, number] of gameState.numbersSubmitted.entries()) {
      const player = gameState.players.get(playerId);
      if (player) {
        const isDuplicate = numbers.filter(n => n === number).length > 1;
        submissionsText += `<@${playerId}>: **${number}** ${isDuplicate ? '(Duplicate)' : ''}\n`;
      }
    }
    
    embed.addFields({ name: 'Submissions', value: submissionsText || 'None', inline: false });
    
    // Send the results
    await channel.send({ embeds: [embed] });
    
    // If we have a winner, let them choose who loses a life
    if (winnerId) {
      const winner = gameState.players.get(winnerId);
      if (winner) {
        await channel.send(`🏆 <@${winnerId}> wins with the number closest to the average!`);
        
        // Create buttons for the winner to choose who loses a life
        const row = new ActionRowBuilder<ButtonBuilder>();
        const eligiblePlayers = Array.from(gameState.players.values())
          .filter(p => p.active && p.id !== winnerId);
        
        if (eligiblePlayers.length > 0) {
          for (const player of eligiblePlayers) {
            row.addComponents(
              new ButtonBuilder()
                .setCustomId(`borderland:eliminate:${gameCode}:${player.id}`)
                .setLabel(`${player.username} (${player.lives} lives)`)
                .setStyle(ButtonStyle.Danger)
            );
          }
          
          const targetMsg = await channel.send({
            content: `<@${winnerId}>, choose a player to lose 1 life:`,
            components: [row]
          });
          
          // Set up collector for the elimination choice
          const collector = targetMsg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 30000
          });
          
          collector.on('collect', async (interaction: MessageComponentInteraction) => {
            if (interaction.user.id !== winnerId) {
              await interaction.reply({
                content: '❌ Only the round winner can make this choice.',
                ephemeral: true
              });
              return;
            }
            
            const targetId = interaction.customId.split(':')[3];
            const target = gameState.players.get(targetId);
            
            if (target && target.active) {
              target.lives -= 1;
              
              if (target.lives <= 0) {
                target.active = false;
                await channel.send(`💀 <@${targetId}> has been eliminated!`);
              } else {
                await channel.send(`⚠️ <@${targetId}> loses 1 life! (${target.lives} remaining)`);
              }
              
              await interaction.update({
                content: `<@${winnerId}> has chosen <@${targetId}> to lose a life!`,
                components: []
              });
              
              collector.stop();
            }
          });
          
          collector.on('end', async (collected: Collection<Snowflake, ButtonInteraction>)  => {
            if (collected.size === 0) {
              // If the winner didn't choose, randomly select a player
              const randomTarget = getRandomElement(eligiblePlayers);
              
              randomTarget.lives -= 1;
              
              if (randomTarget.lives <= 0) {
                randomTarget.active = false;
                await channel.send(`💀 <@${randomTarget.id}> has been eliminated by random selection!`);
              } else {
                await channel.send(`⚠️ <@${randomTarget.id}> loses 1 life by random selection! (${randomTarget.lives} remaining)`);
              }
              
              await targetMsg.edit({
                content: `Time's up! <@${winnerId}> didn't choose, so <@${randomTarget.id}> loses a life randomly!`,
                components: []
              });
            }
          });
        } else {
          await channel.send(`There are no eligible players for <@${winnerId}> to eliminate. Moving to next round.`);
        }
      }
    } else {
      // No winner (all duplicates or no submissions), random player loses life
      const eligiblePlayers = Array.from(gameState.players.values())
        .filter(p => p.active && playersWhoSubmitted.includes(p.id));
      
      if (eligiblePlayers.length > 0) {
        const randomTarget = getRandomElement(eligiblePlayers);
        
        randomTarget.lives -= 1;
        
        if (randomTarget.lives <= 0) {
          randomTarget.active = false;
          await channel.send(`💀 <@${randomTarget.id}> has been eliminated by random selection (no unique winner)!`);
        } else {
          await channel.send(`⚠️ <@${randomTarget.id}> loses 1 life by random selection (no unique winner)! (${randomTarget.lives} remaining)`);
        }
      }
    }
  }
  
  // Process Phase 2 results
  async function processPhase2Results(client: any, channel: any, gameState: GameState, gameCode: string): Promise<void> {
    const numbers = Array.from(gameState.numbersSubmitted.values());
    const playersWhoSubmitted = Array.from(gameState.numbersSubmitted.keys());
    
    // Calculate average
    const average = calculateAverage(numbers);
    
    // Check for betrayals in alliances
    const betrayals = new Map<string, string>(); // Map of betrayer -> betrayed
    
    for (const [player1, player2] of gameState.alliances.entries()) {
      const number1 = gameState.numbersSubmitted.get(player1);
      const number2 = gameState.numbersSubmitted.get(player2);
      
      if (number1 !== undefined && number2 !== undefined && number1 !== number2) {
        // A betrayal has occurred
        betrayals.set(player1, player2);
      }
    }
    
    // Create a result embed
    const embed = new EmbedBuilder()
      .setTitle(`🎮 Round ${gameState.round} Results - Phase 2`)
      .setDescription(`The numbers have been submitted and the results are in!`)
      .addFields(
        { name: 'Average', value: average.toFixed(2), inline: true },
        { name: 'Submissions', value: `${gameState.numbersSubmitted.size} players`, inline: true }
      )
      .setColor('#FF0000')
      .setFooter({ text: `Game Code: ${gameCode}` });
    
    // Add all players' numbers to the embed
    let submissionsText = '';
    for (const [playerId, number] of gameState.numbersSubmitted.entries()) {
      const player = gameState.players.get(playerId);
      if (player) {
        const isDuplicate = numbers.filter(n => n === number).length > 1;
        const allianceText = gameState.alliances.has(playerId) ? 
          `(Teamed with <@${gameState.alliances.get(playerId)}>)` : '(Solo)';
        submissionsText += `<@${playerId}>: **${number}** ${isDuplicate ? '(Duplicate)' : ''} ${allianceText}\n`;
      }
    }
    
    embed.addFields({ name: 'Submissions', value: submissionsText || 'None', inline: false });
    
    // Add betrayals to the embed if any
    if (betrayals.size > 0) {
      let betrayalText = '';
      for (const [betrayer, betrayed] of betrayals.entries()) {
        betrayalText += `💔 <@${betrayer}> betrayed <@${betrayed}>!\n`;
      }
      embed.addFields({ name: 'Betrayals', value: betrayalText, inline: false });
    }
    
    // Send the results
    await channel.send({ embeds: [embed] });
    
    // Find closest unique number
    const winnerId = findClosestUniqueNumber(gameState.numbersSubmitted, average);
    
    if (winnerId) {
      const winner = gameState.players.get(winnerId);
      if (winner) {
        await channel.send(`🏆 <@${winnerId}> wins with the number closest to the average!`);
        
        // Determine who loses a life based on the winner's situation
        if (gameState.alliances.has(winnerId)) {
          // Winner is in an alliance - check if it was a betrayal or successful team-up
          const allyId = gameState.alliances.get(winnerId)!;
          
          if (betrayals.has(winnerId)) {
            // Winner betrayed their ally
            const betrayed = gameState.players.get(allyId);
            if (betrayed && betrayed.active) {
              betrayed.lives -= 1;
              
              if (betrayed.lives <= 0) {
                betrayed.active = false;
                await channel.send(`💀 <@${allyId}> has been eliminated due to betrayal!`);
              } else {
                await channel.send(`⚠️ <@${allyId}> loses 1 life due to betrayal! (${betrayed.lives} remaining)`);
              }
            }
          } else {
            // Successful team-up - find the non-allied player
            const nonAlliedPlayer = Array.from(gameState.players.values())
              .find(p => p.active && p.id !== winnerId && p.id !== allyId);
            
            if (nonAlliedPlayer) {
              nonAlliedPlayer.lives -= 1;
              
              if (nonAlliedPlayer.lives <= 0) {
                nonAlliedPlayer.active = false;
                await channel.send(`💀 <@${nonAlliedPlayer.id}> has been eliminated by the alliance!`);
              } else {
                await channel.send(`⚠️ <@${nonAlliedPlayer.id}> loses 1 life due to the alliance! (${nonAlliedPlayer.lives} remaining)`);
              }
            }
          }
        } else {
          // Solo winner - choose who loses a life
          // Similar to Phase 1 winner choice
          const row = new ActionRowBuilder<ButtonBuilder>();
          const eligiblePlayers = Array.from(gameState.players.values())
            .filter(p => p.active && p.id !== winnerId);
          
          if (eligiblePlayers.length > 0) {
            for (const player of eligiblePlayers) {
              row.addComponents(
                new ButtonBuilder()
                  .setCustomId(`borderland:eliminate:${gameCode}:${player.id}`)
                  .setLabel(`${player.username} (${player.lives} lives)`)
                  .setStyle(ButtonStyle.Danger)
              );
            }
            
            const targetMsg = await channel.send({
              content: `<@${winnerId}>, choose a player to lose 1 life:`,
              components: [row]
            });
            
            // Set up collector for the elimination choice
            const collector = targetMsg.createMessageComponentCollector({
              componentType: ComponentType.Button,
              time: 30000
            });
            
            collector.on('collect', async (interaction: MessageComponentInteraction) => {
              if (interaction.user.id !== winnerId) {
                await interaction.reply({
                  content: '❌ Only the round winner can make this choice.',
                  ephemeral: true
                });
                return;
              }
              
              const targetId = interaction.customId.split(':')[3];
              const target = gameState.players.get(targetId);
              
              if (target && target.active) {
                target.lives -= 1;
                
                if (target.lives <= 0) {
                  target.active = false;
                  await channel.send(`💀 <@${targetId}> has been eliminated!`);
                } else {
                  await channel.send(`⚠️ <@${targetId}> loses 1 life! (${target.lives} remaining)`);
                }
                
                await interaction.update({
                  content: `<@${winnerId}> has chosen <@${targetId}> to lose a life!`,
                  components: []
                });
                
                collector.stop();
              }
            });
            
            collector.on('end', async (collected: Collection<Snowflake, ButtonInteraction>)  => {
              if (collected.size === 0) {
                // If the winner didn't choose, randomly select a player
                const randomTarget = getRandomElement(eligiblePlayers);
                
                randomTarget.lives -= 1;
                
                if (randomTarget.lives <= 0) {
                  randomTarget.active = false;
                  await channel.send(`💀 <@${randomTarget.id}> has been eliminated by random selection!`);
                } else {
                  await channel.send(`⚠️ <@${randomTarget.id}> loses 1 life by random selection! (${randomTarget.lives} remaining)`);
                }
                
                await targetMsg.edit({
                  content: `Time's up! <@${winnerId}> didn't choose, so <@${randomTarget.id}> loses a life randomly!`,
                  components: []
                });
              }
            });
          }
        }
      }
    } else {
      // No winner (all duplicates or no submissions), random player loses life
      const eligiblePlayers = Array.from(gameState.players.values())
        .filter(p => p.active && playersWhoSubmitted.includes(p.id));
      
      if (eligiblePlayers.length > 0) {
        const randomTarget = getRandomElement(eligiblePlayers);
        
        randomTarget.lives -= 1;
        
        if (randomTarget.lives <= 0) {
          randomTarget.active = false;
          await channel.send(`💀 <@${randomTarget.id}> has been eliminated by random selection (no unique winner)!`);
        } else {
          await channel.send(`⚠️ <@${randomTarget.id}> loses 1 life by random selection (no unique winner)! (${randomTarget.lives} remaining)`);
        }
      }
    }
  }
  
  // Process Phase 3 results (final duel)
  async function processPhase3Results(client: any, channel: any, gameState: GameState, gameCode: string): Promise<void> {
    const activePlayers = Array.from(gameState.players.values()).filter(p => p.active);
    
    if (activePlayers.length !== 2 || gameState.numbersSubmitted.size !== 2) {
      await channel.send('⚠️ Cannot process duel results - not enough players or submissions.');
      return;
    }
    
    const playerA = activePlayers[0];
    const playerB = activePlayers[1];
    
    const playerANumber = gameState.numbersSubmitted.get(playerA.id);
    const playerBNumber = gameState.numbersSubmitted.get(playerB.id);
    
    // Create a result embed
    const embed = new EmbedBuilder()
      .setTitle(`🎮 Round ${gameState.round} Results - Final Duel`)
      .setDescription(`The duel results are in!`)
      .addFields(
        { name: 'Player A', value: `<@${playerA.id}>: **${playerANumber ?? 'No submission'}**`, inline: true },
        { name: 'Player B', value: `<@${playerB.id}>: **${playerBNumber ?? 'No submission'}**`, inline: true }
      )
      .setColor('#800080')
      .setFooter({ text: `Game Code: ${gameCode}` });
    
    await channel.send({ embeds: [embed] });
    
    // Determine winner based on the rules:
    // Player A wins if they choose the same number as Player B
    // Player B wins if they choose a different number than Player A
    if (playerANumber !== undefined && playerBNumber !== undefined) {
      if (playerANumber === playerBNumber) {
        // Player A wins
        playerB.lives -= 1;
        await channel.send(`🏆 <@${playerA.id}> (Player A) wins this round! They chose the same number as Player B.`);
        
        if (playerB.lives <= 0) {
          playerB.active = false;
          await channel.send(`💀 <@${playerB.id}> has been eliminated!`);
        } else {
          await channel.send(`⚠️ <@${playerB.id}> loses 1 life! (${playerB.lives} remaining)`);
        }
      } else {
        // Player B wins
        playerA.lives -= 1;
        await channel.send(`🏆 <@${playerB.id}> (Player B) wins this round! They chose a different number than Player A.`);
        
        if (playerA.lives <= 0) {
          playerA.active = false;
          await channel.send(`💀 <@${playerA.id}> has been eliminated!`);
        } else {
          await channel.send(`⚠️ <@${playerA.id}> loses 1 life! (${playerA.lives} remaining)`);
        }
      }
    } else {
      // Handle case where one or both players didn't submit
      if (playerANumber === undefined && playerBNumber === undefined) {
        // Both didn't submit, both lose a life
        playerA.lives -= 1;
        playerB.lives -= 1;
        
        await channel.send(`⚠️ Both players failed to submit a number! Both lose 1 life.`);
        
        if (playerA.lives <= 0) {
          playerA.active = false;
          await channel.send(`💀 <@${playerA.id}> has been eliminated!`);
        }
        
        if (playerB.lives <= 0) {
          playerB.active = false;
          await channel.send(`💀 <@${playerB.id}> has been eliminated!`);
        }
      } else if (playerANumber === undefined) {
        // Player A didn't submit
        playerA.lives -= 1;
        await channel.send(`⚠️ <@${playerA.id}> failed to submit a number and loses 1 life!`);
        
        if (playerA.lives <= 0) {
          playerA.active = false;
          await channel.send(`💀 <@${playerA.id}> has been eliminated!`);
        }
      } else if (playerBNumber === undefined) {
        // Player B didn't submit
        playerB.lives -= 1;
        await channel.send(`⚠️ <@${playerB.id}> failed to submit a number and loses 1 life!`);
        
        if (playerB.lives <= 0) {
          playerB.active = false;
          await channel.send(`💀 <@${playerB.id}> has been eliminated!`);
        }
      }
    }
  }
  
  // Game conclusion handler
  async function endGame(client: any, gameState: GameState, gameCode: string): Promise<void> {
    const channel = client.channels.cache.get(gameState.channelId);
    if (!channel || channel.type !== ChannelType.GuildText) return;
    
    // Find the winner (the last active player)
    const winner = Array.from(gameState.players.values()).find(p => p.active);
    
    // Create final results embed
    const embed = new EmbedBuilder()
      .setTitle('🏆 Game Over!')
      .setDescription(winner ? 
        `The game has ended! <@${winner.id}> is the last player standing and wins!` : 
        'The game has ended with no winners!'
      )
      .setColor('#FFD700')
      .setFooter({ text: `Game Code: ${gameCode}` });
    
    // Add player statistics
    const playersInfo = Array.from(gameState.players.values())
      .sort((a, b) => (b.active ? 1 : 0) - (a.active ? 1 : 0) || b.lives - a.lives)
      .map(player => `<@${player.id}>: ${player.lives} lives ${player.active ? '🟢' : '🔴'}`)
      .join('\n');
    
    embed.addFields(
      { name: 'Player Results', value: playersInfo || 'No players', inline: false },
      { name: 'Total Rounds', value: gameState.round.toString(), inline: true }
    );
    
    await channel.send({ embeds: [embed] });
    
    if (winner) {
      // Create a trophy message for the winner
      const trophyEmbed = new EmbedBuilder()
        .setTitle('🏆👑 VICTORY 👑🏆')
        .setDescription(`<@${winner.id}> has won the Borderland Game!`)
        .setColor('#FFD700')
        .setFooter({ text: 'Congratulations!' });
      
      await channel.send({ embeds: [trophyEmbed] });
    }
    
    // Clean up the game data
    activeGames.delete(gameCode);
  }
  
  // Button handlers for game phases
  export function setupBorderGameButtonHandlers(client: any) {
    client.on('interactionCreate', async (interaction: any) => {
      if (!interaction.isButton()) return;
      
      const customId = interaction.customId;
      
      if (customId.startsWith('borderland:')) {
        const [_, action, gameCode, ...params] = customId.split(':');
        
        const gameState = activeGames.get(gameCode);
        if (!gameState) {
          return interaction.reply({
            content: '❌ Game not found or has expired.',
            ephemeral: true
          });
        }
        
        if (action === 'join') {
          // Handle join button
          // Similar to `/borderland join` command
          if (gameState.status !== 'waiting') {
            return interaction.reply({
              content: '❌ This game has already started. You cannot join it now.',
              ephemeral: true
            });
          }
          
          if (gameState.players.has(interaction.user.id)) {
            return interaction.reply({
              content: '❌ You are already in this game.',
              ephemeral: true
            });
          }
          
          if (gameState.players.size >= 5) {
            return interaction.reply({
              content: '❌ This game is full (5/5 players).',
              ephemeral: true
            });
          }
          
          // Add the player to the game
          gameState.players.set(interaction.user.id, {
            id: interaction.user.id,
            username: interaction.user.username,
            lives: 10,
            active: true,
          });
          
          // Update the game status message
          await updateGameStatusMessage(client, gameState, gameCode);
          
          await interaction.reply({
            content: `✅ You have joined the game! There are now ${gameState.players.size} players.`,
            ephemeral: true
          });
        } else if (action === 'start') {
          // Handle start button
          if (interaction.user.id !== gameState.host) {
            return interaction.reply({
              content: '❌ Only the host can start the game.',
              ephemeral: true
            });
          }
          
          if (gameState.status !== 'waiting') {
            return interaction.reply({
              content: '❌ This game has already started.',
              ephemeral: true
            });
          }
          
          if (gameState.players.size < 3) {
            return interaction.reply({
              content: '❌ You need at least 3 players to start the game.',
              ephemeral: true
            });
          }
          
          // Update game state and start the game
          gameState.status = 'starting';
          
          const channel = client.channels.cache.get(gameState.channelId);
          if (channel?.type === ChannelType.GuildText) {
            await channel.send({
              content: `🎮 Game (Code: ${gameCode}) is starting with ${gameState.players.size} players!\n${Array.from(gameState.players.values()).map(p => `<@${p.id}>`).join(', ')}\n\nGet ready for Phase 1!`,
            });
          }
          
          // Start the first round after a brief delay
          setTimeout(() => {
            gameState.status = 'playing';
            startNewRound(client, gameState, gameCode);
          }, 5000);
          
          await interaction.reply({
            content: '✅ The game has been started!',
            ephemeral: true
          });
        } else if (action === 'rules') {
          // Handle rules button
          const rulesEmbed = new EmbedBuilder()
            .setTitle('🎮 Borderland Game Rules')
            .setDescription('A multiplayer game inspired by Alice in Borderland!')
            .addFields(
              { name: 'Player Setup', value: '- 3 to 5 players\n- Each player starts with 10 lives\n- Game ends when only 1 player is left standing', inline: false },
              { name: 'Phase 1: Standard Phase (5-4 players)', value: '- Players choose a number between 1 and 100\n- Closest unique number to the average wins\n- Winner chooses any player to lose 1 life\n- Duplicate numbers are invalid for winning', inline: false },
              { name: 'Phase 2: Betrayal Phase (3 players)', value: '- Option A: Play Solo (choose 1-100)\n- Option B: Team Up with another player\n- Team Up: Both choose same number to shift average\n- Betrayal: Agree to team up but choose different number\n- Betrayer wins: betrayed player loses a life\n- Alliance wins: third player loses a life', inline: false },
              { name: 'Phase 3: Final Duel (2 players)', value: '- Player A wins if they choose the same number as Player B\n- Player B wins if they choose a different number\n- Each player must choose either 0 or 100', inline: false }
            )
            .setColor('#2b2d31');
          
          await interaction.reply({
            embeds: [rulesEmbed],
            ephemeral: true
          });
        } else if (action === 'number') {
          // Handle number range selection
          if (gameState.status !== 'playing') {
            return interaction.reply({
              content: '❌ The game is not in progress.',
              ephemeral: true
            });
          }
          
          if (!gameState.players.has(interaction.user.id) || !gameState.players.get(interaction.user.id)?.active) {
            return interaction.reply({
              content: '❌ You are not an active player in this game.',
              ephemeral: true
            });
          }
          
          if (gameState.numbersSubmitted.has(interaction.user.id)) {
            return interaction.reply({
              content: '❌ You already submitted a number for this round.',
              ephemeral: true
            });
          }
          
          // Parse the range
          const range = params[0];
          const [min, max] = range.split('-').map(Number);
          
          // Create buttons for specific numbers in the range
          const rows = [];
          for (let i = 0; i < Math.ceil((max - min + 1) / 5); i++) {
            const row = new ActionRowBuilder<ButtonBuilder>();
            for (let j = 0; j < 5 && min + i * 5 + j <= max; j++) {
              const num = min + i * 5 + j;
              row.addComponents(
                new ButtonBuilder()
                  .setCustomId(`borderland:selectnumber:${gameCode}:${num}`)
                  .setLabel(num.toString())
                  .setStyle(ButtonStyle.Secondary)
              );
            }
            rows.push(row);
          }
          
          await interaction.reply({
            content: `Select a specific number between ${min} and ${max}:`,
            components: rows,
            ephemeral: true
          });
        } else if (action === 'selectnumber') {
          // Handle specific number selection
            // Button handlers continuation
        } else if (action === 'selectnumber') {
            // Handle specific number selection
            if (gameState.status !== 'playing') {
              return interaction.reply({
                content: '❌ The game is not in progress.',
                ephemeral: true
              });
            }
            
            if (!gameState.players.has(interaction.user.id) || !gameState.players.get(interaction.user.id)?.active) {
              return interaction.reply({
                content: '❌ You are not an active player in this game.',
                ephemeral: true
              });
            }
            
            if (gameState.numbersSubmitted.has(interaction.user.id)) {
              return interaction.reply({
                content: '❌ You already submitted a number for this round.',
                ephemeral: true
              });
            }
            
            // Get the selected number
            const number = parseInt(params[0], 10);
            
            // Register the player's number
            gameState.numbersSubmitted.set(interaction.user.id, number);
            
            await interaction.update({
              content: `You chose the number **${number}**. Waiting for other players...`,
              components: [],
              ephemeral: true
            });
            
            // Check if all active players have submitted
            const activePlayers = Array.from(gameState.players.values()).filter(p => p.active);
            
            if (gameState.numbersSubmitted.size === activePlayers.length) {
              // All players have submitted, end the round early
              if (gameState.timer) {
                clearTimeout(gameState.timer);
                gameState.timer = undefined;
              }
              
              // End the round after a short delay
              setTimeout(() => {
                endRound(client, gameState, gameCode);
              }, 1000);
            }
          } else if (action === 'eliminate') {
            // Handle player elimination choice
            if (gameState.status !== 'playing') {
              return interaction.reply({
                content: '❌ The game is not in progress.',
                ephemeral: true
              });
            }
            
            const targetId = params[0];
            const target = gameState.players.get(targetId);
            
            if (!target || !target.active) {
              return interaction.reply({
                content: '❌ Invalid target player.',
                ephemeral: true
              });
            }
            
            // Apply the elimination
            target.lives -= 1;
            
            const channel = client.channels.cache.get(gameState.channelId);
            
            if (target.lives <= 0) {
              target.active = false;
              if (channel?.type === ChannelType.GuildText) {
                await channel.send(`💀 <@${targetId}> has been eliminated!`);
              }
            } else {
              if (channel?.type === ChannelType.GuildText) {
                await channel.send(`⚠️ <@${targetId}> loses 1 life! (${target.lives} remaining)`);
              }
            }
            
            await interaction.update({
              content: `You chose <@${targetId}> to lose a life!`,
              components: [],
            });
          } else if (action === 'strategy') {
            // Handle Phase 2 strategy choice
            if (gameState.phase !== 2) {
              return interaction.reply({
                content: '❌ This action is only available in Phase 2.',
                ephemeral: true
              });
            }
            
            const strategy = params[0]; // 'solo' or 'team'
            
            if (strategy === 'solo') {
              // Player chose to play solo
              // Create buttons for number range selection
              const row = new ActionRowBuilder<ButtonBuilder>();
              for (let i = 1; i <= 10; i++) {
                row.addComponents(
                  new ButtonBuilder()
                    .setCustomId(`borderland:number:${gameCode}:${(i * 10) - 9}-${i * 10}`)
                    .setLabel(`${(i * 10) - 9}-${i * 10}`)
                    .setStyle(ButtonStyle.Secondary)
                );
              }
              
              await interaction.update({
                content: `You've chosen to play solo. Now select a range for your number:`,
                components: [row],
                ephemeral: true
              });
            } else if (strategy === 'team') {
              // Player chose to propose an alliance
              // Show list of other active players to ally with
              const activePlayers = Array.from(gameState.players.values())
                .filter(p => p.active && p.id !== interaction.user.id);
              
              if (activePlayers.length === 0) {
                return interaction.reply({
                  content: '❌ There are no other active players to form an alliance with.',
                  ephemeral: true
                });
              }
              
              const row = new ActionRowBuilder<ButtonBuilder>();
              for (const player of activePlayers) {
                row.addComponents(
                  new ButtonBuilder()
                    .setCustomId(`borderland:ally:${gameCode}:${player.id}`)
                    .setLabel(`Team with ${player.username}`)
                    .setStyle(ButtonStyle.Success)
                );
              }
              
              await interaction.update({
                content: `Who would you like to propose an alliance with?`,
                components: [row],
                ephemeral: true
              });
            }
          } else if (action === 'ally') {
            // Handle alliance proposal
            const targetId = params[0];
            const target = gameState.players.get(targetId);
            
            if (!target || !target.active) {
              return interaction.reply({
                content: '❌ Invalid target player for alliance.',
                ephemeral: true
              });
            }
            
            // Store the proposed alliance
            gameState.proposedAlliances.set(interaction.user.id, targetId);
            
            // Check if the target player also proposed an alliance with this player
            if (gameState.proposedAlliances.get(targetId) === interaction.user.id) {
              // Both players agreed to an alliance
              gameState.alliances.set(interaction.user.id, targetId);
              gameState.alliances.set(targetId, interaction.user.id);
              
              // Send DMs to both players to confirm the alliance
              try {
                const user = await client.users.fetch(interaction.user.id);
                const ally = await client.users.fetch(targetId);
                
                await user.send({
                  content: `🤝 You've formed an alliance with ${target.username}! Now you must decide together on a number to use.`
                });
                
                await ally.send({
                  content: `🤝 You've formed an alliance with ${interaction.user.username}! Now you must decide together on a number to use.`
                });
                
                // Now let both players select a number
                const row = new ActionRowBuilder<ButtonBuilder>();
                for (let i = 1; i <= 10; i++) {
                  row.addComponents(
                    new ButtonBuilder()
                      .setCustomId(`borderland:number:${gameCode}:${(i * 10) - 9}-${i * 10}`)
                      .setLabel(`${(i * 10) - 9}-${i * 10}`)
                      .setStyle(ButtonStyle.Secondary)
                  );
                }
                
                await user.send({
                  content: `Select a range for your number. Remember, to truly ally, both you and ${target.username} should choose the same number. You can also betray by picking a different number!`,
                  components: [row]
                });
                
                await ally.send({
                  content: `Select a range for your number. Remember, to truly ally, both you and ${interaction.user.username} should choose the same number. You can also betray by picking a different number!`,
                  components: [row]
                });
              } catch (error) {
                console.error('Failed to send DMs for alliance:', error);
              }
            } else {
              // This player proposed an alliance, waiting for the other player
              await interaction.update({
                content: `You've proposed an alliance with ${target.username}. Waiting for them to accept...`,
                components: [],
                ephemeral: true
              });
              
              // Try to notify the other player
              try {
                const targetUser = await client.users.fetch(targetId);
                await targetUser.send({
                  content: `💌 ${interaction.user.username} has proposed an alliance with you! Use the "Propose Alliance" button and select them to accept.`
                });
              } catch (error) {
                console.error('Failed to send alliance proposal notification:', error);
              }
            }
          } else if (action === 'duel') {
            // Handle Phase 3 duel choice
            if (gameState.phase !== 3) {
              return interaction.reply({
                content: '❌ This action is only available in the Final Duel phase.',
                ephemeral: true
              });
            }
            
            const choice = parseInt(params[0], 10); // 0 or 100
            
            // Register the player's choice
            gameState.numbersSubmitted.set(interaction.user.id, choice);
            
            await interaction.update({
              content: `You chose **${choice}**. Waiting for your opponent...`,
              components: [],
              ephemeral: true
            });
            
            // Check if both players have submitted
            if (gameState.numbersSubmitted.size === 2) {
              // Both players have submitted, end the round early
              if (gameState.timer) {
                clearTimeout(gameState.timer);
                gameState.timer = undefined;
              }
              
              // End the round after a short delay
              setTimeout(() => {
                endRound(client, gameState, gameCode);
              }, 1000);
            }
          }
        }
      });
  
      // Handle special modal submissions for custom numbers (optional enhancement)
      client.on('interactionCreate', async (interaction: any) => {
        if (!interaction.isModalSubmit()) return;
        
        const customId = interaction.customId;
        
        if (customId.startsWith('borderland:customnumber:')) {
          const [_, __, gameCode] = customId.split(':');
          
          const gameState = activeGames.get(gameCode);
          if (!gameState) {
            return interaction.reply({
              content: '❌ Game not found or has expired.',
              ephemeral: true
            });
          }
          
          const number = parseInt(interaction.fields.getTextInputValue('number'), 10);
          
          if (isNaN(number) || number < 1 || number > 100) {
            return interaction.reply({
              content: '❌ Please enter a valid number between 1 and 100.',
              ephemeral: true
            });
          }
          
          // Register the player's number
          gameState.numbersSubmitted.set(interaction.user.id, number);
          
          await interaction.reply({
            content: `You chose the number **${number}**. Waiting for other players...`,
            ephemeral: true
          });
          
          // Check if all active players have submitted
          const activePlayers = Array.from(gameState.players.values()).filter(p => p.active);
          
          if (gameState.numbersSubmitted.size === activePlayers.length) {
            // All players have submitted, end the round early
            if (gameState.timer) {
              clearTimeout(gameState.timer);
              gameState.timer = undefined;
            }
            
            // End the round after a short delay
            setTimeout(() => {
              endRound(client, gameState, gameCode);
            }, 1000);
          }
        }
      });
    }
