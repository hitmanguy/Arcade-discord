import { 
  TextChannel, 
  EmbedBuilder, 
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  InteractionType,
  Interaction,
  ComponentType,
  ButtonInteraction
} from 'discord.js';
import { GameState, Player } from './numbers-game-state';

export async function runFinalDuelRound(channel: TextChannel, gameState: GameState): Promise<void> {
  gameState.resetRound();

  const alivePlayers = gameState.getAlivePlayers();
  if (alivePlayers.length !== 2) {
    await channel.send("Error: Final duel requires exactly 2 players.");
    return;
  }

  const playerA = alivePlayers[0];
  const playerB = alivePlayers[1];

  // Register modal handlers
  GameState.registerGlobalHandler(channel.client);
  GameState.registerModalHandler('finalduel', async (interaction: Interaction) => {
    if (!interaction.isModalSubmit()) return;
    
    const playerId = interaction.customId.replace('finalduel_modal_', '');
    const player = alivePlayers.find(p => p.id === playerId);
    
    if (!player) {
      await interaction.reply({ content: 'Error: Player not found.', ephemeral: true });
      return;
    }

    if (player.currentNumber !== null) {
      await interaction.reply({ content: 'You have already submitted your choice.', ephemeral: true });
      return;
    }

    const numberInput = interaction.fields.getTextInputValue('finalduel_input');
    const num = parseInt(numberInput);
    
    if (isNaN(num) || (num !== 0 && num !== 100)) {
      await interaction.reply({ content: 'Please enter **0** or **100** only.', ephemeral: true });
      return;
    }

    player.currentNumber = num;
    await interaction.reply({ 
      content: `You chose ${num}. Wait for your opponent...`,
      ephemeral: true 
    });

    // Check if both players have submitted
    const submittedCount = alivePlayers.filter(p => p.currentNumber !== null).length;
    if (submittedCount === 2) {
      await channel.send("Both players have submitted their numbers! Processing results...");
    } else {
      await channel.send("Waiting for the other player to choose...");
    }
  });

  // Start the round - announce in main channel
  const roundEmbed = new EmbedBuilder()
    .setTitle(`⚔️ Round ${gameState.currentRound} - Final Duel`)
    .setDescription(`Only two players remain! This is the final duel.`)
    .addFields(
      { name: 'Players', value: `<@${playerA.id}> (${playerA.lives} ❤️) vs <@${playerB.id}> (${playerB.lives} ❤️)` },
      { name: 'Instructions', value: `Each player must choose either **0** or **100**.\n<@${playerA.id}> wants to choose the same number as <@${playerB.id}>.\n<@${playerB.id}> wants to choose a different number from <@${playerA.id}>.` }
    )
    .setColor(0xff0000)
    .setFooter({ text: 'You have 20 seconds to choose' });

  await channel.send({ embeds: [roundEmbed] });

  // Randomly decide who goes first
  const firstPlayer = Math.random() < 0.5 ? playerA : playerB;
  const secondPlayer = firstPlayer === playerA ? playerB : playerA;

  await channel.send(`<@${firstPlayer.id}> will choose first, then <@${secondPlayer.id}>.`);

  // Buttons for both players
  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`finalduel_choose_${firstPlayer.id}`)
        .setLabel(`Choose (${firstPlayer.username})`)
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`finalduel_choose_${secondPlayer.id}`)
        .setLabel(`Choose (${secondPlayer.username})`)
        .setStyle(ButtonStyle.Secondary)
    );

  const msg = await channel.send({
    content: `Players, click your button to submit your choice (0 or 100).`,
    components: [row]
  });

  // Button collector for 20 seconds
  const collector = channel.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 20000,
    filter: (i: ButtonInteraction) =>
      [firstPlayer.id, secondPlayer.id].includes(i.user.id) &&
      [`finalduel_choose_${firstPlayer.id}`, `finalduel_choose_${secondPlayer.id}`].includes(i.customId)
  });

  collector.on('collect', async (interaction: ButtonInteraction) => {
    const playerId = interaction.customId.replace('finalduel_choose_', '');
    const player = alivePlayers.find(p => p.id === playerId);

    if (!player) {
      await interaction.reply({ content: 'Error: Player not found.', ephemeral: true });
      return;
    }

    if (player.currentNumber !== null) {
      await interaction.reply({ content: 'You have already submitted your choice.', ephemeral: true });
      return;
    }

    // Show modal
    const modal = new ModalBuilder()
      .setCustomId(`finalduel_modal_${playerId}`)
      .setTitle('Final Duel - Choose 0 or 100')
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('finalduel_input')
            .setLabel('Enter 0 or 100')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('0 or 100')
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
    // Disable buttons
    const disabledRow = new ActionRowBuilder<ButtonBuilder>();
    row.components.forEach(btn => 
      disabledRow.addComponents(ButtonBuilder.from(btn).setDisabled(true))
    );
    await msg.edit({ components: [disabledRow] });

    // Assign random choices for any missing submissions
    for (const player of [firstPlayer, secondPlayer]) {
      if (player.currentNumber === null) {
        const randomChoice = Math.random() < 0.5 ? 0 : 100;
        player.currentNumber = randomChoice;
        await channel.send(`<@${player.id}> didn't choose in time. Randomly assigned: ${randomChoice}`);
      }
    }

    // Process results
    await processResults(channel, gameState, playerA, playerB);
  });
}

async function processResults(
  channel: TextChannel, 
  gameState: GameState, 
  playerA: Player, 
  playerB: Player
): Promise<void> {
  // Determine if playerA matched playerB (playerA wants to match)
  const playerAMatched = playerA.currentNumber === playerB.currentNumber;

  // Determine winner and loser
  let winner: Player;
  let loser: Player;

  if (playerAMatched) {
    // PlayerA successfully matched - playerB loses
    winner = playerA;
    loser = playerB;
  } else {
    // PlayerA failed to match - playerA loses
    winner = playerB;
    loser = playerA;
  }

  // Reduce loser's life
  loser.lives--;

  // Create results embed
  const resultsEmbed = new EmbedBuilder()
    .setTitle(`⚔️ Round ${gameState.currentRound} Results`)
    .setDescription(`<@${playerA.id}> ${playerAMatched ? 'successfully' : 'failed to'} match <@${playerB.id}>'s number.`)
    .addFields(
      { name: 'Choices', value: `<@${playerA.id}>: ${playerA.currentNumber}\n<@${playerB.id}>: ${playerB.currentNumber}` },
      { name: 'Result', value: `<@${winner.id}> wins this round!\n<@${loser.id}> loses a life and now has ${loser.lives} ❤️ remaining.` }
    )
    .setColor(playerAMatched ? 0x00ff00 : 0xff0000);

  if (loser.lives <= 0) {
    resultsEmbed.addFields(
      { name: '☠️ Eliminated', value: `<@${loser.id}> has been eliminated from the game!` }
    );
  }

  await channel.send({ embeds: [resultsEmbed] });
}