import { 
  TextChannel, 
  EmbedBuilder,
  Client,
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

// Extend Client type to track modal handlers
declare module 'discord.js' {
  interface Client {
    _teamFormationHandler?: boolean;
    _numberSubmissionHandler?: boolean;
    _eliminationHandler?: boolean;
  }
}

export async function runBetrayalRound(channel: TextChannel, gameState: GameState): Promise<void> {
  gameState.resetRound();
  const alivePlayers = gameState.getAlivePlayers();
  const client = channel.client;

  // Register modal handlers
  GameState.registerGlobalHandler(client);
  
  // Handler for team formation
  GameState.registerModalHandler('teamup', async (interaction: Interaction) => {
    if (!interaction.isModalSubmit()) return;
    
    const playerId = interaction.customId.replace('team_modal_', '');
    const player = alivePlayers.find(p => p.id === playerId);
    
    if (!player) {
      await interaction.reply({ content: 'Invalid player.', ephemeral: true });
      return;
    }

    const targetInput = interaction.fields.getTextInputValue('teammate_input');
    const target = alivePlayers.find(p =>
      p.id === targetInput.replace(/[<@!>]/g, '') ||
      p.username.toLowerCase() === targetInput.replace('@', '').toLowerCase()
    );

    if (!target || target.id === player.id) {
      await interaction.reply({ content: 'Invalid teammate selection.', ephemeral: true });
      return;
    }

    if (target.teamUpOffer) {
      await interaction.reply({ content: 'That player already has a pending team-up offer.', ephemeral: true });
      return;
    }

    player.teamUpWith = target.id;
    target.teamUpOffer = player.id;
    gameState.createTeamUp(player.id, target.id);

    await interaction.reply({ 
      content: `Team-up proposed! Waiting for <@${target.id}> to accept...`,
      ephemeral: false 
    });

    // Create accept/reject buttons for the target player
    const responseRow = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`accept_teamup_${player.id}_${target.id}`)
          .setLabel('Accept Team-Up')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`reject_teamup_${player.id}_${target.id}`)
          .setLabel('Reject Team-Up')
          .setStyle(ButtonStyle.Danger)
      );

    await channel.send({
      content: `<@${target.id}>, <@${player.id}> wants to team up with you! You have 10 seconds to respond.`,
      components: [responseRow]
    });
  });

  // Handler for number submission
  GameState.registerModalHandler('betrayal', async (interaction: Interaction) => {
    if (!interaction.isModalSubmit()) return;
    
    const playerId = interaction.customId.replace('betrayal_modal_', '');
    const player = alivePlayers.find(p => p.id === playerId);
    
    if (!player) {
      await interaction.reply({ content: 'You are not a participant in this round.', ephemeral: true });
      return;
    }

    const numberInput = interaction.fields.getTextInputValue('number_input');
    const num = parseInt(numberInput);
    
    if (isNaN(num) || num < 1 || num > 100) {
      await interaction.reply({ content: 'Please enter a valid number between 1 and 100.', ephemeral: true });
      return;
    }

    player.currentNumber = num;

    // If player is in a team, update the team's number
    const team = gameState.getTeamUp(player.id, player.teamUpWith || '');
    if (team && team.accepted) {
      gameState.setTeamUpNumber(team.proposerId, team.targetId, num);
    }

    await interaction.reply({ content: `You chose ${num}. Wait for results...`, ephemeral: true });

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
    .setTitle(`🔢 Round ${gameState.currentRound} - Betrayal Phase`)
    .setDescription(`Three players remain. You can play solo or team up!`)
    .addFields(
      { name: 'Players', value: alivePlayers.map(p => `<@${p.id}> (${p.lives} ❤️)`).join('\n') },
      { name: 'Phase 1', value: '**Team Formation (20 seconds)**\nDecide if you want to team up or play solo.' },
      { name: 'Phase 2', value: '**Number Selection (25 seconds)**\nChoose your numbers - teams must pick the same number!' }
    )
    .setColor(0xcc00ff);

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

  // Create buttons for each player
  const row = new ActionRowBuilder<ButtonBuilder>();
  alivePlayers.forEach(player => {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`team_up_${player.id}`)
        .setLabel(`Team Up (${player.username})`)
        .setStyle(ButtonStyle.Primary)
    );
  });

  const msg = await channel.send({
    content: '### Team Formation Phase (20 seconds)\nClick your button to propose a team-up, or wait to play solo.',
    components: [row]
  });

  // Button collector for team-up proposals
  const collector = channel.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 20000,
    filter: (i: ButtonInteraction) => 
      alivePlayers.some(p => 
        (i.customId === `team_up_${p.id}` && i.user.id === p.id) ||
        i.customId.startsWith('accept_teamup_') ||
        i.customId.startsWith('reject_teamup_')
      )
  });

  collector.on('collect', async (interaction: ButtonInteraction) => {
    if (interaction.customId.startsWith('team_up_')) {
      const playerId = interaction.customId.replace('team_up_', '');
      if (alivePlayers.find(p => p.id === playerId)?.teamUpWith) {
        await interaction.reply({ content: 'You already have a pending team-up request.', ephemeral: true });
        return;
      }

      // Show team-up modal
      const modal = new ModalBuilder()
        .setCustomId(`team_modal_${playerId}`)
        .setTitle('Propose Team-Up')
        .addComponents(
          new ActionRowBuilder<TextInputBuilder>()
            .addComponents(
              new TextInputBuilder()
                .setCustomId('teammate_input')
                .setLabel('Enter teammate\'s name or ID')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('e.g. username or ID')
                .setRequired(true)
            )
        );

      try {
        await interaction.showModal(modal);
      } catch (error) {
        console.error('Modal error:', error);
        await interaction.reply({ 
          content: 'Failed to show team-up form. Please try again.',
          ephemeral: true 
        });
      }
    } else if (interaction.customId.startsWith('accept_teamup_') || interaction.customId.startsWith('reject_teamup_')) {
      const [proposerId, targetId] = interaction.customId.split('_').slice(-2);
      const isAccept = interaction.customId.startsWith('accept_teamup_');

      if (interaction.user.id !== targetId) {
        await interaction.reply({ content: 'This team-up response is not for you.', ephemeral: true });
        return;
      }

      if (isAccept) {
        gameState.acceptTeamUp(proposerId, targetId);
        await interaction.update({ 
          content: `Team-up accepted! <@${proposerId}> and <@${targetId}> are now a team!`,
          components: [] 
        });
      } else {
        // Remove the team-up request
        const proposer = alivePlayers.find(p => p.id === proposerId);
        const target = alivePlayers.find(p => p.id === targetId);
        if (proposer) proposer.teamUpWith = null;
        if (target) target.teamUpOffer = null;

        await interaction.update({ 
          content: `Team-up rejected. <@${targetId}> will play solo.`,
          components: [] 
        });
      }
    }
  });

  // Wait for phase to end
  await new Promise(resolve => setTimeout(resolve, 20000));
  collector.stop();

  // Disable buttons
  try {
    const disabledRow = new ActionRowBuilder<ButtonBuilder>();
    row.components.forEach(btn => 
      disabledRow.addComponents(ButtonBuilder.from(btn).setDisabled(true))
    );
    await msg.edit({ components: [disabledRow] });
  } catch (error) {
    console.error('Failed to disable buttons:', error);
  }

  // Show team formation results
  const teams: string[] = [];
  const soloPlayers: string[] = [];

  alivePlayers.forEach(player => {
    const teamUp = player.teamUpWith ? gameState.getTeamUp(player.id, player.teamUpWith) : null;
    if (teamUp?.accepted) {
      if (!teams.includes(`<@${teamUp.proposerId}> and <@${teamUp.targetId}>`)) {
        teams.push(`<@${teamUp.proposerId}> and <@${teamUp.targetId}>`);
      }
    } else if (!soloPlayers.includes(`<@${player.id}>`)) {
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

async function numberSubmissionPhase(channel: TextChannel, client: Client, gameState: GameState): Promise<void> {
  const alivePlayers = gameState.getAlivePlayers();

  // Send a button for each player to submit their number
  const row = new ActionRowBuilder<ButtonBuilder>();
  alivePlayers.forEach(player => {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`submit_number_${player.id}`)
        .setLabel(`Submit Number (${player.username})`)
        .setStyle(ButtonStyle.Primary)
    );
  });

  const msg = await channel.send({
    content: `### Number Submission Phase (25 seconds)\nPlayers, click your button below to submit your number (1-100).`,
    components: [row],
  });

  // Button collector
  const collector = channel.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 25000,
    filter: (i: ButtonInteraction) => alivePlayers.some(p => i.customId === `submit_number_${p.id}` && i.user.id === p.id)
  });

  collector.on('collect', async (buttonInteraction) => {
    const playerId = buttonInteraction.customId.replace('submit_number_', '');
    const player = alivePlayers.find(p => p.id === playerId);
    
    if (!player) {
      await buttonInteraction.reply({ content: 'You are not a participant in this round.', ephemeral: true });
      return;
    }

    if (player.currentNumber !== null) {
      await buttonInteraction.reply({ content: 'You have already submitted your number.', ephemeral: true });
      return;
    }

    // Show modal
    const modal = new ModalBuilder()
      .setCustomId(`betrayal_modal_${player.id}`)
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
      await buttonInteraction.showModal(modal);
    } catch (error) {
      await buttonInteraction.reply({ content: 'Failed to show number input form. Please try again.', ephemeral: true });
    }
  });

  // Wait for the phase to end
  await new Promise(resolve => setTimeout(resolve, 25000));
  collector.stop();

  // Disable buttons
  try {
    const disabledRow = new ActionRowBuilder<ButtonBuilder>();
    row.components.forEach(btn => 
      disabledRow.addComponents(ButtonBuilder.from(btn).setDisabled(true))
    );
    await msg.edit({ components: [disabledRow] });
  } catch (error) {
    console.error('Failed to disable buttons:', error);
  }
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
    
    const teamUp = player.teamUpWith ? gameState.getTeamUp(player.id, player.teamUpWith) : null;
    if (teamUp?.accepted) {
      const teammate = alivePlayers.find(p => p.id === (teamUp.proposerId === player.id ? teamUp.targetId : teamUp.proposerId));
      if (teammate) {
        // Check for betrayal
        const betrayal = player.currentNumber !== teammate.currentNumber;
        teams.push({ player1: player, player2: teammate, betrayal });
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
  
  // Check for team victory first
  const loyalTeam = teams.find(t => !t.betrayal);
  if (loyalTeam) {
    // Loyal team automatically wins, third player loses
    winner = loyalTeam.player1;
    const thirdPlayer = soloPlayers[0] || alivePlayers.find(p => 
      p.id !== loyalTeam.player1.id && p.id !== loyalTeam.player2.id
    );
    if (thirdPlayer) {
      loser = thirdPlayer;
    }
  } else {
    // No loyal team - check individual performances
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
    
    // Process betrayal outcomes
    if (teams.length > 0) {
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
  }
  
  // If no loser determined yet, winner chooses
  if (!loser && winner) {
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
    .setDescription(`<@${winner.id}>, choose a player to lose 1 life:`)
    .setColor(0xff0000);

  // Create buttons for each possible target
  const row = new ActionRowBuilder<ButtonBuilder>();
  alivePlayers.forEach(player => {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`eliminate_${player.id}`)
        .setLabel(`${player.username} (${player.lives} ❤️)`)
        .setStyle(ButtonStyle.Danger)
    );
  });

  const msg = await channel.send({ embeds: [chooseEmbed], components: [row] });

  // Button collector for 15 seconds
  return new Promise<Player>(resolve => {
    const collector = channel.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 15000,
      filter: (i: ButtonInteraction) => 
        i.user.id === winner.id && 
        i.customId.startsWith('eliminate_')
    });

    collector.on('collect', async (interaction: ButtonInteraction) => {
      await interaction.deferUpdate();

      const targetId = interaction.customId.replace('eliminate_', '');
      const target = alivePlayers.find(p => p.id === targetId);

      if (!target) {
        await channel.send(`<@${winner.id}> That player is not in the game or already eliminated.`);
        return;
      }

      collector.stop();
      resolve(target);

      // Disable buttons
      const disabledRow = new ActionRowBuilder<ButtonBuilder>();
      row.components.forEach(btn => 
        disabledRow.addComponents(ButtonBuilder.from(btn).setDisabled(true))
      );
      await msg.edit({ components: [disabledRow] });
    });

    collector.on('end', async collected => {
      if (collected.size === 0) {
        // Time's up - choose random player
        const randomTarget = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
        await channel.send(`Time's up! Randomly selecting <@${randomTarget.id}> to lose a life.`);
        resolve(randomTarget);
      }

      // Disable buttons
      const disabledRow = new ActionRowBuilder<ButtonBuilder>();
      row.components.forEach(btn => 
        disabledRow.addComponents(ButtonBuilder.from(btn).setDisabled(true))
      );
      await msg.edit({ components: [disabledRow] });
    });
  });
}































