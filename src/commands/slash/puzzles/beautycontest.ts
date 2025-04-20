// src/commands/kingsOfDiamonds.ts
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
    ColorResolvable
  } from 'discord.js';
import { KingsOfDiamondsGame } from '../../../functions/beauty_context_game';
import { glitchText } from '../../../constants/text_util';
import { User } from '../../../model/user_status';
import { PRISON_COLORS, STORYLINE } from '../../../constants/GAME_CONSTANTS';
  
  // Store active games
  const activeGames = new Map<string, KingsOfDiamondsGame>();
  
  export default new SlashCommand ({
    registerType: RegisterType.Guild,
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
      await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
         const user = await User.findOne({ discordId: interaction.user.id });
                if (!user) {
                    await interaction.editReply({
                        content: 'You must be registered to use this command. Use `/register` first.',
                    });
                    return;
                }
                const merit = user.meritPoints;
        if(merit<200){
            await interaction.editReply('You dont have enough merit points to play this. You can play the previous game to earn more points');
            return;
        }

        const requiredPuzzles = ['puzzles1', 'tunnel1', 'matchingpairs', 'UNO'];
        const completedPuzzles = user.puzzleProgress.filter(p => requiredPuzzles.includes(p.puzzleId) && p.completed);
        
        // Add type guard for storyline entries
        function isStorylineEntry(value: any): value is { name: string; description: string; flavorText: string } {
            return value && typeof value === 'object' && 'name' in value;
        }

        // Update the progress display with proper type checking
        // if (completedPuzzles.length < requiredPuzzles.length) {
        //     await interaction.reply({ 
        //         embeds: [new EmbedBuilder()
        //             .setColor(getColorFromPrisonColor('danger'))
        //             .setTitle('⚠️ Access Denied')
        //             .setDescription('The Judas Protocol requires mastery of simpler trials first.')
        //             .addFields({
        //                 name: 'Required Trials',
        //                 value: requiredPuzzles.map(id => {
        //                     const completed = user.puzzleProgress.find(p => p.puzzleId === id)?.completed;
        //                     const storylineEntry = STORYLINE[id as keyof typeof STORYLINE];
        //                     const name = isStorylineEntry(storylineEntry) ? storylineEntry.name : id;
        //                     return `${completed ? '✅' : '❌'} ${name}`;
        //                 }).join('\n')
        //             })],
        //         ephemeral: true
        //     });
        //     return;
        // }

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
  
    // Check if there's already an active game in this channel
    if (activeGames.has(channelId)) {
      await interaction.editReply({
        content: 'There is already an active King of Diamonds game in this channel! Use `/king-of-diamonds join` to join it.',
      });
      return;
    }
  
    // Create a new game
    const game = new KingsOfDiamondsGame();
    activeGames.set(channelId, game);
  
    // Add the creator as the first player
    const user = await User.findOne({ discordId: interaction.user.id });
    const success = game.addPlayer({
      id: interaction.user.id,
      name: interaction.user.username,
      sanity: user?.sanity || 100
    });
  
    if (!success) {
      await interaction.editReply({
        content: 'Failed to create the game. Please try again.',
      });
      activeGames.delete(channelId);
      return;
    }
  
    // Create the join button
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
  
    const res = await interaction.reply({
      embeds: [embed],
      components: [row],
    });
    const response = await res.fetch();
    // Create a collector for the join button
    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 300000 // 5 minutes
    });
  
    collector.on('collect', async (buttonInteraction: ButtonInteraction) => {
      if (buttonInteraction.customId === 'kod_join') {
        await handleJoinButton(buttonInteraction, game, embed);
      } else if (buttonInteraction.customId === 'kod_start') {
        // Only the creator can start the game
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
    
    // Check if player is already in the game
    if (game.hasPlayer(interaction.user.id)) {
      await interaction.editReply({
        content: 'You have already joined this game!',
      });
      return;
    }
  
    // Add player to the game
    const success = game.addPlayer({
      id: interaction.user.id,
      name: interaction.user.username,
      sanity: user?.sanity || 100
    });
  
    if (!success) {
      await interaction.editReply({
        content: 'Failed to join the game. The game might be full.',
      });
      return;
    }
  
    // Update the embed with the new player list
    const players = game.getPlayers().map((player, i) => `${i + 1}. ${player.name}`).join('\n');
    embed.setFields(
      { name: 'Players', value: players, inline: true },
      { name: 'Status', value: 'Waiting for players...', inline: true },
      { name: 'Minimum Players', value: '3', inline: true }
    );
  
    await interaction.reply({
      embeds: [embed]
    });
  }
  
  async function handleGameJoin(interaction: CommandInteraction) {
    await interaction.deferReply({flags: [MessageFlags.Ephemeral]});
    const channelId = interaction.channelId;
    const game = activeGames.get(channelId);
  
    if (!game) {
      await interaction.editReply({
        content: 'There is no active King of Diamonds game in this channel! Use `/king-of-diamonds start` to start one.',
      });
      return;
    }
  
    if (game.hasPlayer(interaction.user.id)) {
      await interaction.editReply({
        content: 'You have already joined this game!',
      });
      return;
    }
  
    const user = await User.findOne({ discordId: interaction.user.id });
    const success = game.addPlayer({
      id: interaction.user.id,
      name: interaction.user.username,
      sanity: user?.sanity || 100
    });
  
    if (!success) {
      await interaction.editReply({
        content: 'Failed to join the game. The game might be full or already started.',
      });
      return;
    }
  
    await interaction.editReply({
      content: `You've joined the King of Diamonds game! Wait for the host to start the game.`,
    });
  
    // Update the game embed if possible
    // (This would require storing the original message, which is outside the scope of this example)
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
    // Initialize the game
    game.startGame();
    
    // Show the game introduction
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
    
    // Start the first round
    await startRound(interaction, game, channelId);
  }
  
  export async function startRound(
    interaction: ButtonInteraction | CommandInteraction,
    game: KingsOfDiamondsGame,
    channelId: string
) {
    await game.startRound();
    const cur_rule = game.getRules();
    const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle(`King of Diamonds - Round ${game.getRound()}`)
        .setDescription(`Make your selection!\nRules:${cur_rule}`)
        .addFields(
            { name: 'Time Remaining', value: '30 seconds', inline: true },
            { name: 'Players', value: game.getActivePlayers().map(p => `${p.name} (${p.score})`).join('\n'), inline: true }
        );

    // Create select number button
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

    // Button collector for showing the modal
    const buttonCollector = response.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 30000
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

    // Modal submit handler
    const modalFilter = (i: ModalSubmitInteraction) => i.customId === 'kod_number_select' && game.hasPlayer(i.user.id);

    // Store the modal event handler in a variable so it can be removed later
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

        // Handle low sanity effects
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

        // Update embed to show who has selected
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
            buttonCollector.stop('all_selected');
        }
    };

    interaction.client.on('interactionCreate', modalHandler);

    // Optionally, you may want to remove the event listener after the round ends to avoid memory leaks.
    buttonCollector.on('end', async () => {
        interaction.client.removeListener('interactionCreate', modalHandler);
        await processRoundResults(interaction, game, channelId);
    });
}
  
  // Replace the createNumberSelectionButtons function with:
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
      // Some players didn't select a number, assign random numbers
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
    
    // Phase 1: Add life reduction option for winners
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
    
    // Phase 2: Add team formation option
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

    // Set up collectors for the new buttons
    if (components.length > 0) {
      const collector = interaction.channel?.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 30000
      });

      collector?.on('collect', async (i: ButtonInteraction) => {
        // Verify the interaction is from a winner for life reduction
        if (i.customId === 'kod_reduce_life' && results.winners.includes(i.user.id)) {
          await handleLifeReduction(i, game);
        } 
        // Verify the interaction is from an active player for team formation
        else if (i.customId === 'kod_form_team' && game.getActivePlayers().some(p => p.id === i.user.id)) {
          await handleTeamFormation(i, game);
        }
      });
    }
    
    // Check for eliminated players and continue game
    const eliminatedPlayers = game.checkForEliminations();
    
    if (eliminatedPlayers.length > 0) {
      const eliminationEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('Player Eliminated!')
        .setDescription(`${eliminatedPlayers.map(p => p.name).join(', ')} has been eliminated!`);
      
      await interaction.followUp({
        embeds: [eliminationEmbed]
      });
      
      // Check if a new rule should be introduced
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
    
    // Check if game is over
    if (game.isGameOver()) {
      const gameOverEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('Game Over!')
        .setDescription(`${game.getWinner()?.name || 'No one'} wins the game!`);
      
      await interaction.followUp({
        embeds: [gameOverEmbed]
      });
      
      // Clean up the game
      activeGames.delete(channelId);
      return;
    }
    
    // Start the next round
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
          .setPlaceholder('Select a player to reduce their life')
          .addOptions(
            players.map(p => ({
              label: p.name,
              value: p.id,
              description: `Extra lives: ${p.extraLives}`
            }))
          )
      );

    await interaction.reply({
      content: 'Select a player to reduce their extra life:',
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
        await i.update({
          content: `Successfully reduced ${target.name}'s extra life! They now have ${target.extraLives} lives remaining.`,
          components: []
        });
      } else {
        await i.update({
          content: 'Failed to reduce player\'s life. They might not have any extra lives left.',
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
        await i.editReply({
          content: 'Team formation timed out.',
          components: []
        });
      }
    });
  }
  
  // For handling the button interactions
  export async function handleKingsOfDiamondsButton(interaction: ButtonInteraction) {
    const channelId = interaction.channelId;
    const game = activeGames.get(channelId);
    
    if (!game) {
      await interaction.reply({
        content: 'This game has ended or does not exist anymore.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }
    
    // Handle button interactions specific to this command
    // This is called from the main button handler in index.ts
  }

function getColorFromPrisonColor(colorKey: keyof typeof PRISON_COLORS): ColorResolvable {
    return PRISON_COLORS[colorKey] as ColorResolvable;
}
