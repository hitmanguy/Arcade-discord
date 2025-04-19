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
import { GameState, Player, TeamUp } from './numbers-game-state';

export async function runBetrayalRound(channel: TextChannel, gameState: GameState): Promise<void> {
  // Reset for new round
  gameState.resetRound();
  
  const alivePlayers = gameState.getAlivePlayers();
  
  // Start the round
  const roundEmbed = new EmbedBuilder()
    .setTitle(`🔢 Round ${gameState.currentRound} - Betrayal Phase`)
    .setDescription(`Three players remain. You can play solo or team up!`)
    .addFields(
      { name: 'Players', value: alivePlayers.map(p => `<@${p.id}> (${p.lives} ❤️)`).join('\n') },
      { name: 'Option A: Play Solo', value: `Type: **choose 42** (replace with your number 1-100)` },
      { name: 'Option B: Team Up', value: `Type: **team @player** to propose a team-up` }
    )
    .setColor(0xcc00ff)
    .setFooter({ text: 'You have 45 seconds for this phase' });
  
  await channel.send({ embeds: [roundEmbed] });
  
  // Phase 1: Team formation (20 seconds)
  await teamFormationPhase(channel, gameState);
  
  // Phase 2: Number submission (25 seconds)
  await numberSubmissionPhase(channel, gameState);
  
  // Process results
  await processResults(channel, gameState);
}

async function teamFormationPhase(channel: TextChannel, gameState: GameState): Promise<void> {
  const alivePlayers = gameState.getAlivePlayers();
  
  // Let players know team formation phase started
  await channel.send('### Team Formation Phase (20 seconds)\nType **team @player** to propose a team-up or wait to play solo.');
  
  // Create collector for team formation
  const teamFilter = (m: any) => {
    // Check if message is from an alive player
    const player = alivePlayers.find(p => p.id === m.author.id);
    if (!player) return false;
    
    // Check if message follows the team format
    const content = m.content.toLowerCase().trim();
    return content.startsWith('team ') && m.mentions.users.size > 0;
  };
  
  const teamCollector = channel.createMessageCollector({ filter: teamFilter, time: 20000 });
  
  teamCollector.on('collect', async message => {
    const proposerId = message.author.id;
    const targetId = message.mentions.users.first()?.id;
    
    if (!targetId) {
      await channel.send(`<@${proposerId}> Please mention a valid player.`);
      return;
    }
    
    // Check if target is alive
    const target = alivePlayers.find(p => p.id === targetId);
    if (!target) {
      await channel.send(`<@${proposerId}> That player is not in the game or already eliminated.`);
      return;
    }
    
    // Check if self-targeting
    if (proposerId === targetId) {
      await channel.send(`<@${proposerId}> You can't team up with yourself.`);
      return;
    }
    
    // Create team-up offer
    const proposer = alivePlayers.find(p => p.id === proposerId)!;
    proposer.teamUpWith = targetId;
    target.teamUpOffer = proposerId;
    
    // Create team-up entry
    gameState.createTeamUp(proposerId, targetId);
    
    await message.reply(`You proposed a team-up with <@${targetId}>. They need to accept by typing **accept @${message.author.username}**.`);
    
    // Also notify the target player
    await channel.send(`<@${targetId}> You received a team-up offer from <@${proposerId}>. Type **accept @${message.author.username}** to accept or ignore to decline.`);
  });
  
  // Create collector for team acceptances
  const acceptFilter = (m: any) => {
    // Check if message is from an alive player
    const player = alivePlayers.find(p => p.id === m.author.id);
    if (!player || !player.teamUpOffer) return false;
    
    // Check if message follows the accept format
    const content = m.content.toLowerCase().trim();
    return content.startsWith('accept ') && m.mentions.users.size > 0;
  };
  
  const acceptCollector = channel.createMessageCollector({ filter: acceptFilter, time: 20000 });
  
  acceptCollector.on('collect', async message => {
    const accepterId = message.author.id;
    const proposerId = message.mentions.users.first()?.id;
    
    if (!proposerId) {
      await channel.send(`<@${accepterId}> Please mention a valid player.`);
      return;
    }
    
    // Check if this is a valid team-up offer
    const accepter = alivePlayers.find(p => p.id === accepterId)!;
    if (accepter.teamUpOffer !== proposerId) {
      await channel.send(`<@${accepterId}> That player didn't send you a team-up offer.`);
      return;
    }
    
    // Accept the team-up
    const proposer = alivePlayers.find(p => p.id === proposerId)!;
    proposer.teamUpWith = accepterId;
    accepter.teamUpWith = proposerId;
    
    // Update team-up status
    gameState.acceptTeamUp(proposerId, accepterId);
    
    await message.reply(`You accepted the team-up with <@${proposerId}>. In the next phase, you'll need to agree on a number.`);
    await channel.send(`<@${proposerId}> Your team-up with <@${accepterId}> has been accepted!`);
  });
  
  // Wait for team formation phase to end
  await new Promise(resolve => setTimeout(resolve, 20000));
  
  // Stop collectors
  teamCollector.stop();
  acceptCollector.stop();
  
  // Announce team formation results
  const teams: string[] = [];
  const soloPlayers: string[] = [];
  
  alivePlayers.forEach(player => {
    if (player.teamUpWith && player.teamUpWith === alivePlayers.find(p => p.id === player.teamUpWith)?.teamUpWith) {
      // Avoid duplicate entries
      if (!teams.includes(`<@${player.id}> and <@${player.teamUpWith}>`)) {
        teams.push(`<@${player.id}> and <@${player.teamUpWith}>`);
      }
    } else if (!player.teamUpWith) {
      soloPlayers.push(`<@${player.id}>`);
    }
  });
  
  const formationEmbed = new EmbedBuilder()
    .setTitle('🤝 Team Formation Results')
    .setColor(0xcc00ff);
  
  if (teams.length > 0) {
    formationEmbed.addFields({ name: 'Teams', value: teams.join('\n') });
  }
  
  if (soloPlayers.length > 0) {
    formationEmbed.addFields({ name: 'Solo Players', value: soloPlayers.join('\n') });
  }
  
  await channel.send({ embeds: [formationEmbed] });
}

