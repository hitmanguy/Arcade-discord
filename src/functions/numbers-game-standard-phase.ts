import { 
  TextChannel, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ComponentType, 
  ButtonInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  InteractionType,
  Interaction,
  Collection
} from 'discord.js';
import { GameState, Player } from './numbers-game-state';
import { User } from '../model/user_status';
import { STORYLINE, PRISON_COLORS } from '../constants/GAME_CONSTANTS';

export async function runStandardRound(channel: TextChannel, gameState: GameState): Promise<void> {
  const alivePlayers = gameState.getAlivePlayers();
  const playerSanity = new Map(alivePlayers.map(p => [p.id, p.sanityLevel]));

  // Reset current numbers
  alivePlayers.forEach(p => p.currentNumber = null);

  // Add sanity effects to displayed numbers
  const playerSanityMap = new Map<string, number>();
  for (const player of alivePlayers) {
    const user = await User.findOne({ discordId: player.id });
    if (user) {
      playerSanityMap.set(player.id, user.sanity);
      const sanityEffects = gameState.getSanityEffects(player.id);
      if (sanityEffects.distortedVision) {
        player.currentNumber = player.currentNumber !== null ? 
          Math.max(1, Math.min(100, player.currentNumber + 
            (Math.random() < (sanityEffects.paranoiaLevel * 0.2) ? 
              Math.floor(Math.random() * 3) - 1 : 0)
          )) : null;
      }
    }
  }

  // Create team coordination opportunities based on sanity
  const teamButtons = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('signal_intent')
        .setLabel('Signal Intent')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('submit_number')
        .setLabel('Submit Number')
        .setStyle(ButtonStyle.Primary)
    );

  // Get player sanity levels
  for (const player of alivePlayers) {
    const user = await User.findOne({ discordId: player.id });
    if (user) {
      playerSanityMap.set(player.id, user.sanity);
    }
  }

  // Register modal handler for number submission
  GameState.registerGlobalHandler(channel.client);
  GameState.registerModalHandler('number', async (interaction: Interaction) => {
    if (!interaction.isModalSubmit()) return;
    
    const playerId = interaction.customId.replace('number_modal_', '');
    const player = alivePlayers.find(p => p.id === playerId);
          
    if (!player) {
      await interaction.reply({ content: 'Error: Player not found.', ephemeral: true });
      return;
    }

    const numberInput = interaction.fields.getTextInputValue('number_input').trim();
    const num = parseInt(numberInput);
    const sanityLevel = playerSanityMap.get(player.id) || 100;

    if (isNaN(num)) {
      await interaction.reply({ 
        content: sanityLevel < 40 
          ? 'T̷h̷e̶ ̷n̶u̵m̷b̴e̷r̶s̷.̷.̷.̷ ̷t̷h̷e̷y̷ ̷r̷e̷j̷e̷c̷t̷ ̷y̷o̷u̷.̷.̷.'
          : 'Error: Please enter a valid number.',
        ephemeral: true 
      });
      return;
    }

    if (num < 1 || num > 100) {
      await interaction.reply({ 
        content: sanityLevel < 40
          ? 'O̷u̷t̷ ̷o̷f̷ ̷b̷o̷u̷n̷d̷s̷.̷.̷.̷ ̷t̷h̷e̷ ̷v̷o̷i̷d̷ ̷c̷a̷l̷l̷s̷.̷.̷.'
          : 'Error: Number must be between 1 and 100.',
        ephemeral: true 
      });
      return;
    }

    // Track submissions using player state
    if (player.currentNumber !== null) {
      await interaction.reply({ 
        content: sanityLevel < 40
          ? 'Y̷o̷u̷r̷ ̷c̷h̷o̷i̷c̷e̷ ̷i̷s̷ ̷s̷e̷a̷l̷e̷d̷.̷.̷.'
          : 'Error: You have already submitted a number.',
        ephemeral: true 
      });
      return;
    }

    player.currentNumber = num;
    await interaction.reply({ 
      content: sanityLevel < 40
        ? `T̷h̷e̷ ̷n̷u̷m̷b̷e̷r̷ ̷${num}̷ ̷e̷c̷h̷o̷e̷s̷ ̷i̷n̷ ̷y̷o̷u̷r̷ ̷m̷i̷n̷d̷.̷.̷.̷`
        : `Your number (${num}) has been submitted! Wait for other players...`,
      ephemeral: true 
    });

    // Check if all players have submitted
    const submittedCount = alivePlayers.filter(p => p.currentNumber !== null).length;
    if (submittedCount === alivePlayers.length) {
      await channel.send(
        sanityLevel < 40
          ? "T̷h̷e̷ ̷n̷u̷m̷b̷e̷r̷s̷ ̷c̷o̷n̷v̷e̷r̷g̷e̷.̷.̷."
          : "All players have submitted their numbers! Processing results..."
      );
    } else {
      const remaining = alivePlayers.length - submittedCount;
      await channel.send(
        sanityLevel < 40
          ? `${submittedCount}/${alivePlayers.length} m̷i̷n̷d̷s̷ ̷h̷a̷v̷e̷ ̷c̷h̷o̷s̷e̷n̷.̷.̷.̷ ${remaining} r̷e̷m̷a̷i̷n̷.̷.̷.̷`
          : `${submittedCount}/${alivePlayers.length} players have submitted. Waiting for ${remaining} more...`
      );
    }
  });

  // Start the round
  const roundEmbed = new EmbedBuilder()
    .setTitle(`🔢 Round ${gameState.currentRound} - Standard Protocol`)
    .setDescription(playerSanityMap.get(gameState.hostId)! < 40
      ? "C̷h̷o̷o̷s̷e̷ ̷y̷o̷u̷r̷ ̷n̷u̷m̷b̷e̷r̷.̷.̷.̷ ̷t̷h̷e̷ ̷a̷v̷e̷r̷a̷g̷e̷ ̷d̷e̷c̷i̷d̷e̷s̷ ̷y̷o̷u̷r̷ ̷f̷a̷t̷e̷.̷.̷."
      : `Choose a number between 1 and 100.\nThe player with the closest unique number to the average wins!`)
    .addFields(
      { name: 'Subjects', value: alivePlayers.map(p => {
          const sanity = playerSanityMap.get(p.id) || 100;
          return sanity < 40 
            ? `<@${p.id}> (${p.lives} ❤️) [S̷a̷n̷i̷t̷y̷:̷ ${sanity}%]`
            : `<@${p.id}> (${p.lives} ❤️)`;
        }).join('\n') 
      },
      { name: 'Instructions', value: playerSanityMap.get(gameState.hostId)! < 40
        ? "T̷h̷e̷ ̷b̷u̷t̷t̷o̷n̷s̷ ̷b̷e̷c̷k̷o̷n̷.̷.̷."
        : `Click your button below to submit your number!`
      }
    )
    .setColor(playerSanityMap.get(gameState.hostId)! < 30 ? PRISON_COLORS.danger : PRISON_COLORS.primary)
    .setFooter({ text: '30 seconds to choose a number' });

  // Add sanity effect warnings
  if (playerSanity.get(gameState.hostId)! < 50) {
    roundEmbed.addFields({
      name: 'Warning',
      value: 'Your perception may be distorted...'
    });
  }

  // Create buttons for each player
  const row = new ActionRowBuilder<ButtonBuilder>();
  alivePlayers.forEach(player => {
    const sanity = playerSanityMap.get(player.id) || 100;
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`submit_number_${player.id}`)
        .setLabel(sanity < 40 
          ? `Choose (${player.username}) [D̷i̷s̷t̷o̷r̷t̷e̷d̷]`
          : `Submit Number (${player.username})`)
        .setStyle(sanity < 30 ? ButtonStyle.Danger : ButtonStyle.Primary)
    );
  });

  const msg = await channel.send({ embeds: [roundEmbed], components: [row] });

  // Button collector for 30 seconds
  const collector = channel.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 30000,
    filter: (i: ButtonInteraction) => alivePlayers.some(p => i.customId === `submit_number_${p.id}` && i.user.id === p.id)
  });

  collector.on('collect', async (interaction: ButtonInteraction) => {
    const playerId = interaction.customId.replace('submit_number_', '');
    const player = alivePlayers.find(p => p.id === playerId);
    const sanityLevel = playerSanityMap.get(playerId) || 100;

    if (!player) {
      await interaction.reply({ 
        content: sanityLevel < 40
          ? 'Y̷o̷u̷r̷ ̷e̷x̷i̷s̷t̷e̷n̷c̷e̷ ̷i̷s̷ ̷d̷e̷n̷i̷e̷d̷.̷.̷.'
          : 'Error: Player not found.',
        ephemeral: true 
      });
      return;
    }

    if (player.currentNumber !== null) {
      await interaction.reply({ 
        content: sanityLevel < 40
          ? 'T̷h̷e̷ ̷n̷u̷m̷b̷e̷r̷s̷ ̷r̷e̷j̷e̷c̷t̷ ̷y̷o̷u̷r̷ ̷c̷h̷a̷n̷g̷e̷.̷.̷.'
          : 'You have already submitted your number.',
        ephemeral: true 
      });
      return;
    }

    // Show modal
    const modal = new ModalBuilder()
      .setCustomId(`number_modal_${playerId}`)
      .setTitle(sanityLevel < 40 ? 'C̷h̷o̷o̷s̷e̷ ̷Y̷o̷u̷r̷ ̷N̷u̷m̷b̷e̷r̷' : 'Submit Your Number')
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('number_input')
            .setLabel(sanityLevel < 40 
              ? 'E̷n̷t̷e̷r̷ ̷a̷ ̷n̷u̷m̷b̷e̷r̷ ̷(̷1̷-̷1̷0̷0̷)̷'
              : 'Enter a number between 1 and 100')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('e.g. 42')
            .setRequired(true)
        )
      );

    try {
      await interaction.showModal(modal);
    } catch (err) {
      await interaction.reply({ 
        content: sanityLevel < 40
          ? 'T̷h̷e̷ ̷v̷o̷i̷d̷ ̷r̷e̷j̷e̷c̷t̷s̷ ̷y̷o̷u̷r̷ ̷c̷h̷o̷i̷c̷e̷.̷.̷.'
          : 'Failed to show number input form. Please try again.',
        ephemeral: true 
      });
    }
  });

  collector.on('end', async () => {
    // Disable all buttons
    const disabledRow = new ActionRowBuilder<ButtonBuilder>();
    row.components.forEach(btn => 
      disabledRow.addComponents(ButtonBuilder.from(btn).setDisabled(true))
    );
    await msg.edit({ components: [disabledRow] });

    // Process results
    const results = await processStandardResults(channel, gameState);

    // Display results with sanity effects
    const resultsEmbed = new EmbedBuilder()
      .setTitle(`🔢 Round ${gameState.currentRound} Results`)
      .setDescription(playerSanityMap.get(gameState.hostId)! < 40
        ? `T̷h̷e̷ ̷a̷v̷e̷r̷a̷g̷e̷ ̷r̷e̷v̷e̷a̷l̷s̷:̷ ${results.average.toFixed(2)}`
        : `**Average: ${results.average.toFixed(2)}**`)
      .addFields(
        { name: 'Numbers Chosen', value: results.playerChoices }
      )
      .setColor(playerSanityMap.get(gameState.hostId)! < 30 ? PRISON_COLORS.danger : PRISON_COLORS.primary);

    if (results.winner) {
      resultsEmbed.addFields(
        { name: 'Victor', value: playerSanityMap.get(gameState.hostId)! < 40
          ? `<@${results.winner.id}> s̷u̷r̷v̷i̷v̷e̷s̷ ̷w̷i̷t̷h̷ ̷${results.winner.currentNumber}`
          : `<@${results.winner.id}> chose ${results.winner.currentNumber}`
        }
      );
    } else {
      resultsEmbed.addFields(
        { name: 'Victor', value: playerSanityMap.get(gameState.hostId)! < 40
          ? 'T̷h̷e̷ ̷v̷o̷i̷d̷ ̷c̷l̷a̷i̷m̷s̷ ̷a̷l̷l̷.̷.̷.'
          : 'No winner this round (no unique numbers or no submissions)'
        }
      );
    }

    await channel.send({ embeds: [resultsEmbed] });

    // If there's a winner, let them choose who loses a life
    if (results.winner) {
      await handleLifeReduction(channel, gameState, results.winner);
    }
  });
}

