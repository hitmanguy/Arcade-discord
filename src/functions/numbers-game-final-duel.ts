import { 
  TextChannel, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  ButtonInteraction,
  ComponentType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';
import { GameState, Player } from './numbers-game-state';
import { User } from '../model/user_status';
import { PRISON_COLORS } from '../constants/GAME_CONSTANTS';

export async function runFinalDuelRound(channel: TextChannel, gameState: GameState): Promise<void> {
  await gameState.resetRound();
  const alivePlayers = gameState.getAlivePlayers();
  
  if (alivePlayers.length !== 2) {
    throw new Error('Final duel requires exactly 2 players');
  }

  // Get player sanity levels
  const playerSanity = new Map<string, number>();
  for (const player of alivePlayers) {
    const user = await User.findOne({ discordId: player.id });
    if (user) {
      playerSanity.set(player.id, user.sanity);
    }
  }

  const [player1, player2] = alivePlayers;
  const sanityTexts = new Map<number, string[]>([
    [100, ['stands tall', 'faces their opponent', 'prepares for the final clash']],
    [80, ['trembles slightly', 'eyes dart around', 'grips their resolve']],
    [60, ['sweats nervously', 'questions reality', 'sees shadows move']],
    [40, ['shakes uncontrollably', 'mutters to themselves', 'hears whispers']],
    [20, ['bleeds from their eyes', 'screams silently', 'loses their grip on reality']],
    [0, ['becomes one with the void', 'transcends sanity', 'embraces madness']]
  ]);

  function getSanityText(sanity: number): string {
    const threshold = Math.floor(sanity / 20) * 20;
    const texts = sanityTexts.get(threshold) || sanityTexts.get(0)!;
    return texts[Math.floor(Math.random() * texts.length)];
  }

  // Create the dramatic duel introduction
  const duelEmbed = new EmbedBuilder()
    .setTitle('⚔️ Final Duel - The Ultimate Test')
    .setDescription(playerSanity.get(gameState.hostId)! < 40
      ? 'T̷w̷o̷ ̷e̷n̷t̷e̷r̷.̷.̷.̷ ̷o̷n̷e̷ ̷r̷e̷m̷a̷i̷n̷s̷.̷.̷.̷'
      : 'Two remain. Only one will survive.')
    .addFields(
      { name: '🔵 First Duelist', value: 
        playerSanity.get(player1.id)! < 40
          ? `<@${player1.id}> ${getSanityText(playerSanity.get(player1.id)!)} [S̷a̷n̷i̷t̷y̷:̷ ${playerSanity.get(player1.id)}%]`
          : `<@${player1.id}> ${getSanityText(playerSanity.get(player1.id)!)} [Sanity: ${playerSanity.get(player1.id)}%]`
      },
      { name: '🔴 Second Duelist', value:
        playerSanity.get(player2.id)! < 40
          ? `<@${player2.id}> ${getSanityText(playerSanity.get(player2.id)!)} [S̷a̷n̷i̷t̷y̷:̷ ${playerSanity.get(player2.id)}%]`
          : `<@${player2.id}> ${getSanityText(playerSanity.get(player2.id)!)} [Sanity: ${playerSanity.get(player2.id)}%]`
      }
    )
    .setColor(PRISON_COLORS.danger);

  // Create buttons for both players
  const player1Button = new ButtonBuilder()
    .setCustomId(`duel_${player1.id}`)
    .setLabel(playerSanity.get(player1.id)! < 40 ? 'C̷h̷o̷o̷s̷e̷ ̷F̷a̷t̷e̷' : 'Choose Number')
    .setStyle(playerSanity.get(player1.id)! < 30 ? ButtonStyle.Danger : ButtonStyle.Primary);

  const player2Button = new ButtonBuilder()
    .setCustomId(`duel_${player2.id}`)
    .setLabel(playerSanity.get(player2.id)! < 40 ? 'C̷h̷o̷o̷s̷e̷ ̷F̷a̷t̷e̷' : 'Choose Number')
    .setStyle(playerSanity.get(player2.id)! < 30 ? ButtonStyle.Danger : ButtonStyle.Primary);

  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(player1Button, player2Button);

  const duelMsg = await channel.send({ 
    embeds: [duelEmbed], 
    components: [row] 
  });

  // Create collectors for both players' inputs
  const collector = channel.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 30000,
    filter: (i: ButtonInteraction) => 
      (i.customId === `duel_${player1.id}` && i.user.id === player1.id) ||
      (i.customId === `duel_${player2.id}` && i.user.id === player2.id)
  });

  collector.on('collect', async (interaction: ButtonInteraction) => {
    const playerId = interaction.user.id;
    const player = alivePlayers.find(p => p.id === playerId)!;
    const sanityLevel = playerSanity.get(playerId)!;

    if (player.currentNumber !== null) {
      await interaction.reply({
        content: sanityLevel < 40
          ? 'Y̷o̷u̷r̷ ̷c̷h̷o̷i̷c̷e̷ ̷i̷s̷ ̷s̷e̷a̷l̷e̷d̷.̷.̷.'
          : 'You have already made your choice.',
        ephemeral: true
      });
      return;
    }

    // Create and show the number input modal
    const modal = new ModalBuilder()
      .setCustomId(`duel_number_${playerId}`)
      .setTitle(sanityLevel < 40 ? 'F̷i̷n̷a̷l̷ ̷C̷h̷o̷i̷c̷e̷' : 'Final Choice')
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>()
          .addComponents(
            new TextInputBuilder()
              .setCustomId('number_input')
              .setLabel(sanityLevel < 40 
                ? 'E̷n̷t̷e̷r̷ ̷y̷o̷u̷r̷ ̷n̷u̷m̷b̷e̷r̷ ̷(̷1̷-̷1̷0̷0̷)̷'
                : 'Enter your number (1-100)')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          )
      );

    try {
      await interaction.showModal(modal);
    } catch (err) {
      await interaction.reply({
        content: sanityLevel < 40
          ? 'T̷h̷e̷ ̷v̷o̷i̷d̷ ̷r̷e̷j̷e̷c̷t̷s̷ ̷y̷o̷u̷r̷ ̷c̷h̷o̷i̷c̷e̷.̷.̷.'
          : 'Failed to show number input. Please try again.',
        ephemeral: true
      });
    }
  });

  // Handle modal submissions for final numbers
  const modalHandler = async (interaction: any) => {
    if (!interaction.isModalSubmit()) return;
    if (!interaction.customId.startsWith('duel_number_')) return;

    const playerId = interaction.customId.replace('duel_number_', '');
    const player = alivePlayers.find(p => p.id === playerId)!;
    const sanityLevel = playerSanity.get(playerId)!;

    const numberInput = interaction.fields.getTextInputValue('number_input').trim();
    const num = parseInt(numberInput);

    if (isNaN(num) || num < 1 || num > 100) {
      await interaction.reply({
        content: sanityLevel < 40
          ? 'T̷h̷e̷ ̷n̷u̷m̷b̷e̷r̷s̷.̷.̷.̷ ̷t̷h̷e̷y̷ ̷r̷e̷j̷e̷c̷t̷ ̷y̷o̷u̷.̷.̷.'
          : 'Please enter a valid number between 1 and 100.',
        ephemeral: true
      });
      return;
    }

    player.currentNumber = num;
    await interaction.reply({
      content: sanityLevel < 40
        ? `Y̷o̷u̷r̷ ̷n̷u̷m̷b̷e̷r̷ ̷(̷${num}̷)̷ ̷e̷c̷h̷o̷e̷s̷ ̷i̷n̷ ̷t̷h̷e̷ ̷v̷o̷i̷d̷.̷.̷.̷`
        : `Your final number (${num}) has been submitted!`,
      ephemeral: true
    });

    // Check if both players have submitted
    if (alivePlayers.every(p => p.currentNumber !== null)) {
      collector.stop();
    }
  };

  // Register modal handler
  channel.client.on('interactionCreate', modalHandler);

  collector.on('end', async () => {
    // Clean up modal handler
    channel.client.removeListener('interactionCreate', modalHandler);

    // Disable all buttons
    const disabledRow = new ActionRowBuilder<ButtonBuilder>();
    row.components.forEach(btn => 
      disabledRow.addComponents(ButtonBuilder.from(btn as ButtonBuilder).setDisabled(true))
    );
    await duelMsg.edit({ components: [disabledRow] });

    // Calculate results
    const average = gameState.calculateAverage();
    if (!average) {
      await channel.send(playerSanity.get(gameState.hostId)! < 40
        ? 'T̷h̷e̷ ̷v̷o̷i̷d̷ ̷c̷l̷a̷i̷m̷s̷ ̷a̷l̷l̷.̷.̷.'
        : 'No valid numbers were submitted. The duel is inconclusive.');
      return;
    }

    // Determine winner
    const results = alivePlayers.map(p => ({
      player: p,
      number: p.currentNumber!,
      difference: Math.abs((p.currentNumber || 0) - average)
    }));

    results.sort((a, b) => a.difference - b.difference);
    const winner = results[0].player;
    const loser = results[1].player;

    // Create dramatic reveal
    const revealEmbed = new EmbedBuilder()
      .setTitle(playerSanity.get(gameState.hostId)! < 40 
        ? '🔮 F̷i̷n̷a̷l̷ ̷R̷e̷v̷e̷l̷a̷t̷i̷o̷n̷' 
        : '🔮 Final Revelation')
      .setDescription(playerSanity.get(gameState.hostId)! < 40
        ? `T̷h̷e̷ ̷a̷v̷e̷r̷a̷g̷e̷ ̷r̷e̷v̷e̷a̷l̷s̷:̷ ${average.toFixed(2)}`
        : `The final average: ${average.toFixed(2)}`)
      .addFields(
        { name: 'Numbers Chosen', value: results.map(r => {
            const text = `<@${r.player.id}>: ${r.number}`;
            return playerSanity.get(r.player.id)! < 40
              ? gameState.applyVisualDistortion(text, playerSanity.get(r.player.id)!)
              : text;
          }).join('\n')
        }
      )
      .setColor(PRISON_COLORS.danger);

    await channel.send({ embeds: [revealEmbed] });

    // Eliminate loser
    await gameState.reduceLife(loser.id);

    // Dramatic elimination
    const eliminationEmbed = new EmbedBuilder()
      .setTitle(playerSanity.get(loser.id)! < 40 
        ? '💔 F̷i̷n̷a̷l̷ ̷E̷l̷i̷m̷i̷n̷a̷t̷i̷o̷n̷' 
        : '💔 Final Elimination')
      .setDescription(playerSanity.get(loser.id)! < 40
        ? `<@${loser.id}> i̷s̷ ̷c̷o̷n̷s̷u̷m̷e̷d̷ ̷b̷y̷ ̷t̷h̷e̷ ̷v̷o̷i̷d̷.̷.̷.̷`
        : `<@${loser.id}> has been eliminated!`)
      .addFields(
        { name: playerSanity.get(winner.id)! < 40 
            ? 'V̷i̷c̷t̷o̷r̷' 
            : '👑 Victor', 
          value: playerSanity.get(winner.id)! < 40
            ? `<@${winner.id}> e̷m̷e̷r̷g̷e̷s̷ ̷f̷r̷o̷m̷ ̷t̷h̷e̷ ̷m̷a̷d̷n̷e̷s̷s̷.̷.̷.̷`
            : `<@${winner.id}> is victorious!`
        }
      )
      .setColor(PRISON_COLORS.danger);

    await channel.send({ embeds: [eliminationEmbed] });

    // End the game
    await gameState.endGame();
  });
}