async function numberSubmissionPhase(channel: TextChannel, gameState: GameState): Promise<void> {
  const alivePlayers = gameState.getAlivePlayers();
  
  // Let players know number submission phase started
  await channel.send('### Number Submission Phase (25 seconds)\nType **choose 42** (replace with your number 1-100).');
  
  // For team players, send private messages to suggest numbers
  for (const player of alivePlayers) {
    if (player.teamUpWith && player.teamUpWith === alivePlayers.find(p => p.id === player.teamUpWith)?.teamUpWith) {
      // Both players agreed to team up
      await channel.send(`<@${player.id}> and <@${player.teamUpWith}> - You should coordinate on a number. Type **suggest 42** to suggest a number to your partner.`);
    }
  }
  
  // Create collector for number suggestions
  const suggestFilter = (m: any) => {
    // Check if message is from an alive player with a team
    const player = alivePlayers.find(p => p.id === m.author.id);
    if (!player || !player.teamUpWith) return false;
    
    // Check if message follows the suggest format
    const content = m.content.toLowerCase().trim();
    return content.startsWith('suggest ') && !isNaN(parseInt(content.substring(8)));
  };
  
  const suggestCollector = channel.createMessageCollector({ filter: suggestFilter, time: 25000 });
  
  suggestCollector.on('collect', async message => {
    const playerId = message.author.id;
    const content = message.content.toLowerCase().trim();
    const number = parseInt(content.substring(8));
    
    // Validate number is between 1 and 100
    if (number < 1 || number > 100) {
      await channel.send(`<@${playerId}> Your number must be between 1 and 100.`);
      return;
    }
    
    const player = alivePlayers.find(p => p.id === playerId)!;
    if (!player.teamUpWith) return;
    
    // Find the teammate
    const teammate = alivePlayers.find(p => p.id === player.teamUpWith);
    if (!teammate) return;
    
    // Notify the teammate
    await channel.send(`<@${teammate.id}> Your partner <@${playerId}> suggests number **${number}** for your team.`);
    
    // Update team-up number if both agreed
    const teamUp = gameState.getTeamUp(playerId, teammate.id);
    if (teamUp) {
      teamUp.number = number;
    }
  });
  
  // Create collector for number submissions
  const chooseFilter = (m: any) => {
    // Check if message is from an alive player
    const player = alivePlayers.find(p => p.id === m.author.id);
    if (!player) return false;
    
    // Check if message follows the choose format
    const content = m.content.toLowerCase().trim();
    return content.startsWith('choose ') && !isNaN(parseInt(content.substring(7)));
  };
  
  const chooseCollector = channel.createMessageCollector({ filter: chooseFilter, time: 25000 });
  
  chooseCollector.on('collect', async message => {
    const playerId = message.author.id;
    const content = message.content.toLowerCase().trim();
    const number = parseInt(content.substring(7));
    
    // Validate number is between 1 and 100
    if (number < 1 || number > 100) {
      await channel.send(`<@${playerId}> Your number must be between 1 and 100.`);
      return;
    }
    
    // Set player's number
    const player = alivePlayers.find(p => p.id === playerId);
    if (player) {
      player.currentNumber = number;
      await message.reply(`You chose ${number}. Wait for results...`);
      
      // If player is in a team, check if this is a betrayal
      if (player.teamUpWith) {
        const teammate = alivePlayers.find(p => p.id === player.teamUpWith);
        if (teammate && teammate.currentNumber !== null && teammate.currentNumber !== number) {
          // This is a potential betrayal - will be checked in results
        }
      }
    }
  });
  
  // Wait for number submission phase to end
  await new Promise(resolve => setTimeout(resolve, 25000));
  
  // Stop collectors
  suggestCollector.stop();
  chooseCollector.stop();
}

