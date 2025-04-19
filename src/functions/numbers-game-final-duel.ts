import { 
  TextChannel, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ComponentType, 
  ButtonInteraction 
} from 'discord.js';
import { GameState, Player } from './numbers-game-state';

export async function runFinalDuelRound(channel: TextChannel, gameState: GameState): Promise<void> {
  // Reset for new round
  gameState.resetRound();
  
  const alivePlayers = gameState.getAlivePlayers();
  if (alivePlayers.length !== 2) {
    await channel.send("Error: Final duel requires exactly 2 players.");
    return;
  }
  
  const playerA = alivePlayers[0];
  const playerB = alivePlayers[1];
  
  // Start the round
  const roundEmbed = new EmbedBuilder()
    .setTitle(`⚔️ Round ${gameState.currentRound} - Final Duel`)
    .setDescription(`Only two players remain! This is the final duel.`)
    .addFields(
      { name: 'Players', value: `<@${playerA.id}> (${playerA.lives} ❤️) vs <@${playerB.id}> (${playerB.lives} ❤️)` },
      { name: 'Instructions', value: `Each player must choose either 0 or 100.\n<@${playerA.id}> wants to choose the same number as <@${playerB.id}>.\n<@${playerB.id}> wants to choose a different number from <@${playerA.id}>.` }
    )
    .setColor(0xff0000)
    .setFooter({ text: 'You have 20 seconds to choose' });
  
  await channel.send({ embeds: [roundEmbed] });

  // Randomly decide who goes first
  const firstPlayer = Math.random() < 0.5 ? playerA : playerB;
  const secondPlayer = firstPlayer === playerA ? playerB : playerA;
  
  await channel.send(`<@${firstPlayer.id}> will choose first, then <@${secondPlayer.id}>.`);

  // First player chooses
  const firstPlayerChoice = await getPlayerChoiceWithButtons(channel, firstPlayer);
  await channel.send(`<@${firstPlayer.id}> has made their choice.`);

  // Second player chooses
  const secondPlayerChoice = await getPlayerChoiceWithButtons(channel, secondPlayer);

  // Process results
  await processResults(channel, gameState, playerA, playerB, firstPlayer, firstPlayerChoice, secondPlayerChoice);
}

async function getPlayerChoiceWithButtons(channel: TextChannel, player: Player): Promise<number> {
  // Send buttons for 0 and 100
  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`choose_0_${player.id}`)
        .setLabel('0')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`choose_100_${player.id}`)
        .setLabel('100')
        .setStyle(ButtonStyle.Primary)
    );

  const prompt = await channel.send({
    content: `<@${player.id}>, it's your turn. Choose **0** or **100**:`,
    components: [row]
  });

  // Wait for button interaction
  return new Promise(resolve => {
    const collector = channel.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 300000,
      filter: (i: ButtonInteraction) => i.user.id === player.id && (i.customId === `choose_0_${player.id}` || i.customId === `choose_100_${player.id}`)
    });

    let resolved = false;

    collector.on('collect', async (interaction: ButtonInteraction) => {
      await interaction.deferUpdate(); // Acknowledge immediately
      const choice = interaction.customId.startsWith('choose_0_') ? 0 : 100;
      player.currentNumber = choice;
      resolved = true;

      // Disable buttons after selection
      const disabledRow = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`choose_0_${player.id}`)
            .setLabel('0')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId(`choose_100_${player.id}`)
            .setLabel('100')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true)
        );
      await prompt.edit({ components: [disabledRow] });

      await channel.send(`<@${player.id}> chose **${choice}**. Wait for results...`);
      collector.stop();
      resolve(choice);
    });

    collector.on('end', async collected => {
      if (!resolved) {
        // Player didn't choose in time - assign random choice
        const randomChoice = Math.random() < 0.5 ? 0 : 100;
        player.currentNumber = randomChoice;

        // Disable buttons after timeout
        const disabledRow = new ActionRowBuilder<ButtonBuilder>()
          .addComponents(
            new ButtonBuilder()
              .setCustomId(`choose_0_${player.id}`)
              .setLabel('0')
              .setStyle(ButtonStyle.Primary)
              .setDisabled(true),
            new ButtonBuilder()
              .setCustomId(`choose_100_${player.id}`)
              .setLabel('100')
              .setStyle(ButtonStyle.Primary)
              .setDisabled(true)
          );
        await prompt.edit({ components: [disabledRow] });

        await channel.send(`<@${player.id}> didn't choose in time. Randomly assigned: **${randomChoice}**`);
        resolve(randomChoice);
      }
    });
  });
}

async function processResults(
  channel: TextChannel, 
  gameState: GameState, 
  playerA: Player, 
  playerB: Player,
  firstPlayer: Player,
  firstChoice: number,
  secondChoice: number
): Promise<void> {
  const firstIsPlayerA = firstPlayer === playerA;
  
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
