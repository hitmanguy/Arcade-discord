import { 
  TextChannel, 
  EmbedBuilder, 
  MessageCollector, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ComponentType, 
  ButtonInteraction 
} from 'discord.js';
import { GameState, Player } from './numbers-game-state';

export async function runStandardRound(channel: TextChannel, gameState: GameState): Promise<void> {
  // Reset for new round
  gameState.resetRound();
  
  const alivePlayers = gameState.getAlivePlayers();
  
  // Start the round
  const roundEmbed = new EmbedBuilder()
    .setTitle(`🔢 Round ${gameState.currentRound} - Standard Phase`)
    .setDescription(`Choose a number between 1 and 100.\nThe player with the closest unique number to the average wins!`)
    .addFields(
      { name: 'Players', value: alivePlayers.map(p => `<@${p.id}> (${p.lives} ❤️)`).join('\n') },
      { name: 'Instructions', value: `DM your number in this channel by typing:\n**choose 42** (replace with your number)` }
    )
    .setColor(0x0099ff)
    .setFooter({ text: 'You have 30 seconds to choose a number' });
  
  await channel.send({ embeds: [roundEmbed] });
  
  // Listen for number submissions
  const filter = (m: any) => {
    // Check if message is from an alive player
    const player = alivePlayers.find(p => p.id === m.author.id);
    if (!player) return false;
    
    // Check if message follows the correct format
    const content = m.content.toLowerCase().trim();
    return content.startsWith('choose ') && !isNaN(parseInt(content.substring(7)));
  };
  
  const collector = channel.createMessageCollector({ filter, time: 30000 });
  
  collector.on('collect', message => {
    const playerId = message.author.id;
    const content = message.content.toLowerCase().trim();
    const number = parseInt(content.substring(7));
    
    // Validate number is between 1 and 100
    if (number < 1 || number > 100) {
      channel.send(`<@${playerId}> Your number must be between 1 and 100.`);
      return;
    }
    
    // Set player's number
    const player = alivePlayers.find(p => p.id === playerId);
    if (player) {
      player.currentNumber = number;
      message.reply(`You chose ${number}. Wait for results...`);
    }
  });
  
  // Handle end of collection
  collector.on('end', async collected => {
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
  
  // Get players who submitted numbers
  const playersWithNumbers = alivePlayers.filter(p => p.currentNumber !== null);
  
  if (playersWithNumbers.length === 0) {
    return {
      average: 0,
      playerChoices: "No numbers submitted",
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
  
  // Return results
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
      .setLabel(`${p.id} (${p.lives} ❤️)`)
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
    time: 20000,
    filter: (i: ButtonInteraction) => i.user.id === winner.id
  });

  collector.on('collect', async (interaction: ButtonInteraction) => {
    await interaction.deferUpdate(); // Acknowledge immediately

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
      row.components.forEach(btn => btn.setDisabled(true));
      return row;
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
    // If no selection, pick a random player
    if (collected.size === 0 && alivePlayers.length > 0) {
      const randomIndex = Math.floor(Math.random() * alivePlayers.length);
      const target = alivePlayers[randomIndex];
      target.lives--;

      // Disable all buttons after timeout
      const disabledRows = rows.map(row => {
        row.components.forEach(btn => btn.setDisabled(true));
        return row;
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