async function processResults(channel: TextChannel, gameState: GameState): Promise<void> {
  const alivePlayers = gameState.getAlivePlayers();
  
  // Get players who submitted numbers
  const playersWithNumbers = alivePlayers.filter(p => p.currentNumber !== null);
  
  if (playersWithNumbers.length === 0) {
    await channel.send("No players submitted numbers! Everyone keeps their lives this round.");
    return;
  }
  
  // Calculate average
  const average = gameState.calculateAverage() || 0;
  
  // Check for team-ups and betrayals
  const teams: { player1: Player, player2: Player, betrayal: boolean }[] = [];
  const soloPlayers: Player[] = [];
  
  for (const player of alivePlayers) {
    // Skip players already processed
    if (teams.some(t => t.player1.id === player.id || t.player2.id === player.id)) {
      continue;
    }
    
    if (player.teamUpWith) {
      const teammate = alivePlayers.find(p => p.id === player.teamUpWith);
      if (teammate && teammate.teamUpWith === player.id) {
        // Check for betrayal
        const betrayal = player.currentNumber !== teammate.currentNumber;
        teams.push({ player1: player, player2: teammate, betrayal });
      } else {
        // Attempted team-up but not reciprocated
        soloPlayers.push(player);
      }
    } else {
      soloPlayers.push(player);
    }
  }
  
  // Format player choices for display
  const playerChoices = alivePlayers.map(p => {
    const numStr = p.currentNumber !== null ? `${p.currentNumber}` : "❌ No submission";
    
    // Check if player is in a team
    const team = teams.find(t => t.player1.id === p.id || t.player2.id === p.id);
    if (team) {
      if (team.betrayal) {
        const teammate = team.player1.id === p.id ? team.player2 : team.player1;
        return `<@${p.id}>: ${numStr} (Betrayed <@${teammate.id}>)`;
      } else {
        const teammate = team.player1.id === p.id ? team.player2 : team.player1;
        return `<@${p.id}>: ${numStr} (Team with <@${teammate.id}>)`;
      }
    }
    
    return `<@${p.id}>: ${numStr}`;
  }).join('\n');
  
  // Calculate differences to average
  const playerDifferences = playersWithNumbers.map(player => ({
    player,
    number: player.currentNumber!,
    difference: Math.abs(player.currentNumber! - average)
  }));
  
  // Sort by difference
  playerDifferences.sort((a, b) => a.difference - b.difference);
  
  // Find winner - closest to average
  let winner: Player | null = null;
  let loser: Player | null = null;
  
  // Check if there's a clear winner (closest unique number to average)
  const uniqueNumbers = new Set(playerDifferences.map(p => p.number));
  if (uniqueNumbers.size < playerDifferences.length) {
    // Handle duplicates - only unique numbers can win
    const uniquePlayers = playerDifferences.filter(p => 
      playerDifferences.filter(other => other.number === p.number).length === 1
    );
    
    if (uniquePlayers.length > 0) {
      uniquePlayers.sort((a, b) => a.difference - b.difference);
      winner = uniquePlayers[0].player;
    }
  } else {
    // All numbers are unique
    winner = playerDifferences[0].player;
  }
  
  // Process team dynamics and betrayals
  if (teams.length > 0) {
    // Check for betrayals
    const betrayalTeam = teams.find(t => t.betrayal);
    if (betrayalTeam) {
      // Determine betrayer and betrayed
      const betrayer = betrayalTeam.player1.currentNumber !== betrayalTeam.player2.currentNumber ? 
        (betrayalTeam.player1.currentNumber === winner?.currentNumber ? betrayalTeam.player1 : betrayalTeam.player2) : 
        null;
      
      const betrayed = betrayer === betrayalTeam.player1 ? betrayalTeam.player2 : betrayalTeam.player1;
      
      if (betrayer && betrayer === winner) {
        // Betrayer won - betrayed loses life
        loser = betrayed;
      } else {
        // Betrayal didn't work out - randomly choose between betrayer and betrayed
        loser = Math.random() < 0.5 ? betrayalTeam.player1 : betrayalTeam.player2;
      }
    }
  }
  
  // If no loser determined yet, use standard rules
  if (!loser && winner) {
    // Winner chooses who loses
    loser = await chooseLoser(channel, gameState, winner);
  } else if (!loser && !winner) {
    // No clear winner - random player loses
    loser = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
  }
  
  // Display results
  const resultsEmbed = new EmbedBuilder()
    .setTitle(`🔢 Round ${gameState.currentRound} Results`)
    .setDescription(`**Average: ${average.toFixed(2)}**`)
    .addFields(
      { name: 'Player Numbers', value: playerChoices }
    )
    .setColor(0xcc00ff);
  
  if (winner) {
    resultsEmbed.addFields(
      { name: 'Winner', value: `<@${winner.id}> chose ${winner.currentNumber}` }
    );
  } else {
    resultsEmbed.addFields(
      { name: 'Winner', value: 'No clear winner this round' }
    );
  }
  
  if (loser) {
    resultsEmbed.addFields(
      { name: 'Loser', value: `<@${loser.id}> loses a life!` }
    );
    
    // Reduce life
    loser.lives--;
    
    if (loser.lives <= 0) {
      resultsEmbed.addFields(
        { name: '☠️ Eliminated', value: `<@${loser.id}> has been eliminated from the game!` }
      );
    }
  }
  
  await channel.send({ embeds: [resultsEmbed] });
}

