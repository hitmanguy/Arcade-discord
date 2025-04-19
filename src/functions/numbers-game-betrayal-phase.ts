
import { 
  TextChannel, 
  EmbedBuilder, 
  MessageCollector,
  User,
  DMChannel,
  Client,
  Message
} from 'discord.js';
import { GameState, Player, TeamUp } from './numbers-game-state';

export async function runBetrayalRound(channel: TextChannel, gameState: GameState): Promise<void> {
  // Reset for new round
  gameState.resetRound();
  
  const alivePlayers = gameState.getAlivePlayers();
  const client = channel.client;
  
  // Start the round
  const roundEmbed = new EmbedBuilder()
    .setTitle(`🔢 Round ${gameState.currentRound} - Betrayal Phase`)
    .setDescription(`Three players remain. You can play solo or team up!`)
    .addFields(
      { name: 'Players', value: alivePlayers.map(p => `<@${p.id}> (${p.lives} ❤️)`).join('\n') },
      { name: 'Option A: Play Solo', value: `Check your DMs to submit your number (1-100)` },
      { name: 'Option B: Team Up', value: `Check your DMs to propose a team-up` }
    )
    .setColor(0xcc00ff)
    .setFooter({ text: 'You have 45 seconds for this phase' });
  
  await channel.send({ embeds: [roundEmbed] });
  
  // Phase 1: Team formation (20 seconds)
  await teamFormationPhase(channel, client, gameState);
  
  // Phase 2: Number submission (25 seconds)
  await numberSubmissionPhase(channel, client, gameState);
  
  // Process results
  await processResults(channel, gameState);
}