async function processStandardResults(channel: TextChannel, gameState: GameState): Promise<{
  average: number,
  playerChoices: string,
  winner: Player | null
}> {
  const alivePlayers = gameState.getAlivePlayers();
  
  // Validate submissions with sanity effects
  const playersWithNumbers = alivePlayers.filter(p => {
    const isValid = p.currentNumber !== null && 
                   !isNaN(p.currentNumber) && 
                   p.currentNumber >= 1 && 
                   p.currentNumber <= 100;
    
    if (!isValid && p.currentNumber !== null) {
      p.currentNumber = null;
    }
    return isValid;
  });
  
  if (playersWithNumbers.length === 0) {
    return {
      average: 0,
      playerChoices: "No valid numbers submitted",
      winner: null
    };
  }
  
  // Calculate average with sanity effects
  const average = gameState.calculateAverage() || 0;
  
  // Get unique numbers with potential distortions
  const uniqueNumbers = gameState.getUniqueNumbers();
  
  // Find unique numbers (not duplicated)
  const uniqueNumberEntries = Array.from(uniqueNumbers.entries())
    .filter(([_, players]) => players.length === 1)
    .map(([number, players]) => ({
      number,
      player: players[0],
      difference: Math.abs(number - average)
    }));
  
  // Sort by difference to find closest to average
  uniqueNumberEntries.sort((a, b) => a.difference - b.difference);
  
  // Format player choices with sanity effects
  const playerChoices = alivePlayers.map(p => {
    const numStr = p.currentNumber !== null ? `${p.currentNumber}` : "❌ No submission";
    const playersWithSameNumber = p.currentNumber !== null ? uniqueNumbers.get(p.currentNumber) : undefined;
    const dupStr = p.currentNumber !== null && playersWithSameNumber && playersWithSameNumber.length > 1 ? " (duplicate)" : "";
    
    // Apply visual distortion based on player's sanity
    return p.sanityLevel && p.sanityLevel < 40
      ? `<@${p.id}>: ${gameState.applyVisualDistortion(numStr + dupStr, p.sanityLevel)}`
      : `<@${p.id}>: ${numStr}${dupStr}`;
  }).join('\n');
  
  return {
    average,
    playerChoices,
    winner: uniqueNumberEntries.length > 0 ? uniqueNumberEntries[0].player : null
  };
}