async function chooseLoser(channel: TextChannel, gameState: GameState, winner: Player): Promise<Player> {
  const alivePlayers = gameState.getAlivePlayers().filter(p => p.id !== winner.id);

  if (alivePlayers.length === 1) {
    // Only one other player - they automatically lose
    return alivePlayers[0];
  }

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
    .setFooter({ text: 'You have 15 seconds to choose' });

  const sentMsg = await channel.send({ embeds: [chooseEmbed], components: rows });

  // Create a button collector
  return new Promise<Player>(resolve => {
    const collector = channel.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 15000,
      filter: (i: ButtonInteraction) => i.user.id === winner.id
    });

    let resolved = false;

    collector.on('collect', async (interaction: ButtonInteraction) => {
      await interaction.deferUpdate(); // Acknowledge immediately

      const targetId = interaction.customId.replace('eliminate_', '');
      const target = alivePlayers.find(p => p.id === targetId);

      if (!target) {
        await channel.send(`<@${winner.id}> That player is not in the game or already eliminated.`);
        return;
      }

      collector.stop();
      resolved = true;

      // Disable all buttons after selection
      const disabledRows = rows.map(row => {
        row.components.forEach(btn => btn.setDisabled(true));
        return row;
      });
      await sentMsg.edit({ components: disabledRows });

      resolve(target);
    });

    collector.on('end', async collected => {
      if (!resolved && alivePlayers.length > 0) {
        // Time's up - choose random player
        const randomTarget = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];

        // Disable all buttons after timeout
        const disabledRows = rows.map(row => {
          row.components.forEach(btn => btn.setDisabled(true));
          return row;
        });
        await sentMsg.edit({ components: disabledRows });

        resolve(randomTarget);
      }
    });
  });
}
