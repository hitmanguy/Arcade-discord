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

export async function runStandardRound(channel: TextChannel, gameState: GameState): Promise<void> {
  // Reset for new round
  gameState.resetRound();
  const alivePlayers = gameState.getAlivePlayers();

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

    if (isNaN(num)) {
      await interaction.reply({ content: 'Error: Please enter a valid number.', ephemeral: true });
      return;
    }

    if (num < 1 || num > 100) {
      await interaction.reply({ content: 'Error: Number must be between 1 and 100.', ephemeral: true });
      return;
    }

    // Track submissions using player state
    if (player.currentNumber !== null) {
      await interaction.reply({ content: 'Error: You have already submitted a number.', ephemeral: true });
      return;
    }

    player.currentNumber = num;
    await interaction.reply({ 
      content: `Your number (${num}) has been submitted! Wait for other players...`, 
      ephemeral: true 
    });

    // Check if all players have submitted
    const submittedCount = alivePlayers.filter(p => p.currentNumber !== null).length;
    if (submittedCount === alivePlayers.length) {
      await channel.send("All players have submitted their numbers! Processing results...");
    } else {
      const remaining = alivePlayers.length - submittedCount;
      await channel.send(`${submittedCount}/${alivePlayers.length} players have submitted. Waiting for ${remaining} more...`);
    }
  });

  // Start the round
  const roundEmbed = new EmbedBuilder()
    .setTitle(`🔢 Round ${gameState.currentRound} - Standard Phase`)
    .setDescription(`Choose a number between 1 and 100.\nThe player with the closest unique number to the average wins!`)
    .addFields(
      { name: 'Players', value: alivePlayers.map(p => `<@${p.id}> (${p.lives} ❤️)`).join('\n') },
      { name: 'Instructions', value: `Click your button below to submit your number!` }
    )
    .setColor(0x0099ff)
    .setFooter({ text: 'You have 30 seconds to choose a number' });

  // Create buttons for each player
  const row = new ActionRowBuilder<ButtonBuilder>();
  alivePlayers.forEach(player => {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`submit_number_${player.id}`)
        .setLabel(`Submit Number (${player.username})`)
        .setStyle(ButtonStyle.Primary)
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

    if (!player) {
      await interaction.reply({ content: 'Error: Player not found.', ephemeral: true });
      return;
    }

    if (player.currentNumber !== null) {
      await interaction.reply({ content: 'You have already submitted your number.', ephemeral: true });
      return;
    }

    // Show modal
    const modal = new ModalBuilder()
      .setCustomId(`number_modal_${playerId}`)
      .setTitle('Submit Your Number')
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('number_input')
            .setLabel('Enter a number between 1 and 100')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('e.g. 42')
            .setRequired(true)
        )
      );

    try {
      await interaction.showModal(modal);
    } catch (err) {
      await interaction.reply({ content: 'Interaction expired or invalid. Please try again.', ephemeral: true });
    }
  });

  collector.on('end', async () => {
    // Disable all buttons
    const disabledRow = new ActionRowBuilder<ButtonBuilder>();
    row.components.forEach(btn => disabledRow.addComponents(ButtonBuilder.from(btn).setDisabled(true)));
    await msg.edit({ components: [disabledRow] });

    // Process results
    const results = await processStandardResults(channel, gameState);

    // Display results
    const resultsEmbed = new EmbedBuilder()
      .setTitle(`🔢 Round ${gameState.currentRound} Results`)
      .setDescription(`**Average: ${results.average.toFixed(2)}**`)
      .addFields(
        { name: 'Player Numbers', value: results.playerChoices }
      )
      .setColor(0x0099ff);

    if (results.winner) {
      resultsEmbed.addFields(
        { name: 'Winner', value: `<@${results.winner.id}> chose ${results.winner.currentNumber}` }
      );
    } else {
      resultsEmbed.addFields(
        { name: 'Winner', value: 'No winner this round (no unique numbers or no submissions)' }
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
  
  // Validate submissions
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
  
  // Calculate average
  const average = gameState.calculateAverage() || 0;
  
  // Get unique numbers
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
  
  // Format player choices
  const playerChoices = alivePlayers.map(p => {
    const numStr = p.currentNumber !== null ? `${p.currentNumber}` : "❌ No submission";
    const playersWithSameNumber = p.currentNumber !== null ? uniqueNumbers.get(p.currentNumber) : undefined;
    const dupStr = p.currentNumber !== null && playersWithSameNumber && playersWithSameNumber.length > 1 ? " (duplicate)" : "";
    return `<@${p.id}>: ${numStr}${dupStr}`;
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
      .setLabel(`${p.username} (${p.lives} ❤️)`)
      .setStyle(ButtonStyle.Danger)
  );

  // Discord allows max 5 buttons per row
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  for (let i = 0; i < buttons.length; i += 5) {
    rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(buttons.slice(i, i + 5)));
  }

  const chooseEmbed = new EmbedBuilder()
    .setTitle(`🎯 Round ${gameState.currentRound} - Remove a Life`)
    .setDescription(`<@${winner.id}>, choose a player to lose 1 life:`)
    .setColor(0xff0000)
    .setFooter({ text: 'You have 20 seconds to choose' });

  const sentMsg = await channel.send({ embeds: [chooseEmbed], components: rows });

  // Create a button collector
  const collector = channel.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 300000,
    filter: (i: ButtonInteraction) => i.user.id === winner.id
  });

  collector.on('collect', async (interaction: ButtonInteraction) => {
    await interaction.deferUpdate();

    const targetId = interaction.customId.replace('eliminate_', '');
    const target = alivePlayers.find(p => p.id === targetId);

    if (!target) {
      await channel.send(`<@${winner.id}> That player is not in the game or already eliminated.`);
      return;
    }

    target.lives--;
    collector.stop();

    // Disable all buttons after selection
    const disabledRows = rows.map(row => {
      const newRow = new ActionRowBuilder<ButtonBuilder>();
      row.components.forEach(btn => 
        newRow.addComponents(ButtonBuilder.from(btn as ButtonBuilder).setDisabled(true))
      );
      return newRow;
    });

    // Announce result
    const resultEmbed = new EmbedBuilder()
      .setTitle(`💔 Life Reduced`)
      .setDescription(`<@${target.id}> lost a life and now has ${target.lives} ❤️ remaining!`)
      .setColor(0xff0000);

    if (target.lives <= 0) {
      resultEmbed.addFields(
        { name: '☠️ Eliminated', value: `<@${target.id}> has been eliminated from the game!` }
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
      target.lives--;

      // Disable all buttons after timeout
      const disabledRows = rows.map(row => {
        const newRow = new ActionRowBuilder<ButtonBuilder>();
        row.components.forEach(btn => 
          newRow.addComponents(ButtonBuilder.from(btn as ButtonBuilder).setDisabled(true))
        );
        return newRow;
      });

      const resultEmbed = new EmbedBuilder()
        .setTitle(`⏱ Time's Up - Random Selection`)
        .setDescription(`<@${winner.id}> didn't choose in time. <@${target.id}> randomly lost a life!`)
        .addFields(
          { name: 'Remaining Lives', value: `<@${target.id}> now has ${target.lives} ❤️ remaining!` }
        )
        .setColor(0xff0000);

      if (target.lives <= 0) {
        resultEmbed.addFields(
          { name: '☠️ Eliminated', value: `<@${target.id}> has been eliminated from the game!` }
        );
      }

      await sentMsg.edit({ components: disabledRows });
      await channel.send({ embeds: [resultEmbed] });
    } else {
      // Disable buttons if already handled
      await sentMsg.edit({
        components: rows.map(row => {
          row.components.forEach(btn => btn.setDisabled(true));
          return row;
        })
      });
    }
  });
}
