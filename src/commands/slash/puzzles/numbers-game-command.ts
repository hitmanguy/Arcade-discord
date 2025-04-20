import { RegisterType, SlashCommand } from '../../../handler';
import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  TextChannel,
  ColorResolvable,
  SlashCommandBuilder,
  SlashCommandAttachmentOption,
  MessageFlags
} from 'discord.js';
import { createGame, joinGame, startGame, getActiveGames } from '../../../functions/numbers-game-lobby';
import { GameState } from '../../../functions/numbers-game-state';
import { User, UserDocument } from '../../../model/user_status';
import { UserService } from '../../../services/user_services';
import { STORYLINE, PRISON_COLORS, PUZZLE_REWARDS, SANITY_EFFECTS } from '../../../constants/GAME_CONSTANTS';

export default new SlashCommand({
    registerType: RegisterType.Guild,
    data: new SlashCommandBuilder()
        .setName('numbers')
        .setDescription('Enter the Numbers Protocol - a game of deception and survival')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Initialize a new Numbers Protocol instance')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('join')
                .setDescription('Join an active Numbers Protocol')
                .addStringOption(option =>
                    option
                        .setName('code')
                        .setDescription('The protocol instance code')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('start')
                .setDescription('Activate the protocol (host only)')
                .addStringOption(option =>
                    option
                        .setName('code')
                        .setDescription('The protocol instance code')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('View active protocol instances')
        ) as SlashCommandBuilder,

    async execute(interaction: ChatInputCommandInteraction) {
        // Get user document first
        const user = await User.findOne({ discordId: interaction.user.id });
        if (!user) {
            await interaction.reply({
                content: 'You must be registered to use this command. Use `/register` first.',
                ephemeral: true
            });
            return;
        }

        // Handle subcommands
        const subcommand = interaction.options.getSubcommand();
        switch (subcommand) {
            case 'create':
                await handleCreateGame(interaction, user);
                break;
            case 'join':
                await handleJoinGame(interaction, user);
                break;
            case 'start':
                await handleStartGame(interaction, user);
                break;
            case 'list':
                await handleListGames(interaction);
                break;
        }
    }
});

// Move handler functions outside the command class
async function handleCreateGame(interaction: ChatInputCommandInteraction, user: UserDocument) {
    if (!interaction.channel || !interaction.channel.isTextBased()) {
        await interaction.reply({ 
          content: 'This protocol can only be initialized in a text channel.',
          ephemeral: true 
        });
        return;
      }
    
      // Use the correct storyline key "numbers-game-command" instead of "numbers"
      const storylineData = STORYLINE["numbers-game-command"];
      const glitchEffect = user.sanity < 50 ? getRandomGlitchMessage() + '\n\n' : '';
      const flavorText = user.sanity < 30 ? addGlitches(storylineData.flavorText) : storylineData.flavorText;
    
      const gameCode = createGame(interaction.user.id, interaction.channelId, interaction.user.username);
      
      const embed = new EmbedBuilder()
        .setColor(user.sanity < 30 ? PRISON_COLORS.danger : PRISON_COLORS.primary)
        .setTitle('🔢 Numbers Protocol Initialized')
        .setDescription(`${flavorText}\n\n${glitchEffect}Protocol ID: **${gameCode}**`)
        .addFields(
          { name: 'Overseer', value: `<@${interaction.user.id}>` },
          { name: 'Subjects', value: '1/5' },
          { name: 'Integration', value: `Enter protocol with \`/numbers join code:${gameCode}\`` },
          { name: '🧠 Status', value: `Sanity: ${user.sanity}%\nSuspicion: ${user.suspiciousLevel}%` },
          { name: 'Protocol Rules', value: user.sanity < 40 
            ? addGlitches('Each cycle, subjects input numbers between 1-100. Closest unique number to the average survives...\nPhase 1 (5-4): Standard Protocol\nPhase 2 (3): Trust Protocol\nPhase 3 (2): Final Protocol')
            : 'Each cycle, subjects input numbers between 1-100. Closest unique number to the average survives...\nPhase 1 (5-4): Standard Protocol\nPhase 2 (3): Trust Protocol\nPhase 3 (2): Final Protocol'
          }
        )
        .setFooter({ 
          text: user.sanity < 30 
            ? 'T̷h̷e̷ ̷n̶u̵m̷b̴e̷r̶s̷ ̵w̷h̵i̷s̷p̵e̷r̵.̷.̶.' 
            : 'Initiate protocol with /numbers start' 
        });
      
      await interaction.reply({ embeds: [embed] });
}

async function handleJoinGame(interaction: ChatInputCommandInteraction, user: UserDocument) {
    const gameCode = interaction.options.getString('code', true).toUpperCase();
    const result = joinGame(gameCode, interaction.user.id, interaction.user.username);
    
    if (!result.success) {
      await interaction.reply({ 
        content: `❌ ${result.message}`, 
        flags: [MessageFlags.Ephemeral]
      });
      return;
    }
    
    const game = result.game!;
    const playerCount = game.players.length;
    
    // Apply sanity effects
    const glitchEffect = user.sanity < 50 ? getRandomGlitchMessage() + '\n\n' : '';
    
    const embed = new EmbedBuilder()
      .setColor(user.sanity < 30 ? PRISON_COLORS.danger : PRISON_COLORS.success)
      .setTitle('🔢 Subject Integration Complete')
      .setDescription(`${glitchEffect}Protocol ID: **${gameCode}**`)
      .addFields(
        { name: 'Overseer', value: `<@${game.hostId}>` },
        { name: 'Subjects', value: `${playerCount}/5` },
        { name: 'Subject List', value: game.players.map(p => `<@${p.id}>`).join('\n') },
        { name: '🧠 Status', value: `Sanity: ${user.sanity}%\nSuspicion: ${user.suspiciousLevel}%` }
      )
      .setFooter({ 
        text: user.sanity < 30 
          ? 'T̷h̷e̶ ̷o̶t̵h̷e̴r̷s̶ ̷w̵a̷t̵c̷h̵.̷.̶.' 
          : 'Trust no one...' 
      });
    
    await interaction.reply({ embeds: [embed] });
}

async function handleStartGame(interaction: ChatInputCommandInteraction, user: UserDocument) {
    const gameCode = interaction.options.getString('code', true).toUpperCase();
    const result = startGame(gameCode, interaction.user.id);
    
    if (!result.success) {
      await interaction.reply({ 
        content: `❌ ${result.message}`, 
        ephemeral: true 
      });
      return;
    }
    
    const game = result.game!;
    
    // Apply sanity effects
    const glitchEffect = user.sanity < 50 ? getRandomGlitchMessage() + '\n\n' : '';
    
    const embed = new EmbedBuilder()
      .setColor(user.sanity < 30 ? PRISON_COLORS.danger : PRISON_COLORS.primary)
      .setTitle('🔢 Numbers Protocol Activating')
      .setDescription(`${glitchEffect}Initializing protocol with ${game.players.length} subjects...`)
      .addFields(
        { name: 'Subjects', value: game.players.map(p => `<@${p.id}> (10 ❤️)`).join('\n') },
        { name: 'Phase 1', value: 'Standard Protocol - Trust your instincts, but watch your back...' }
      )
      .setFooter({ 
        text: user.sanity < 30 
          ? 'T̷h̷e̶ ̷g̶a̵m̷e̴ ̷b̶e̷g̵i̷n̵s̵.̷.̶.' 
          : 'May the odds be ever in your favor...' 
      });
    
    await interaction.reply({ embeds: [embed] });
    
    const channel = interaction.channel as TextChannel;
    if (!channel) return;
    
    // Start the game loop with sanity tracking
    await startGameLoop(channel, game, user);
}

async function handleListGames(interaction: ChatInputCommandInteraction) {
    const games = getActiveGames();
    
    if (games.length === 0) {
      await interaction.reply({ 
        content: 'No active protocol instances found. Initialize one with `/numbers create`!',
        flags: [MessageFlags.Ephemeral]
      });
      return;
    }
    
    const embed = new EmbedBuilder()
      .setTitle('🔢 Active Number Protocols')
      .setDescription('Join a protocol with `/numbers join code:<CODE>`')
      .setColor(PRISON_COLORS.primary);
    
    games.forEach(game => {
      embed.addFields({
        name: `Protocol ID: ${game.gameCode}`,
        value: `Overseer: <@${game.hostId}>\nSubjects: ${game.players.length}/5\nStatus: ${game.gameStarted ? 'Active' : 'Waiting'}`
      });
    });
    
    await interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
}

// Keep helper functions outside the command class
async function startGameLoop(channel: TextChannel, gameState: GameState, user: UserDocument) {
    const message = await channel.send(
        user.sanity < 40 
          ? 'I̷n̷i̷t̷i̷a̷l̷i̷z̷i̷n̷g̷ ̷p̷r̷o̷t̷o̷c̷o̷l̷ ̷i̷n̷ ̷5̷ ̷s̷e̷c̷o̷n̷d̷s̷.̷.̷.'
          : 'Initializing protocol in 5 seconds...'
      );
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      try {
        // Register the global modal handler for this game
        GameState.registerGlobalHandler(channel.client);
    
        // Game loop with sanity tracking
        while (gameState.getAlivePlayers().length > 1) {
          // Update player sanity at the start of each round
          const userDoc = await User.findOne({ discordId: user.id });
          if (userDoc) {
            user = userDoc; // Update local user object with latest stats
          }
    
          const alivePlayers = gameState.getAlivePlayers();
          
          if (alivePlayers.length >= 4) {
            // Phase 1: Standard rounds
            await gameState.runStandardPhase(channel);
          } else if (alivePlayers.length === 3) {
            // Phase 2: Betrayal phase
            const phaseMessage = user.sanity < 40
              ? 'T̷h̷e̶ ̷t̷r̵u̷s̴t̷ ̶p̷h̵a̷s̷e̵ ̷b̵e̷g̵i̷n̵s̵.̷.̶.'
              : '### 🔄 Entering Trust Protocol!\nThree remain... Trust is a weapon, and betrayal cuts deep.';
            await channel.send(phaseMessage);
            await gameState.runBetrayalPhase(channel);
          } else if (alivePlayers.length === 2) {
            // Phase 3: Final duel
            const duelMessage = user.sanity < 40
              ? 'T̷h̷e̶ ̷f̷i̵n̷a̴l̷ ̶t̷e̵s̷t̵ ̷b̵e̷g̵i̷n̵s̵.̷.̶.'
              : '### ⚔️ Final Protocol Engaged!\nTwo minds, one truth. Let the final test begin.';
            await channel.send(duelMessage);
            await gameState.runFinalDuelPhase(channel);
          }
          
          // Check if game has ended
          if (gameState.getAlivePlayers().length <= 1) {
            break;
          }
          
          // Short break between rounds
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
        
        // Announce winner and update stats
        const winner = gameState.getAlivePlayers()[0];
        
        // Calculate rewards based on performance
        const performanceBonus = Math.floor((gameState.currentRound - 5) / 2); // Bonus for longer survival
        const baseReward = PUZZLE_REWARDS.hard;
        const meritChange = baseReward.success.meritPoints + performanceBonus;
        const sanityChange = baseReward.success.sanity;
        
        // Add suspicion for suspicious patterns
        let suspicionChange = 0;
        if (gameState.currentRound < 5) { // Suspiciously quick game
          suspicionChange = Math.min(20, user.suspiciousLevel + 15);
        }
    
        // Update winner's stats
        if (winner.id === user.id) {
          await UserService.updateUserStats(user.id, {
            meritPoints: user.meritPoints + meritChange,
            sanity: Math.min(Math.max(user.sanity + sanityChange, 0), 100),
            suspiciousLevel: Math.min(user.suspiciousLevel + suspicionChange, 100),
            totalGamesPlayed: user.totalGamesPlayed + 1,
            totalGamesWon: user.totalGamesWon + 1,
            currentStreak: user.currentStreak + 1
          });
        }
        
        const winEmbed = new EmbedBuilder()
          .setTitle('🏆 Protocol Complete')
          .setDescription(user.sanity < 40
            ? addGlitches(`Subject <@${winner.id}> survives the protocol... But at what cost?`)
            : `Subject <@${winner.id}> emerges victorious from the protocol!`)
          .setColor(PRISON_COLORS.success)
          .addFields(
            { name: 'Statistics', value: `Rounds Survived: ${gameState.currentRound}\nFinal Subjects: 1/${gameState.players.length}` }
          )
          .setFooter({ 
            text: user.sanity < 30 
              ? 'T̷h̷e̶ ̷n̶u̵m̷b̴e̷r̶s̷ ̵n̷e̵v̷e̷r̵ ̷f̶o̵r̷g̴e̷t̵.̷.̶.'
              : 'The numbers never lie...' 
          });
        
        await channel.send({ embeds: [winEmbed] });
      } catch (error) {
        console.error('Error in game loop:', error);
        await channel.send('A critical error occurred in the protocol. Emergency shutdown initiated.');
      } finally {
        // Clean up the game
        gameState.endGame();
      }
}

function getRandomGlitchMessage(): string {
    return SANITY_EFFECTS.glitchMessages[
        Math.floor(Math.random() * SANITY_EFFECTS.glitchMessages.length)
    ];
}

function addGlitches(text: string): string {
    const glitches = ['̷', '̶', '̸', '̵', '̴'];
    return text.split('').map(char => 
        Math.random() < 0.15 ? char + glitches[Math.floor(Math.random() * glitches.length)] : char
    ).join('');
}
