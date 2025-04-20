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
import { User } from '../model/user_status';
import { PRISON_COLORS, SANITY_EFFECTS } from '../constants/GAME_CONSTANTS';

// Extend Client type to track modal handlers
declare module 'discord.js' {
  interface Client {
    _teamFormationHandler?: boolean;
    _numberSubmissionHandler?: boolean;
    _eliminationHandler?: boolean;
  }
}

export async function runBetrayalRound(channel: TextChannel, gameState: GameState): Promise<void> {
  // Reset for new round
  await gameState.resetRound();
  const alivePlayers = gameState.getAlivePlayers();

  // Get player sanity levels
  const playerSanity = new Map<string, number>();
  for (const player of alivePlayers) {
    const user = await User.findOne({ discordId: player.id });
    if (user) {
      playerSanity.set(player.id, user.sanity);
    }
  }

  // First phase: Team formation with trust mechanics
  const teamPhaseEmbed = new EmbedBuilder()
    .setTitle('🤝 Trust Protocol - Team Formation')
    .setDescription(playerSanity.get(gameState.hostId)! < 40
      ? 'A̷l̷l̷i̷e̷s̷ ̷o̷r̷ ̷e̷n̷e̷m̷i̷e̷s̷?̷ ̷T̷h̷e̷ ̷l̷i̷n̷e̷s̷ ̷b̷l̷u̷r̷.̷.̷.'
      : 'Form alliances or go solo. Choose wisely - trust is a fragile thing.')
    .addFields(
      { name: 'Subjects', value: alivePlayers.map(p => {
          const sanity = playerSanity.get(p.id) || 100;
          return sanity < 40 
            ? `<@${p.id}> (${p.lives} ❤️) [S̷a̷n̷i̷t̷y̷:̷ ${sanity}%]`
            : `<@${p.id}> (${p.lives} ❤️)`;
        }).join('\n') 
      }
    )
    .setColor(playerSanity.get(gameState.hostId)! < 30 ? PRISON_COLORS.danger : PRISON_COLORS.warning);

  // Create team up buttons
  const teamButtons: ActionRowBuilder<ButtonBuilder>[] = [];
  alivePlayers.forEach(player => {
    const row = new ActionRowBuilder<ButtonBuilder>();
    alivePlayers.forEach(target => {
      if (player.id !== target.id) {
        const sanity = playerSanity.get(player.id) || 100;
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`team_${player.id}_${target.id}`)
            .setLabel(sanity < 40 
              ? `T̷r̷u̷s̷t̷ ${target.username}?`
              : `Team with ${target.username}`)
            .setStyle(sanity < 30 ? ButtonStyle.Danger : ButtonStyle.Primary)
        );
      }
    });
    if (row.components.length > 0) {
      teamButtons.push(row);
    }
  });

  const teamMsg = await channel.send({ embeds: [teamPhaseEmbed], components: teamButtons });

  // Team formation phase (20 seconds)
  const teamCollector = channel.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 20000,
    filter: (i: ButtonInteraction) => i.customId.startsWith('team_')
  });

  teamCollector.on('collect', async (interaction: ButtonInteraction) => {
    const [_, proposerId, targetId] = interaction.customId.split('_');
    if (interaction.user.id !== proposerId) {
      await interaction.reply({
        content: playerSanity.get(proposerId)! < 40
          ? 'Y̷o̷u̷ ̷c̷a̷n̷n̷o̷t̷ ̷f̷o̷r̷c̷e̷ ̷t̷r̷u̷s̷t̷.̷.̷.'
          : 'You can only make team proposals for yourself.',
        ephemeral: true
      });
      return;
    }

    const existingTeam = gameState.getTeamUp(proposerId, targetId);
    if (existingTeam) {
      await interaction.reply({
        content: playerSanity.get(proposerId)! < 40
          ? 'T̷h̷e̷ ̷b̷o̷n̷d̷ ̷a̷l̷r̷e̷a̷d̷y̷ ̷e̷x̷i̷s̷t̷s̷.̷.̷.'
          : 'A team proposal already exists between these players.',
        ephemeral: true
      });
      return;
    }

    const teamUp = gameState.createTeamUp(proposerId, targetId);
    const proposer = alivePlayers.find(p => p.id === proposerId)!;
    const target = alivePlayers.find(p => p.id === targetId)!;

    // Create accept/reject buttons
    const responseRow = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`accept_${proposerId}_${targetId}`)
          .setLabel(playerSanity.get(targetId)! < 40 ? 'T̷r̷u̷s̷t̷' : 'Accept')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`reject_${proposerId}_${targetId}`)
          .setLabel(playerSanity.get(targetId)! < 40 ? 'B̷e̷t̷r̷a̷y̷' : 'Reject')
          .setStyle(ButtonStyle.Danger)
      );

    const proposalEmbed = new EmbedBuilder()
      .setTitle('🤝 Team Proposal')
      .setDescription(playerSanity.get(proposerId)! < 40
        ? `<@${proposerId}> r̷e̷a̷c̷h̷e̷s̷ ̷o̷u̷t̷ ̷t̷o̷ ̷<@${targetId}>...`
        : `<@${proposerId}> wants to team up with <@${targetId}>!`)
      .setColor(playerSanity.get(proposerId)! < 30 ? PRISON_COLORS.danger : PRISON_COLORS.primary);

    await interaction.reply({ embeds: [proposalEmbed], components: [responseRow] });

    // Handle accept/reject response
    const responseCollector = interaction.channel!.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 10000,
      filter: (i: ButtonInteraction) => 
        (i.customId === `accept_${proposerId}_${targetId}` || 
         i.customId === `reject_${proposerId}_${targetId}`) &&
        i.user.id === targetId
    });

    responseCollector.on('collect', async (responseInteraction: ButtonInteraction) => {
      const isAccepted = responseInteraction.customId === `accept_${proposerId}_${targetId}`;

      if (isAccepted) {
        await gameState.acceptTeamUp(proposerId, targetId);
        
        // Show number input modal to both players
        const modal = new ModalBuilder()
          .setCustomId(`number_${proposerId}_${targetId}`)
          .setTitle(playerSanity.get(targetId)! < 40 ? 'C̷h̷o̷o̷s̷e̷ ̷W̷i̷s̷e̷l̷y̷' : 'Choose Your Number')
          .addComponents(
            new ActionRowBuilder<TextInputBuilder>()
              .addComponents(
                new TextInputBuilder()
                  .setCustomId('number_input')
                  .setLabel(playerSanity.get(targetId)! < 40 
                    ? 'E̷n̷t̷e̷r̷ ̷y̷o̷u̷r̷ ̷n̷u̷m̷b̷e̷r̷ ̷(̷1̷-̷1̷0̷0̷)̷'
                    : 'Enter your number (1-100)')
                  .setStyle(TextInputStyle.Short)
                  .setRequired(true)
              )
          );

        await responseInteraction.showModal(modal);
      } else {
        const rejectEmbed = new EmbedBuilder()
          .setTitle('💔 Trust Broken')
          .setDescription(playerSanity.get(targetId)! < 40
            ? `<@${targetId}> r̷e̷j̷e̷c̷t̷s̷ ̷t̷h̷e̷ ̷b̷o̷n̷d̷.̷.̷.`
            : `<@${targetId}> has rejected the team proposal.`)
          .setColor(PRISON_COLORS.danger);

        await responseInteraction.update({ embeds: [rejectEmbed], components: [] });
      }
      responseCollector.stop();
    });

    responseCollector.on('end', async (collected) => {
      if (collected.size === 0) {
        const timeoutEmbed = new EmbedBuilder()
          .setTitle('⏱ Time\'s Up')
          .setDescription(playerSanity.get(targetId)! < 40
            ? `<@${targetId}> i̷s̷ ̷l̷o̷s̷t̷ ̷i̷n̷ ̷t̷h̷o̷u̷g̷h̷t̷.̷.̷.`
            : `<@${targetId}> did not respond to the team proposal.`)
          .setColor(PRISON_COLORS.warning);

        await interaction.editReply({ embeds: [timeoutEmbed], components: [] });
      }
    });
  });

  // After team formation, process results
  teamCollector.on('end', async () => {
    // Disable all team buttons
    const disabledTeamButtons = teamButtons.map(row => {
      const newRow = new ActionRowBuilder<ButtonBuilder>();
      row.components.forEach(btn => 
        newRow.addComponents(ButtonBuilder.from(btn as ButtonBuilder).setDisabled(true))
      );
      return newRow;
    });
    await teamMsg.edit({ components: disabledTeamButtons });

    // Process results and apply sanity effects
    await processBetrayal(channel, gameState, playerSanity);
  });
}

