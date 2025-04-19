import { 
  TextChannel, 
  EmbedBuilder, 
  MessageCollector,
  User,
  DMChannel
} from 'discord.js';
import { GameState, Player } from './gameState';

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
  
  // Start the round - announce in main channel
  const roundEmbed = new EmbedBuilder()
    .setTitle(`⚔️ Round ${gameState.currentRound} - Final Duel`)
    .setDescription(`Only two players remain! This is the final duel.`)
    .addFields(
      { name: 'Players', value: `<@${playerA.id}> (${playerA.lives} ❤️) vs <@${playerB.id}> (${playerB.lives} ❤️)` },
      { name: 'Instructions', value: `Each player will receive a DM to make their choice.\n<@${playerA.id}> wants to choose the same number as <@${playerB.id}>.\n<@${playerB.id}> wants to choose a different number from <@${playerA.id}>.` }
    )
    .setColor(0xff0000)
    .setFooter({ text: 'You have 20 seconds to choose' });
  
  await channel.send({ embeds: [roundEmbed] });
  
  // Randomly decide who goes first
  const firstPlayer = Math.random() < 0.5 ? playerA : playerB;
  const secondPlayer = firstPlayer === playerA ? playerB : playerA;
  
  await channel.send(`<@${firstPlayer.id}> will choose first, then <@${secondPlayer.id}>.`);
  
  try {
    // First player chooses via DM
    const firstPlayerChoice = await getPlayerChoiceViaDM(channel, firstPlayer);
    await channel.send(`<@${firstPlayer.id}> has made their choice.`);
    
    // Second player chooses via DM
    const secondPlayerChoice = await getPlayerChoiceViaDM(channel, secondPlayer);
    
    // Process results
    await processResults(channel, gameState, playerA, playerB, firstPlayer, firstPlayerChoice, secondPlayerChoice);
  } catch (error) {
    console.error('Error in final duel:', error);
    await channel.send('There was an error processing the final duel. Please try again.');
  }
}

async function getPlayerChoiceViaDM(channel: TextChannel, player: Player): Promise<number> {
  try {
    // Get user from client users cache
    const user = await channel.client.users.fetch(player.id);
    if (!user) {
      throw new Error(`Could not find user with ID ${player.id}`);
    }
    
    // Send DM to player
    const dmEmbed = new EmbedBuilder()
      .setTitle('⚔️ Final Duel - Your Turn')
      .setDescription(`It's your turn to choose in the final duel.`)
      .addFields(
        { name: 'Instructions', value: `Type **choose 0** or **choose 100** to make your selection.` }
      )
      .setColor(0xff0000)
      .setFooter({ text: 'You have 20 seconds to choose' });
    
    const dmMessage = await user.send({ embeds: [dmEmbed] });
    
    // Create filter for player's choice in DM
    const filter = (m: any) => {
      if (m.author.id !== player.id) return false;
      
      const content = m.content.toLowerCase().trim();
      if (!content.startsWith('choose ')) return false;
      
      const choice = parseInt(content.substring(7));
      return choice === 0 || choice === 100;
    };
    
    // Create collector for DM channel
    const dmChannel = await user.createDM();
    const collector = dmChannel.createMessageCollector({ filter, time: 20000, max: 1 });
    
    // Return a promise that resolves when player makes a choice
    return new Promise((resolve, reject) => {
      collector.on('collect', message => {
        const content = message.content.toLowerCase().trim();
        const choice = parseInt(content.substring(7));
        player.currentNumber = choice;
        user.send(`You chose ${choice}. Wait for results...`);
        resolve(choice);
      });
      
      collector.on('end', collected => {
        if (collected.size === 0) {
          // Player didn't choose in time - assign random choice
          const randomChoice = Math.random() < 0.5 ? 0 : 100;
          player.currentNumber = randomChoice;
          user.send(`You didn't choose in time. Randomly assigned: ${randomChoice}`);
          channel.send(`<@${player.id}> didn't choose in time. Randomly assigned: ${randomChoice}`);
          resolve(randomChoice);
        }
      });
    });
  } catch (error) {
    console.error(`Error sending DM to player ${player.id}:`, error);
    // Fall back to random choice if DM fails
    const randomChoice = Math.random() < 0.5 ? 0 : 100;
    player.currentNumber = randomChoice;
    channel.send(`Could not DM <@${player.id}>. Randomly assigned: ${randomChoice}`);
    return randomChoice;
  }
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