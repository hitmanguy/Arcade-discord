// src/commands/slash/puzzles/kingsOfDiamonds.ts
import { RegisterType, SlashCommand } from '../../../handler';
import { 
    SlashCommandBuilder, 
    CommandInteraction, 
    ButtonInteraction,
    ActionRowBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ModalSubmitInteraction,
    ButtonBuilder,
    EmbedBuilder,
    ButtonStyle,
    ComponentType,
    ChatInputCommandInteraction,
    StringSelectMenuBuilder,
    StringSelectMenuInteraction,
    MessageFlags,
    ColorResolvable,
    InteractionCollector
} from 'discord.js';
import { KingsOfDiamondsGame } from '../../../functions/beauty_context_game';
import { glitchText } from '../../../constants/text_util';
import { User } from '../../../model/user_status';
import { PRISON_COLORS, STORYLINE, SANITY_EFFECTS } from '../../../constants/GAME_CONSTANTS';
import { UserService } from '../../../services/user_services';

const GAME_REWARDS = {
  winner: {
    meritPoints: 50,
    sanity: 15,
    suspicionDecrease: 10
  },
  participant: {
    meritPoints: -10,
    sanity: -5,
    suspicionIncrease: 5
  }
};
  
  // Store active games
  const activeGames = new Map<string, KingsOfDiamondsGame>();
  
  export default new SlashCommand ({
    registerType: RegisterType.Global,
    data: new SlashCommandBuilder()
    .setName('king-of-diamonds')
    .setDescription('Play the King of Diamonds game from Alice in Borderland')
    .addSubcommand(subcommand =>
      subcommand
        .setName('start')
        .setDescription('Start a new King of Diamonds game')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('join')
        .setDescription('Join an active King of Diamonds game')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('rules')
        .setDescription('Display the rules of King of Diamonds')
    )as SlashCommandBuilder,
    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
         const user = await User.findOne({ discordId: interaction.user.id });
          if (!user) {
          await interaction.reply({
            content: 'You must be registered to use this command. Use `/register` first.',
            flags: [MessageFlags.Ephemeral]
          });
          return;
        }
        const suspicous = user.suspiciousLevel>50;
        if(suspicous){
          await interaction.reply('You are too suspicious to play this game. Try again later.');
          return;
        }
        const merit = user.meritPoints;
        if(merit<400){
          await interaction.reply('You dont have enough merit points to play this. You can play the previous game to earn more points');
          return;
        }
        user.survivalDays+=1;
        await user.save();
        const subcommand = interaction.options.getSubcommand();
      
        switch (subcommand) {
          case 'start':
            await handleGameStart(interaction);
            break;
          case 'join':
            await handleGameJoin(interaction);
            break;
          case 'rules':
            await handleShowRules(interaction);
            break;
        }
      },
  });
 
  async function handleGameStart(interaction: CommandInteraction) {
    const channelId = interaction.channelId;
  
    if (activeGames.has(channelId)) {
      await interaction.reply({
        content: 'There is already an active King of Diamonds game in this channel! Use `/king-of-diamonds join` to join it.',
        flags: [MessageFlags.Ephemeral]
      });
      return;
    }
  
    const game = new KingsOfDiamondsGame();
    activeGames.set(channelId, game);
  
    const user = await User.findOne({ discordId: interaction.user.id });
    const success = game.addPlayer({
      id: interaction.user.id,
      name: interaction.user.username,
      sanity: user?.sanity || 100
    });
  
    if (!success) {
      await interaction.reply({
        content: 'Failed to create the game. Please try again.',
        flags: [MessageFlags.Ephemeral]
      });
      activeGames.delete(channelId);
      return;
    }
  
    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('kod_join')
          .setLabel('Join Game')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('kod_start')
          .setLabel('Start Game')
          .setStyle(ButtonStyle.Success)
      );
  
    const embed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('King of Diamonds - Alice in Borderland')
      .setDescription('A new King of Diamonds game is starting! Click the button below to join.')
      .addFields(
        { name: 'Players', value: `1. ${interaction.user.username}`, inline: true },
        { name: 'Status', value: 'Waiting for players...', inline: true },
        { name: 'Minimum Players', value: '3', inline: true }
      )
      .setFooter({ text: 'The game will start when the host clicks "Start Game"' });
  
      let response;
      if (!interaction.replied && !interaction.deferred) {
        response = await interaction.reply({
          embeds: [embed],
          components: [row],
          fetchReply: true
        });
      } else {
        response = await interaction.followUp({
          embeds: [embed],
          components: [row],
          fetchReply: true
        });
      }
  
    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 300000 // 5 minutes
    });
  
    collector.on('collect', async (buttonInteraction: ButtonInteraction) => {
      if (buttonInteraction.customId === 'kod_join') {
        await handleJoinButton(buttonInteraction, game, embed);
      } else if (buttonInteraction.customId === 'kod_start') {
        if (buttonInteraction.user.id !== interaction.user.id) {
          await buttonInteraction.reply({
            content: 'Only the host can start the game!',
            ephemeral: true
          });
          return;
        }
  
        if (game.getPlayerCount() < 3) {
          await buttonInteraction.reply({
            content: 'You need at least 3 players to start the game!',
            ephemeral: true
          });
          return;
        }
  
        collector.stop('game_started');
        await buttonInteraction.update({
          components: []
        });
        
        // Start the game
        await startGame(buttonInteraction, game, channelId);
      }
    });
  
    collector.on('end', async (collected, reason) => {
      if (reason !== 'game_started') {
        activeGames.delete(channelId);
        await interaction.editReply({
          content: 'The game setup has timed out.',
          embeds: [],
          components: []
        });
      }
    });
  }
  
  async function handleJoinButton(
    interaction: ButtonInteraction,
    game: KingsOfDiamondsGame,
    embed: EmbedBuilder
  ) {
    const user = await User.findOne({ discordId: interaction.user.id });
    
    if (game.hasPlayer(interaction.user.id)) {
      await interaction.reply({
        content: 'You have already joined this game!',
        flags: [MessageFlags.Ephemeral]
      });
      return;
    }
  
    const success = game.addPlayer({
      id: interaction.user.id,
      name: interaction.user.username,
      sanity: user?.sanity || 100
    });
  
    if (!success) {
      await interaction.reply({
        content: 'Failed to join the game. The game might be full.',
        flags: [MessageFlags.Ephemeral]
      });
      return;
    }
    const players = game.getPlayers().map((player, i) => `${i + 1}. ${player.name}`).join('\n');
    embed.setFields(
      { name: 'Players', value: players, inline: true },
      { name: 'Status', value: 'Waiting for players...', inline: true },
      { name: 'Minimum Players', value: '3', inline: true }
    );
  
    if (!interaction.replied && !interaction.deferred) {
      await interaction.update({
        embeds: [embed]
      });
    } else {
      await interaction.followUp({
        embeds: [embed]
      });
    }
  }
  
  async function handleGameJoin(interaction: CommandInteraction) {
  try {
    const channelId = interaction.channelId;
    const game = activeGames.get(channelId);

    if (!game) {
      await interaction.reply({
        content: 'There is no active King of Diamonds game in this channel! Use `/king-of-diamonds start` to start one.',
        flags: [MessageFlags.Ephemeral]
      });
      return;
    }

    if (game.hasPlayer(interaction.user.id)) {
      await interaction.reply({
        content: 'You have already joined this game!',
        flags: [MessageFlags.Ephemeral]
      });
      return;
    }

    const user = await User.findOne({ discordId: interaction.user.id });
    if (!user) {
      await interaction.reply({
        content: 'You must be registered to join the game. Use `/register` first.',
        flags: [MessageFlags.Ephemeral]
      });
      return;
    }

    const success = game.addPlayer({
      id: interaction.user.id,
      name: interaction.user.username,
      sanity: user.sanity
    });

    if (!success) {
      await interaction.reply({
        content: 'Failed to join the game. The game might be full or already started.',
        flags: [MessageFlags.Ephemeral]
      });
      return;
    }

    await interaction.reply({
      content: `You've joined the King of Diamonds game! Wait for the host to start the game.`,
      flags: [MessageFlags.Ephemeral]
    });
  } catch (error) {
    console.error('Error in handleGameJoin:', error);
    await interaction.reply({
      content: 'An error occurred while trying to join the game.',
      flags: [MessageFlags.Ephemeral]
    });
  }
}
  
  async function handleShowRules(interaction: CommandInteraction) {
    const embed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('King of Diamonds - Rules')
      .setDescription('Welcome to the ultimate test of wit and strategy, where your decisions determine your fate!')
      .addFields(
        { 
          name: 'Basic Rules', 
          value: '- Select a number between 0 and 100\n- At the end of each round, all chosen numbers are averaged and multiplied by 0.8\n- The player whose selected number is closest to the calculated product wins the round\n- The winner gets no point deductions while the losers lose a point\n- Any player who accumulates a score of -10 is eliminated\n- Last player standing wins!' 
        },
        {
          name: 'Special Rules',
          value: '- If all players select the same number, everyone receives a deduction\n- New rules are added as players are eliminated!'
        }
      );
  
    await interaction.reply({
      embeds: [embed],
      flags: [MessageFlags.Ephemeral]
    });
  }
  
  async function startGame(
    interaction: ButtonInteraction,
    game: KingsOfDiamondsGame,
    channelId: string
  ) {
    game.startGame();

    const introEmbed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('King of Diamonds - Game Started')
      .setDescription('Welcome to the ultimate test of wit and strategy, where your decisions determine your fate!')
      .addFields(
        { name: 'Players', value: game.getPlayers().map(p => p.name).join('\n'), inline: true },
        { name: 'Round', value: '1', inline: true }
      );
    
    await interaction.followUp({
      embeds: [introEmbed]
    });
    
    await startRound(interaction, game, channelId);
  }
  
  export async function startRound(
    interaction: ButtonInteraction | CommandInteraction,
    game: KingsOfDiamondsGame,
    channelId: string
) {
    let buttonCollector: InteractionCollector<any> | null = null;
    
    try {
        await game.startRound();
        const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle(`King of Diamonds - Round ${game.getRound()}`)
        .setDescription('Make your selection!')
        .addFields(
            { name: 'Time Remaining', value: '30 seconds', inline: true },
            { name: 'Players', value: game.getActivePlayers().map(p => `${p.name} (${p.score})`).join('\n'), inline: true }
        );

    const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('kod_select_number')
                .setLabel('Select Your Number')
                .setStyle(ButtonStyle.Primary)
        );

    const response = await interaction.followUp({
        embeds: [embed],
        components: [row]
    });

    buttonCollector = response.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 30000
    });

    buttonCollector.on('error', async (error) => {
        console.error('Collector error:', error);
        await safeInteractionUpdate(interaction, {
            content: 'An error occurred during the game round.',
            components: []
        });
    });

    buttonCollector.on('collect', async (i: ButtonInteraction) => {
        if (i.customId === 'kod_select_number') {
            const player = game.getPlayer(i.user.id);
            
            if (!player) {
                await i.reply({
                    content: 'You are not part of this game!',
                    flags: MessageFlags.Ephemeral
                });
                return;
            }

            if (player.hasSelected) {
                await i.reply({
                    content: 'You have already made your selection for this round!',
                    flags: MessageFlags.Ephemeral
                });
                return;
            }

            await showNumberSelectionModal(i);
        }
    });

    const modalFilter = (i: ModalSubmitInteraction) => i.customId === 'kod_number_select' && game.hasPlayer(i.user.id);

    const modalHandler = async (modal: any) => {
        if (!modal.isModalSubmit()) return;
        if (!modalFilter(modal)) return;

        const number = parseInt(modal.fields.getTextInputValue('selected_number'));

        if (isNaN(number) || number < 0 || number > 100) {
            await modal.reply({
                content: 'Please enter a valid number between 0 and 100!',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        const player = game.getPlayer(modal.user.id);
        if (!player || player.hasSelected) return;

        if (player.sanity < 30) {
            const glitched = glitchText('Your hands are shaking... you can barely focus...');
            await modal.reply({
                content: glitched,
                flags: MessageFlags.Ephemeral
            });

            const actualNumber = Math.random() < 0.7 ? number : Math.floor(Math.random() * 101);
            game.selectNumber(modal.user.id, actualNumber);

            setTimeout(async () => {
                await modal.followUp({
                    content: glitchText(`You selected: ${actualNumber}`),
                    flags: MessageFlags.Ephemeral
                });
            }, 1500);
        } else {
            game.selectNumber(modal.user.id, number);
            await modal.reply({
                content: `You selected: ${number}`,
                flags: MessageFlags.Ephemeral
            });
        }

        const selectedPlayers = game.getActivePlayers()
            .map(p => `${p.name} (${p.score})${p.hasSelected ? ' ✓' : ''}`)
            .join('\n');

        embed.setFields(
            { name: 'Time Remaining', value: 'Waiting for players...', inline: true },
            { name: 'Players', value: selectedPlayers, inline: true }
        );

        await response.edit({
            embeds: [embed]
        });

        if (game.allPlayersSelected()) {
            if (buttonCollector) {
                buttonCollector.stop('all_selected');
            }
        }
    };

    interaction.client.on('interactionCreate', modalHandler);
    buttonCollector.on('end', async () => {
        interaction.client.removeListener('interactionCreate', modalHandler);
        await processRoundResults(interaction, game, channelId);
    });
    } catch (error) {
        console.error('Error in startRound:', error);
        if (buttonCollector) {
            await cleanupCollector(buttonCollector);
        }
        await safeInteractionUpdate(interaction, {
            content: 'An error occurred while starting the round.',
            components: []
        });
    }
}

async function showNumberSelectionModal(interaction: ButtonInteraction | CommandInteraction) {
    const modal = new ModalBuilder()
        .setCustomId('kod_number_select')
        .setTitle('Select Your Number')
        .addComponents(
            new ActionRowBuilder<TextInputBuilder>()
                .addComponents(
                    new TextInputBuilder()
                        .setCustomId('selected_number')
                        .setLabel('Enter a number between 0 and 100')
                        .setStyle(TextInputStyle.Short)
                        .setMinLength(1)
                        .setMaxLength(3)
                        .setPlaceholder('Enter your number here...')
                        .setRequired(true)
                )
        );

    await interaction.showModal(modal);
}

  async function processRoundResults(
    interaction: ButtonInteraction | CommandInteraction,
    game: KingsOfDiamondsGame,
    channelId: string
  ) {
    let results = game.evaluateRound();
    
    if (!results) {
      game.assignRandomNumbers();
      results = game.evaluateRound();
      
      if (!results) {
        await interaction.followUp({
          content: 'Error processing round results.',
        });
        return;
      }
    }
    
    // Display results
    const resultsEmbed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle(`King of Diamonds - Round ${game.getRound()} Results`)
      .setDescription(results.message)
      .addFields(
        { name: 'Player Choices', value: results.choices.map(c => `${c.name}: ${c.number}`).join('\n'), inline: true },
        { name: 'Regal\'s Number', value: results.regalsNumber.toString(), inline: true },
        { name: 'Scores', value: game.getActivePlayers().map(p => `${p.name}: ${p.score}`).join('\n'), inline: true }
      );

    const components: ActionRowBuilder<ButtonBuilder>[] = [];
    
    if (game.getPhase() === 1 && results.winners.length > 0) {
      const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('kod_reduce_life')
            .setLabel('Reduce Player Life')
            .setStyle(ButtonStyle.Danger)
        );
      components.push(row);
    }
    
    if (game.getPhase() === 2 && !game.allPlayersSelected()) {
      const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('kod_form_team')
            .setLabel('Form Team')
            .setStyle(ButtonStyle.Primary)
        );
      components.push(row);
    }
    
    await interaction.followUp({
      embeds: [resultsEmbed],
      components
    });

    if (components.length > 0) {
      const collector = interaction.channel?.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 30000
      });

      collector?.on('collect', async (i: ButtonInteraction) => {
        if (i.customId === 'kod_reduce_life' && results.winners.includes(i.user.id)) {
          await handleLifeReduction(i, game);
        } 
        else if (i.customId === 'kod_form_team' && game.getActivePlayers().some(p => p.id === i.user.id)) {
          await handleTeamFormation(i, game);
        }
      });
    }
    
    const eliminatedPlayers = game.checkForEliminations();
    
    if (eliminatedPlayers.length > 0) {
      const eliminationEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('Player Eliminated!')
        .setDescription(`${eliminatedPlayers.map(p => p.name).join(', ')} has been eliminated!`);
      
      await interaction.followUp({
        embeds: [eliminationEmbed]
      });
      
      if (game.shouldAddNewRule()) {
        const newRule = game.addNewRule();
        
        const ruleEmbed = new EmbedBuilder()
          .setColor('#FF0000')
          .setTitle('New Rule Added!')
          .setDescription(newRule);
        
        await interaction.followUp({
          embeds: [ruleEmbed]
        });
      }
    }
    
    if (game.isGameOver()) {
      const winner = game.getWinner();
      const losers = game.getPlayers().filter(p => p.id !== winner?.id);
      
      if (winner) {
        // Update winner's stats
        const winnerUser = await User.findOne({ discordId: winner.id });
        if(winnerUser){
          winnerUser.completedAllPuzzles = true;
          await winnerUser.save();
        }
        if (winnerUser) {
          await UserService.updateUserStats(winner.id, {
            meritPoints: winnerUser.meritPoints + GAME_REWARDS.winner.meritPoints,
            sanity: Math.min(winnerUser.sanity + GAME_REWARDS.winner.sanity, 100),
            suspiciousLevel: Math.max(winnerUser.suspiciousLevel - GAME_REWARDS.winner.suspicionDecrease, 0),
            totalGamesPlayed: winnerUser.totalGamesPlayed + 1,
            totalGamesWon: winnerUser.totalGamesWon + 1,
            currentStreak: winnerUser.currentStreak + 1
          });
        }
    
          for (const loser of losers) {
            const loserUser = await User.findOne({ discordId: loser.id });
            if (loserUser) {
              await UserService.updateUserStats(loser.id, {
                meritPoints: Math.max(loserUser.meritPoints + GAME_REWARDS.participant.meritPoints, 0),
                sanity: Math.max(loserUser.sanity + GAME_REWARDS.participant.sanity, 0),
                suspiciousLevel: Math.min(loserUser.suspiciousLevel + GAME_REWARDS.participant.suspicionIncrease, 100),
                totalGamesPlayed: loserUser.totalGamesPlayed + 1,
                currentStreak: 0
              });
            }
          }
    
          const gameOverEmbed = new EmbedBuilder()
            .setColor(PRISON_COLORS.success as ColorResolvable)
            .setTitle('👑 Game Over - King of Diamonds')
            .setDescription(`${winner.name} has won the game!`)
            .addFields(
              { 
                name: '🏆 Winner Rewards', 
                value: `• Merit Points: +${GAME_REWARDS.winner.meritPoints}\n• Sanity: +${GAME_REWARDS.winner.sanity}\n• Suspicion: -${GAME_REWARDS.winner.suspicionDecrease}\n• Win Streak: ${winnerUser?.currentStreak ?? 1}`,
                inline: true 
              },
              { 
                name: '⚠️ Other Players', 
                value: `• Merit Points: ${GAME_REWARDS.participant.meritPoints}\n• Sanity: ${GAME_REWARDS.participant.sanity}\n• Suspicion: +${GAME_REWARDS.participant.suspicionIncrease}\n• Streak Reset`,
                inline: true 
              }
            )
            .setFooter({ text: 'The game has concluded. Thank you for playing!' });
            
      await interaction.followUp({ embeds: [gameOverEmbed] });
    }
    
    activeGames.delete(channelId);
    return;
    }
    
    setTimeout(() => {
      startRound(interaction, game, channelId);
    }, 30000);
  }

  async function handleLifeReduction(interaction: ButtonInteraction, game: KingsOfDiamondsGame) {
    const players = game.getActivePlayers().filter(p => p.id !== interaction.user.id);
    
    if (players.length === 0) {
      await interaction.reply({
        content: 'No players available to target!',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const row = new ActionRowBuilder<StringSelectMenuBuilder>()
      .addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('kod_life_target')
          .setPlaceholder('Select a player to reduce their score')
          .addOptions(
            players.map(p => ({
              label: p.name,
              value: p.id,
              description: `Score: ${p.score}`
            }))
          )
      );

    await interaction.reply({
      content: 'Select a player to reduce their extra score:',
      components: [row],
      ephemeral: true
    });

    const collector = interaction.channel?.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      filter: (i: StringSelectMenuInteraction) => 
        i.customId === 'kod_life_target' && i.user.id === interaction.user.id,
      time: 30000,
      max: 1
    });

    collector?.on('collect', async (i: StringSelectMenuInteraction) => {
      const targetId = i.values[0];
      const success = game.reducePlayerLife(targetId);
      const target = game.getPlayer(targetId);

      if (success && target) {
        if (!i.replied && !i.deferred) {
          await i.update({
            content: `Successfully reduced ${target.name}'s score! They now have ${target.score} score remaining.`,
            components: []
          });
        } else {
          await i.followUp({
            content: `Successfully reduced ${target.name}'s extra life! They now have ${target.score} score remaining.`,
            components: [],
            ephemeral: true
          });
        }
      } else {
        await i.update({
          content: 'Failed to reduce player\'s score. They might not have any extra scores left.',
          components: []
        });
      }
    });
  }

  async function handleTeamFormation(interaction: ButtonInteraction, game: KingsOfDiamondsGame) {
    const availablePlayers = game.getActivePlayers().filter(p => 
      p.id !== interaction.user.id && !p.teamMate
    );

    if (availablePlayers.length === 0) {
      await interaction.reply({
        content: 'No available players to team up with!',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const row = new ActionRowBuilder<StringSelectMenuBuilder>()
      .addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('kod_team_target')
          .setPlaceholder('Select a player to team up with')
          .addOptions(
            availablePlayers.map(p => ({
              label: p.name,
              value: p.id,
              description: `Current score: ${p.score}`
            }))
          )
      );

    await interaction.reply({
      content: 'Select a player to team up with:',
      components: [row],
      flags: MessageFlags.Ephemeral
    });

    const collector = interaction.channel?.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      filter: (i: StringSelectMenuInteraction) => 
        i.customId === 'kod_team_target' && i.user.id === interaction.user.id,
      time: 30000,
      max: 1
    });

    collector?.on('collect', async (i: StringSelectMenuInteraction) => {
      const targetId = i.values[0];
      const modal = new ModalBuilder()
        .setCustomId(`kod_team_number_${targetId}`)
        .setTitle('Team Number Selection')
        .addComponents(
          new ActionRowBuilder<TextInputBuilder>()
            .addComponents(
              new TextInputBuilder()
                .setCustomId('team_number')
                .setLabel('Enter your team\'s number (0-100)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
            )
        );

      await i.showModal(modal);

      const modalFilter = (mi: ModalSubmitInteraction) => 
        mi.customId === `kod_team_number_${targetId}` && mi.user.id === interaction.user.id;

      try {
        const modalInteraction = await interaction.awaitModalSubmit({
          filter: modalFilter,
          time: 60000
        });

        const number = parseInt(modalInteraction.fields.getTextInputValue('team_number'));
        if (isNaN(number) || number < 0 || number > 100) {
          await modalInteraction.reply({
            content: 'Please enter a valid number between 0 and 100!',
            flags: MessageFlags.Ephemeral
          });
          return;
        }

        const success = game.formTeam(interaction.user.id, targetId, number);
        if (success) {
          const teammate = game.getPlayer(targetId);
          await modalInteraction.reply({
            content: `Successfully formed a team with ${teammate?.name}! Your team number is ${number}.`,
            flags: MessageFlags.Ephemeral
          });
        } else {
          await modalInteraction.reply({
            content: 'Failed to form team. The player might already be in a team.',
            flags: MessageFlags.Ephemeral
          });
        }
      } catch (error) {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: 'The game setup has timed out.',
            embeds: [],
            components: [],
            ephemeral: true
          });
        } else {
          await interaction.editReply({
            content: 'The game setup has timed out.',
            embeds: [],
            components: []
          });
        }
      }
    });
  }
  
  // For handling the button interactions
  export async function handleKingsOfDiamondsButton(interaction: ButtonInteraction) {
    const channelId = interaction.channelId;
    const game = activeGames.get(channelId);
    
    if (!game) {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: 'The game has ended or doesnt exist anymore.',
          embeds: [],
          components: [],
          ephemeral: true
        });
      } else {
        await interaction.editReply({
          content: 'The game has ended or doesnt exist anymore.',
          embeds: [],
          components: []
        });
      }
      return;
    }
    
  }

function getColorFromPrisonColor(colorKey: keyof typeof PRISON_COLORS): ColorResolvable {
    return PRISON_COLORS[colorKey] as ColorResolvable;
}

async function safeInteractionUpdate(interaction: ButtonInteraction | CommandInteraction, data: any) {
  try {
    if (!interaction.deferred && !interaction.replied) {
      if ('deferUpdate' in interaction) {
        await interaction.deferUpdate();
      } else {
        await interaction.deferReply();
      }
    }
    
    if ('editReply' in interaction) {
      await interaction.editReply(data);
    }
  } catch (error) {
    console.error('Error updating interaction:', error);
    try {
      if ('followUp' in interaction) {
        await interaction.followUp({
          content: 'An error occurred while processing your request.',
          ephemeral: true
        });
      }
    } catch (followUpError) {
      console.error('Error sending follow-up:', followUpError);
    }
  }
}

async function cleanupCollector(collector: InteractionCollector<any>) {
  try {
    collector.stop();
  } catch (error) {
    console.error('Error cleaning up collector:', error);
  }
}