async function handleLifeReduction(channel: TextChannel, gameState: GameState, winner: Player): Promise<void> {
  const alivePlayers = gameState.getAlivePlayers().filter(p => p.id !== winner.id);

  // Create buttons for each possible target
  const buttons = alivePlayers.map(p =>
    new ButtonBuilder()
      .setCustomId(`eliminate_${p.id}`)
      .setLabel(p.sanityLevel && p.sanityLevel < 40
        ? `${p.username} [D̷i̷s̷t̷o̷r̷t̷e̷d̷] (${p.lives} ❤️)`
        : `${p.username} (${p.lives} ❤️)`)
      .setStyle(p.sanityLevel && p.sanityLevel < 30 ? ButtonStyle.Danger : ButtonStyle.Primary)
  );

  // Discord allows max 5 buttons per row
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  for (let i = 0; i < buttons.length; i += 5) {
    rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(buttons.slice(i, i + 5)));
  }

  // Apply sanity effects to messages
  const chooseEmbed = new EmbedBuilder()
    .setTitle(`🎯 Round ${gameState.currentRound} - Remove a Life`)
    .setDescription(winner.sanityLevel && winner.sanityLevel < 40
      ? `<@${winner.id}>, c̷h̷o̷o̷s̷e̷ ̷y̷o̷u̷r̷ ̷v̷i̷c̷t̷i̷m̷.̷.̷.̷`
      : `<@${winner.id}>, choose a player to lose 1 life:`)
    .setColor(winner.sanityLevel && winner.sanityLevel < 30 ? PRISON_COLORS.danger : PRISON_COLORS.primary)
    .setFooter({ text: 'You have 20 seconds to choose' });

  const sentMsg = await channel.send({ embeds: [chooseEmbed], components: rows });

  // Create a button collector
  const collector = channel.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 20000,
    filter: (i: ButtonInteraction) => i.user.id === winner.id
  });

  collector.on('collect', async (interaction: ButtonInteraction) => {
    await interaction.deferUpdate();

    const targetId = interaction.customId.replace('eliminate_', '');
    const target = alivePlayers.find(p => p.id === targetId);

    if (!target) {
      await channel.send(winner.sanityLevel && winner.sanityLevel < 40
        ? `<@${winner.id}> T̷h̷e̷ ̷v̷o̷i̷d̷ ̷h̷a̷s̷ ̷a̷l̷r̷e̷a̷d̷y̷ ̷c̷l̷a̷i̷m̷e̷d̷ ̷t̷h̷e̷m̷.̷.̷.̷`
        : `<@${winner.id}> That player is not in the game or already eliminated.`);
      return;
    }

    await gameState.reduceLife(target.id);
    collector.stop();

    // Disable all buttons after selection
    const disabledRows = rows.map(row => {
      const newRow = new ActionRowBuilder<ButtonBuilder>();
      row.components.forEach(btn => 
        newRow.addComponents(ButtonBuilder.from(btn as ButtonBuilder).setDisabled(true))
      );
      return newRow;
    });

    // Announce result with sanity effects
    const resultEmbed = new EmbedBuilder()
      .setTitle(winner.sanityLevel && winner.sanityLevel < 40 ? `💔 L̷i̷f̷e̷ ̷D̷r̷a̷i̷n̷e̷d̷` : `💔 Life Reduced`)
      .setDescription(winner.sanityLevel && winner.sanityLevel < 40
        ? `<@${target.id}> s̷u̷f̷f̷e̷r̷s̷.̷.̷.̷ ${target.lives} ❤️ r̷e̷m̷a̷i̷n̷.̷.̷.̷`
        : `<@${target.id}> lost a life and now has ${target.lives} ❤️ remaining!`)
      .setColor(winner.sanityLevel && winner.sanityLevel < 30 ? PRISON_COLORS.danger : PRISON_COLORS.primary);

    if (target.lives <= 0) {
      resultEmbed.addFields(
        { name: winner.sanityLevel && winner.sanityLevel < 40 ? 'E̷l̷i̷m̷i̷n̷a̷t̷e̷d̷' : '☠️ Eliminated', 
          value: winner.sanityLevel && winner.sanityLevel < 40
            ? `<@${target.id}> i̷s̷ ̷c̷o̷n̷s̷u̷m̷e̷d̷ ̷b̷y̷ ̷t̷h̷e̷ ̷v̷o̷i̷d̷.̷.̷.̷`
            : `<@${target.id}> has been eliminated from the game!`
        }
      );
    }

    await sentMsg.edit({ components: disabledRows });
    await channel.send({ embeds: [resultEmbed] });
  });

  collector.on('end', async collected => {
    if (collected.size === 0 && alivePlayers.length > 0) {
      // If no selection, pick a random player
      const randomIndex = Math.floor(Math.random() * alivePlayers.length);
      const target = alivePlayers[randomIndex];
      await gameState.reduceLife(target.id);

      // Disable all buttons after timeout
      const disabledRows = rows.map(row => {
        const newRow = new ActionRowBuilder<ButtonBuilder>();
        row.components.forEach(btn => 
          newRow.addComponents(ButtonBuilder.from(btn as ButtonBuilder).setDisabled(true))
        );
        return newRow;
      });

      const resultEmbed = new EmbedBuilder()
        .setTitle(winner.sanityLevel && winner.sanityLevel < 40 
          ? `⏱ T̷i̷m̷e̷'̷s̷ ̷U̷p̷ ̷-̷ ̷R̷a̷n̷d̷o̷m̷ ̷S̷a̷c̷r̷i̷f̷i̷c̷e̷`
          : `⏱ Time's Up - Random Selection`)
        .setDescription(winner.sanityLevel && winner.sanityLevel < 40
          ? `<@${winner.id}> h̷e̷s̷i̷t̷a̷t̷e̷s̷.̷.̷.̷ <@${target.id}> i̷s̷ ̷c̷h̷o̷s̷e̷n̷ ̷b̷y̷ ̷t̷h̷e̷ ̷v̷o̷i̷d̷.̷.̷.̷`
          : `<@${winner.id}> didn't choose in time. <@${target.id}> randomly lost a life!`)
        .addFields(
          { name: 'Remaining Lives', value: `<@${target.id}> now has ${target.lives} ❤️ remaining!` }
        )
        .setColor(winner.sanityLevel && winner.sanityLevel < 30 ? PRISON_COLORS.danger : PRISON_COLORS.primary);

      if (target.lives <= 0) {
        resultEmbed.addFields(
          { name: winner.sanityLevel && winner.sanityLevel < 40 ? 'E̷l̷i̷m̷i̷n̷a̷t̷e̷d̷' : '☠️ Eliminated',
            value: winner.sanityLevel && winner.sanityLevel < 40
              ? `<@${target.id}> i̷s̷ ̷c̷o̷n̷s̷u̷m̷e̷d̷ ̷b̷y̷ ̷t̷h̷e̷ ̷v̷o̷i̷d̷.̷.̷.̷`
              : `<@${target.id}> has been eliminated from the game!`
          }
        );
      }

      await sentMsg.edit({ components: disabledRows });
      await channel.send({ embeds: [resultEmbed] });
    }
  });
}