async function teamFormationPhase(channel: TextChannel, client: Client, gameState: GameState): Promise<void> {
  const alivePlayers = gameState.getAlivePlayers();
  
  // Let players know team formation phase started
  await channel.send('### Team Formation Phase (20 seconds)\nCheck your DMs to propose or accept team-ups.');
  
  // Send DMs to all players with instructions
  const dmPromises = alivePlayers.map(async player => {
    try {
      const user = await client.users.fetch(player.id);
      const teamFormationEmbed = new EmbedBuilder()
        .setTitle(`🤝 Round ${gameState.currentRound} - Team Formation`)
        .setDescription('You can play solo or team up with another player.')
        .addFields(
          { name: 'Option A: Play Solo', value: 'Do nothing and wait for number submission phase.' },
          { name: 'Option B: Team Up', value: 'Type **team @player** to propose a team-up (mention their username)' }
        )
        .setColor(0xcc00ff)
        .setFooter({ text: 'You have 20 seconds for team formation' });
      
      await user.send({ embeds: [teamFormationEmbed] });
      
      // Setup collectors for this user's DMs
      setupTeamFormationCollectors(user, player, alivePlayers, client, gameState);
    } catch (error) {
      console.error(`Could not DM player ${player.id}:`, error);
    }
  });
  
  await Promise.all(dmPromises);
  
  // Wait for team formation phase to end
  await new Promise(resolve => setTimeout(resolve, 20000));
  
  // Announce team formation results in main channel
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

function setupTeamFormationCollectors(user: User, player: Player, alivePlayers: Player[], client: Client, gameState: GameState): void {
  // Create collector for team proposals
  const teamFilter = (m: any) => {
    const content = m.content.toLowerCase().trim();
    return content.startsWith('team ');
  };
  
  const teamCollector = user.dmChannel?.createMessageCollector({ filter: teamFilter, time: 20000 });
  
  teamCollector?.on('collect', async message => {
    const proposerId = player.id;
    const targetUsername = message.content.split(' ')[1];
    
    if (!targetUsername) {
      await user.send(`Please specify a valid player username.`);
      return;
    }
    
    // Try to find the target player by username
    const target = alivePlayers.find(p => {
      const user = client.users.cache.get(p.id);
      return user && (user.username === targetUsername.replace('@', '') || 
                     user.tag === targetUsername.replace('@', '') ||
                     p.id === targetUsername.replace('<@', '').replace('>', ''));
    });
    
    if (!target) {
      await user.send(`Could not find player with username ${targetUsername}.`);
      return;
    }
    
    // Check if self-targeting
    if (proposerId === target.id) {
      await user.send(`You can't team up with yourself.`);
      return;
    }
    
    // Create team-up offer
    player.teamUpWith = target.id;
    target.teamUpOffer = proposerId;
    
    // Create team-up entry
    gameState.createTeamUp(proposerId, target.id);
    
    await user.send(`You proposed a team-up with ${targetUsername}. They need to accept it.`);
    
    // Also notify the target player
    try {
      const targetUser = await client.users.fetch(target.id);
      await targetUser.send(`${user.username} has proposed a team-up with you. Type **accept ${user.username}** to accept or ignore to decline.`);
    } catch (error) {
      console.error(`Could not DM target player ${target.id}:`, error);
    }
  });
  
  // Create collector for accepting team-ups
  const acceptFilter = (m: any) => {
    const content = m.content.toLowerCase().trim();
    return content.startsWith('accept ') && player.teamUpOffer !== null;
  };
  
  const acceptCollector = user.dmChannel?.createMessageCollector({ filter: acceptFilter, time: 20000 });
  
  acceptCollector?.on('collect', async message => {
    const accepterId = player.id;
    const proposerUsername = message.content.split(' ')[1];
    
    if (!proposerUsername) {
      await user.send(`Please specify a valid player username.`);
      return;
    }
    
    // Try to find the proposer by username
    const proposer = alivePlayers.find(p => {
      if (p.id !== player.teamUpOffer) return false;
      const user = client.users.cache.get(p.id);
      return user && (user.username === proposerUsername.replace('@', '') || 
                     user.tag === proposerUsername.replace('@', '') ||
                     p.id === proposerUsername.replace('<@', '').replace('>', ''));
    });
    
    if (!proposer) {
      await user.send(`That player didn't send you a team-up offer.`);
      return;
    }
    
    // Accept the team-up
    proposer.teamUpWith = accepterId;
    player.teamUpWith = proposer.id;
    
    // Update team-up status
    gameState.acceptTeamUp(proposer.id, accepterId);
    
    await user.send(`You accepted the team-up with ${proposerUsername}. In the next phase, you'll need to agree on a number.`);
    
    // Notify the proposer
    try {
      const proposerUser = await client.users.fetch(proposer.id);
      await proposerUser.send(`${user.username} has accepted your team-up!`);
    } catch (error) {
      console.error(`Could not DM proposer player ${proposer.id}:`, error);
    }
  });
}

async function numberSubmissionPhase(channel: TextChannel, client: Client, gameState: GameState): Promise<void> {
  const alivePlayers = gameState.getAlivePlayers();
  
  // Let players know number submission phase started
  await channel.send('### Number Submission Phase (25 seconds)\nCheck your DMs to submit your number.');
  
  // Send DMs to all players for number submission
  const dmPromises = alivePlayers.map(async player => {
    try {
      const user = await client.users.fetch(player.id);
      
      // Check if player is in a team
      const isInTeam = player.teamUpWith && alivePlayers.find(p => p.id === player.teamUpWith)?.teamUpWith === player.id;
      const numberSubmissionEmbed = new EmbedBuilder()
        .setTitle(`🔢 Round ${gameState.currentRound} - Number Submission`)
        .setDescription(isInTeam 
          ? `You're teamed up with <@${player.teamUpWith}>. You should coordinate on a number.`
          : 'Choose a number between 1 and 100.')
        .addFields(
          { name: 'Submit Number', value: 'Type **choose 42** (replace with your number 1-100)' }
        );
      
      if (isInTeam) {
        numberSubmissionEmbed.addFields({
          name: 'Team Coordination', 
          value: 'Type **suggest 42** to suggest a number to your teammate.\nWhen submitting numbers, teammates should choose the same number to avoid betrayal.'
        });
      }
      
      await user.send({ embeds: [numberSubmissionEmbed] });
      
      // Setup collectors for number suggestions and submissions
      setupNumberSubmissionCollectors(user, player, alivePlayers, client, gameState);
    } catch (error) {
      console.error(`Could not DM player ${player.id}:`, error);
    }
  });
  
  await Promise.all(dmPromises);
  
  // Wait for number submission phase to end
  await new Promise(resolve => setTimeout(resolve, 25000));
}

function setupNumberSubmissionCollectors(user: User, player: Player, alivePlayers: Player[], client: Client, gameState: GameState): void {
  // Create collector for number suggestions (for teammates)
  const suggestFilter = (m: any) => {
    const content = m.content.toLowerCase().trim();
    return content.startsWith('suggest ') && !isNaN(parseInt(content.substring(8)));
  };
  
  const suggestCollector = user.dmChannel?.createMessageCollector({ filter: suggestFilter, time: 25000 });
  
  suggestCollector?.on('collect', async (message) => {
    const content = message.content.toLowerCase().trim();
    const number = parseInt(content.substring(8));
    
    // Validate number is between 1 and 100
    if (number < 1 || number > 100) {
      await user.send(`Your number must be between 1 and 100.`);
      return;
    }
    
    if (!player.teamUpWith) {
      await user.send(`You're not in a team, so you can't suggest numbers.`);
      return;
    }
    
    // Find the teammate
    const teammate = alivePlayers.find(p => p.id === player.teamUpWith);
    if (!teammate) return;
    
    // Notify the teammate
    try {
      const teammateUser = await client.users.fetch(teammate.id);
      await teammateUser.send(`Your teammate ${user.username} suggests number **${number}** for your team.`);
    } catch (error) {
      console.error(`Could not DM teammate ${teammate.id}:`, error);
    }
    
    // Update team-up number if both agreed
    const teamUp = gameState.getTeamUp(player.id, teammate.id);
    if (teamUp) {
      teamUp.number = number;
    }
    
    await user.send(`You suggested ${number} to your teammate.`);
  });
  
  // Create collector for number submissions
  const chooseFilter = (m: any) => {
    const content = m.content.toLowerCase().trim();
    return content.startsWith('choose ') && !isNaN(parseInt(content.substring(7)));
  };
  
  const chooseCollector = user.dmChannel?.createMessageCollector({ filter: chooseFilter, time: 25000 });
  
  chooseCollector?.on('collect', async message => {
    const content = message.content.toLowerCase().trim();
    const number = parseInt(content.substring(7));
    
    // Validate number is between 1 and 100
    if (number < 1 || number > 100) {
      await user.send(`Your number must be between 1 and 100.`);
      return;
    }
    
    // Set player's number
    player.currentNumber = number;
    await user.send(`You chose ${number}. Wait for results...`);
  });
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
  
  // Create embed to let winner choose
  const chooseEmbed = new EmbedBuilder()
    .setTitle(`🎯 Round ${gameState.currentRound} - Remove a Life`)
    .setDescription(`<@${winner.id}>, check your DMs to choose a player to lose 1 life.`)
    .setColor(0xff0000);
  
  await channel.send({ embeds: [chooseEmbed] });
  
  // Send DM to winner
  try {
    const user = await channel.client.users.fetch(winner.id);
    const dmEmbed = new EmbedBuilder()
      .setTitle(`🎯 Round ${gameState.currentRound} - Remove a Life`)
      .setDescription(`Choose a player to lose 1 life:`)
      .addFields(
        { name: 'Players', value: alivePlayers.map(p => `<@${p.id}> (${p.lives} ❤️)`).join('\n') },
        { name: 'Instructions', value: `Type:\n**eliminate @username** or **eliminate playerID**` }
      )
      .setColor(0xff0000)
      .setFooter({ text: 'You have 15 seconds to choose' });
    
    await user.send({ embeds: [dmEmbed] });
    
    // Create collector for winner's choice
    const filter = (m: any) => {
      return m.content.toLowerCase().startsWith('eliminate ');
    };
    
    return new Promise(resolve => {
      const collector = user.dmChannel?.createMessageCollector({ filter, time: 15000 });
      
      collector?.on('collect', async (message) => {
        const targetMention = message.content.split(' ')[1];
        
        if (!targetMention) {
          await user.send(`Please specify a valid player.`);
          return;
        }
        
        // Try to find the target by username or ID
        const target = alivePlayers.find(p => {
          const targetUser = message.guild?.members.cache.get(p.id);
          return targetUser && (
            targetUser.nickname === targetMention.replace('@', '') || 
            targetUser.displayName=== targetMention.replace('@', '') ||
            p.id === targetMention.replace('<@', '').replace('>', '')
          );
        });
        
        if (!target) {
          await user.send(`Cannot find player "${targetMention}" to eliminate.`);
          return;
        }
        
        collector.stop();
        await user.send(`You chose to eliminate <@${target.id}>.`);
        resolve(target);
      });
      
      collector?.on('end', (collected: { size: number; }) => {
        if (collected.size === 0) {
          // Time's up - choose random player
          const randomTarget = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
          user.send(`Time's up! Randomly selecting <@${randomTarget.id}> to lose a life.`);
          resolve(randomTarget);
        }
      });
    });
  } catch (error) {
    console.error(`Could not DM winner ${winner.id}:`, error);
    // Fallback: Choose random player
    return alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
  }
}