async function processBetrayal(
  channel: TextChannel, 
  gameState: GameState,
  playerSanity: Map<string, number>
): Promise<void> {
  const alivePlayers = gameState.getAlivePlayers();
  const teams = gameState.teamUps.filter(t => t.accepted);
  
  // Calculate results for each team and solo players
  const results = new Map<string, number>();
  const teamResults = new Map<string, {number: number, players: Player[]}>();
  
  // Process team submissions
  teams.forEach(team => {
    const proposer = alivePlayers.find(p => p.id === team.proposerId);
    const target = alivePlayers.find(p => p.id === team.targetId);
    
    if (proposer && target && proposer.currentNumber !== null && target.currentNumber !== null) {
      const teamAvg = (proposer.currentNumber + target.currentNumber) / 2;
      teamResults.set(`${team.proposerId}_${team.targetId}`, {
        number: teamAvg,
        players: [proposer, target]
      });
    }
  });
  
  // Process solo players
  alivePlayers.forEach(player => {
    if (!teams.some(t => t.proposerId === player.id || t.targetId === player.id)) {
      if (player.currentNumber !== null) {
        results.set(player.id, player.currentNumber);
      }
    }
  });
  
  // Calculate final average
  const allNumbers = [
    ...Array.from(results.values()),
    ...Array.from(teamResults.values()).map(r => r.number)
  ];
  
  if (allNumbers.length === 0) {
    await channel.send(playerSanity.get(gameState.hostId)! < 40
      ? 'T̷h̷e̷ ̷v̷o̷i̷d̷ ̷s̷w̷a̷l̷l̷o̷w̷s̷ ̷a̷l̷l̷.̷.̷.'
      : 'No valid numbers were submitted. Moving to next round...');
    return;
  }
  
  const average = allNumbers.reduce((a, b) => a + b, 0) / allNumbers.length;
  
  // Find closest to average
  type Result = {
    id: string;
    difference: number;
    number: number;
    isTeam: boolean;
    players: Player[];
  };
  
  const allResults: Result[] = [
    ...Array.from(results.entries()).map(([id, number]) => ({
      id,
      difference: Math.abs(number - average),
      number,
      isTeam: false,
      players: [alivePlayers.find(p => p.id === id)!]
    })),
    ...Array.from(teamResults.entries()).map(([id, data]) => ({
      id,
      difference: Math.abs(data.number - average),
      number: data.number,
      isTeam: true,
      players: data.players
    }))
  ];
  
  allResults.sort((a, b) => a.difference - b.difference);
  const winner = allResults[0];
  
  // Create results embed with sanity effects
  const resultsEmbed = new EmbedBuilder()
    .setTitle('🎲 Trust Protocol Results')
    .setDescription(playerSanity.get(gameState.hostId)! < 40
      ? `T̷h̷e̷ ̷t̷r̷u̷t̷h̷ ̷e̷m̷e̷r̷g̷e̷s̷:̷ ${average.toFixed(2)}`
      : `Average: ${average.toFixed(2)}`)
    .addFields(
      { name: 'Numbers', value: allResults.map(r => {
          const text = r.isTeam
            ? `Team <@${r.players[0].id}> & <@${r.players[1].id}>: ${r.number}`
            : `<@${r.id}>: ${r.number}`;
          return playerSanity.get(r.players[0].id)! < 40
            ? gameState.applyVisualDistortion(text, playerSanity.get(r.players[0].id)!)
            : text;
        }).join('\n')
      }
    )
    .setColor(playerSanity.get(gameState.hostId)! < 30 ? PRISON_COLORS.danger : PRISON_COLORS.primary);

  await channel.send({ embeds: [resultsEmbed] });

  // Handle life reduction for losers
  const losers = allResults.slice(1).flatMap(r => r.players);
  for (const loser of losers) {
    await gameState.reduceLife(loser.id);
    
    const eliminationEmbed = new EmbedBuilder()
      .setTitle(playerSanity.get(loser.id)! < 40 ? '💔 L̷i̷f̷e̷ ̷D̷r̷a̷i̷n̷e̷d̷' : '💔 Life Lost')
      .setDescription(playerSanity.get(loser.id)! < 40
        ? `<@${loser.id}> s̷u̷f̷f̷e̷r̷s̷.̷.̷.̷ ${loser.lives} ❤️ r̷e̷m̷a̷i̷n̷.̷.̷.̷`
        : `<@${loser.id}> lost a life! Lives remaining: ${loser.lives} ❤️`)
      .setColor(PRISON_COLORS.danger);

    if (loser.lives <= 0) {
      eliminationEmbed.addFields({
        name: playerSanity.get(loser.id)! < 40 ? 'E̷l̷i̷m̷i̷n̷a̷t̷e̷d̷' : '☠️ Eliminated',
        value: playerSanity.get(loser.id)! < 40
          ? `<@${loser.id}> i̷s̷ ̷c̷o̷n̷s̷u̷m̷e̷d̷ ̷b̷y̷ ̷t̷h̷e̷ ̷v̷o̷i̷d̷.̷.̷.̷`
          : `<@${loser.id}> has been eliminated!`
      });
    }

    await channel.send({ embeds: [eliminationEmbed] });
  }
}































