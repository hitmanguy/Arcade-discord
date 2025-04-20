import { RegisterType, SlashCommand } from '../../../handler';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  MessageFlags,
  ComponentType,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  EmbedBuilder,
  ColorResolvable,
  AttachmentBuilder
} from 'discord.js';
import { User } from '../../../model/user_status';
import { UserService } from '../../../services/user_services';
import { PRISON_COLORS, PUZZLE_REWARDS, SANITY_EFFECTS, STORYLINE, createProgressBar } from '../../../constants/GAME_CONSTANTS';
import { join } from 'path';

const colours = ['Red', 'Green', 'Yellow', 'Blue'];
const values = [
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
  'Draw Two', 'Skip', 'Reverse',
];
const wilds = ['Wild', 'Draw Four'];

// UNO rewards
const UNO_REWARDS = {
  success: { meritPoints: 25, sanity: 8 },
  failure: { meritPoints: -12, sanity: -5 }
};

function buildDeck(): string[] {
  const deck: string[] = [];
  for (const colour of colours) {
    for (const value of values) {
      const cardVal = `${colour} ${value}`;
      deck.push(cardVal);
      if (value !== '0') deck.push(cardVal);
    }
  }
  for (let i = 0; i < 4; i++) {
    deck.push(...wilds);
  }
  return deck;
}

function shuffleDeck(deck: string[]): string[] {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function canPlay(topCard: string | undefined, card: string | undefined): boolean {
  if (!topCard || !card) return false;
  if (card.includes('Wild') || card.includes('Draw Four')) return true;
  const [topColour, ...topVal] = topCard.split(' ');
  const topValue = topVal.join(' ');
  return card.includes(topColour) || card.includes(topValue);
}

function getValidStartingCard(deck: string[]): string {
  let card = deck.shift()!;
  while (card.includes('Wild') || card.includes('Skip') || card.includes('Reverse') || card.includes('Draw Four')) {
    deck.push(card);
    card = deck.shift()!;
  }
  return card;
}

function reshuffleIfNeeded(deck: string[], discardPile: string[]): void {
  if (deck.length === 0 && discardPile.length > 1) {
    const top = discardPile.pop()!;
    deck.push(...shuffleDeck(discardPile.splice(0)));
    discardPile.push(top);
  }
}

// Utility functions for sanity effects
function corruptText(text: string): string {
  return text.split('').map(char => 
    Math.random() < 0.3 ? char + '\u0336' : char
  ).join('');
}

function addGlitches(text: string): string {
  const glitches = ['̷', '̶', '̸', '̵', '̴'];
  return text.split('').map(char => 
    Math.random() < 0.15 ? char + glitches[Math.floor(Math.random() * glitches.length)] : char
  ).join('');
}

function getRandomGlitchMessage(): string {
  return SANITY_EFFECTS.glitchMessages[Math.floor(Math.random() * SANITY_EFFECTS.glitchMessages.length)];
}

function applyCardDistortion(card: string, sanity: number): string {
  if (sanity < 30) return corruptText(card);
  if (sanity < 50) return addGlitches(card);
  return card;
}

export default new SlashCommand({
  registerType: RegisterType.Guild,

  data: new SlashCommandBuilder()
    .setName('uno')
    .setDescription('Play a quick 4-card UNO match vs bot!'),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    // Fetch user data
    const user = await User.findOne({ discordId: interaction.user.id });
    if (!user) {
      await interaction.editReply('You need to register first! Use `/register` to begin your journey.');
      return;
    }
    const suspicous = user.suspiciousLevel>50;
    const merit = user.meritPoints;
    if(merit<150){
          await interaction.editReply('You dont have enough merit points to play this. You can play the previous game to earn more points');
          return;
      }
      if(suspicous){
        await interaction.editReply('You are too suspicious to play this game. Try again later.');
        return;
      }
    user.survivalDays += 1;
    await user.save();
    // Check for isolation or high suspicion
    if (user.isInIsolation || user.suspiciousLevel >= 80) {
      const embed = new EmbedBuilder()
        .setColor(PRISON_COLORS.danger)
        .setTitle('⚠️ Access Denied')
        .setDescription(user.isInIsolation 
          ? 'You are currently in isolation. Access to games is restricted.'
          : 'Your suspicious behavior has been noted. Access temporarily restricted.')
        .setFooter({ text: 'Try again when your status improves' });
      
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    // Create the attachment for the UNO GIF from local file
    const unoGifPath = join(__dirname, '../../../Gifs/UNO.gif');
    const unoGifAttachment = new AttachmentBuilder(unoGifPath, { name: 'UNO.gif' });

    let deck = shuffleDeck(buildDeck());
    const playerHand = deck.splice(0, 4);
    const botHand = deck.splice(0, 4);
    const discardPile: string[] = [getValidStartingCard(deck)];
    let topCard = discardPile[0];
    let currentColor = topCard.split(' ')[0];
    let isPlayerTurn = true;
    let gameOver = false;

    // Game embed colors based on sanity
    const getGameColor = (): ColorResolvable => {
      if (user.sanity < 30) return PRISON_COLORS.danger;
      if (user.sanity < 50) return PRISON_COLORS.warning;
      return '#FF5722'; // UNO color
    };

    // Create game embed
    const createGameEmbed = (message: string = '') => {
      const embed = new EmbedBuilder()
        .setColor(getGameColor())
        .setTitle('🎮 UNO - You vs Bot')
        .setDescription(
          (user.sanity < 50 ? getRandomGlitchMessage() + '\n\n' : '') +
          `**Top Card: ${user.sanity < 50 ? applyCardDistortion(topCard, user.sanity) : topCard}**\n\n` +
          `Your Hand: ${playerHand.map(c => `\`${user.sanity < 50 ? applyCardDistortion(c, user.sanity) : c}\``).join(', ')}\n` +
          `Bot Hand: ${'🂠'.repeat(botHand.length)}\n\n` +
          (message ? `${message}\n` : '')
        )
        .setImage('attachment://UNO.gif') // Add the GIF reference here
        .addFields(
          { name: 'Turn', value: isPlayerTurn ? 'Your Move' : 'Bot Thinking...', inline: true },
          { name: '🧠 Sanity', value: `${createProgressBar(user.sanity, 100)} ${user.sanity}%`, inline: true }
        )
        .setFooter({ text: user.sanity < 50 ? 'T̷h̸e̵ ̷c̶a̵r̷d̴s̷ ̶h̵a̷v̶e̷ ̵e̷y̶e̵s̷.̵.̸.' : 'Play wisely...' });
      
      return embed;
    };

    const playTurn = async () => {
      if (gameOver) return;
      
      if (playerHand.length === 0) {
        gameOver = true;
        
        // Apply rewards for winning
        await UserService.updateUserStats(interaction.user.id, {
          meritPoints: user.meritPoints + UNO_REWARDS.success.meritPoints,
          sanity: Math.min(user.sanity + UNO_REWARDS.success.sanity, 100),
          totalGamesPlayed: user.totalGamesPlayed + 1,
          totalGamesWon: user.totalGamesWon + 1,
          currentStreak: user.currentStreak + 1
        });
        await UserService.updatePuzzleProgress(interaction.user.id, 'UNO', true);
        
        const winEmbed = new EmbedBuilder()
          .setColor(PRISON_COLORS.success)
          .setTitle('🎉 Victory!')
          .setDescription(
            `You played all your cards and won the UNO match!\n\n` +
            `💰 Rewards:\n` +
            `• Merit Points: +${UNO_REWARDS.success.meritPoints}\n` +
            `• Sanity: +${UNO_REWARDS.success.sanity}\n` +
            `• Win Streak: ${user.currentStreak + 1}`
          )
          .setImage('attachment://UNO.gif') // Keep the GIF in the result screen
          .setFooter({ text: 'Your strategic mind serves you well here...' });

        await interaction.editReply({ 
          embeds: [winEmbed], 
          components: [],
          files: [unoGifAttachment] // Include the GIF file
        });
        return;
      }
      
      if (botHand.length === 0) {
        gameOver = true;
        
        // Apply penalties for losing
        await UserService.updateUserStats(interaction.user.id, {
          meritPoints: Math.max(user.meritPoints + UNO_REWARDS.failure.meritPoints, 0),
          sanity: Math.max(user.sanity + UNO_REWARDS.failure.sanity, 0),
          totalGamesPlayed: user.totalGamesPlayed + 1,
          currentStreak: 0
        });
        await UserService.updatePuzzleProgress(interaction.user.id, 'UNO', false);
        
        const loseEmbed = new EmbedBuilder()
          .setColor(PRISON_COLORS.danger)
          .setTitle('😢 Defeated!')
          .setDescription(
            `The bot played all its cards first!\n\n` +
            `⚠️ Consequences:\n` +
            `• Merit Points: ${UNO_REWARDS.failure.meritPoints}\n` +
            `• Sanity: ${UNO_REWARDS.failure.sanity}\n` +
            `• Win Streak: Reset to 0`
          )
          .setImage('attachment://UNO.gif') // Keep the GIF in the result screen
          .setFooter({ text: user.sanity < 40 ? 'T̵h̸e̵ ̷g̶a̵m̷e̴ ̷p̶l̵a̷y̶s̷ ̵y̷o̶u̵.̷.̸.' : 'Better luck next time...' });

        await interaction.editReply({ 
          embeds: [loseEmbed], 
          components: [],
          files: [unoGifAttachment] // Include the GIF file
        });
        return;
      }

      reshuffleIfNeeded(deck, discardPile);

      if (isPlayerTurn) {
        // Determine playable cards
        let playable = playerHand.filter(c => canPlay(topCard, c));
        
        // Manipulate playable cards based on sanity
        if (user.sanity < 40 && Math.random() < 0.25) {
          // Randomly include unplayable cards or exclude playable ones at low sanity
          if (Math.random() < 0.5 && playerHand.length > playable.length) {
            // Add an unplayable card
            const unplayableCards = playerHand.filter(c => !playable.includes(c));
            if (unplayableCards.length > 0) {
              const randomUnplayable = unplayableCards[Math.floor(Math.random() * unplayableCards.length)];
              playable.push(randomUnplayable);
            }
          } else if (playable.length > 1) {
            // Remove a playable card
            playable.splice(Math.floor(Math.random() * playable.length), 1);
          }
        }

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          (playable.length ? playable : ['Draw Card']).map((card, index) =>
            new ButtonBuilder()
              .setCustomId(`uno:play:${card}:${Date.now()}:${index}`) // Add unique identifier
              .setLabel(user.sanity < 50 ? applyCardDistortion(card, user.sanity) : card)
              .setStyle(ButtonStyle.Primary)
          )
        );

        const response = await interaction.editReply({
          embeds: [createGameEmbed()],
          components: [row],
          files: [unoGifAttachment] // Include the GIF file
        });

        const collector = interaction.channel?.createMessageComponentCollector({
          componentType: ComponentType.Button,
          time: 30000,
          max: 1,
        });

        collector?.on('collect', async (btnInteraction) => {
          if (btnInteraction.user.id !== interaction.user.id) {
            return btnInteraction.reply({ 
              content: 'This is not your game!', 
              flags: [MessageFlags.Ephemeral] 
            });
          }
          const [, , chosen] = btnInteraction.customId.split(':');

          if (chosen === 'Draw Card') {
            reshuffleIfNeeded(deck, discardPile);
            const newCard = deck.shift()!;
            playerHand.push(newCard);
            await btnInteraction.update({
              embeds: [createGameEmbed(user.sanity < 40 
                ? corruptText(`🃏 You drew a card... something feels wrong...`) 
                : `🃏 You drew \`${newCard}\`.`)],
              components: [],
              files: [unoGifAttachment] // Include the GIF file
            });
            isPlayerTurn = false;
            return setTimeout(playTurn, 2000);
          }

          // Check if the card is actually playable (in case of sanity-induced hallucinations)
          if (!canPlay(topCard, chosen)) {
            const sanityPenalty = Math.max(user.sanity - 2, 0);
            await UserService.updateUserStats(interaction.user.id, {
              sanity: sanityPenalty
            });
            
            await btnInteraction.update({
              embeds: [createGameEmbed(user.sanity < 40 
                ? corruptText(`T̸h̵e̵ ̶c̸a̵r̶d̸ ̴r̸e̶j̸e̸c̴t̸s̸ ̷y̵o̵u̸.̶.̴.`) 
                : `❌ \`${chosen}\` can't be played on \`${topCard}\`.`)],
              components: [],
              files: [unoGifAttachment] // Include the GIF file
            });
            return setTimeout(playTurn, 2000);
          }

          playerHand.splice(playerHand.indexOf(chosen), 1);
          discardPile.push(chosen);
          topCard = chosen;

          if (chosen.includes('Wild') || chosen.includes('Draw Four')) {
            const selectId = `uno:choosecolor:${Date.now()}`;
            const colorSelect = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
              new StringSelectMenuBuilder()
                .setCustomId(selectId)
                .setPlaceholder('Choose a color')
                .addOptions(colours.map(color => 
                  new StringSelectMenuOptionBuilder()
                    .setLabel(user.sanity < 50 ? applyCardDistortion(color, user.sanity) : color)
                    .setValue(color)
                ))
            );

            await btnInteraction.update({
              embeds: [createGameEmbed('🎨 Choose a color:')],
              components: [colorSelect],
              files: [unoGifAttachment] // Include the GIF file
            });
            
            const colorCollector = interaction.channel?.createMessageComponentCollector({
              componentType: ComponentType.StringSelect,
              time: 15000,
              max: 1,
              filter: int => int.customId === selectId
            });
            
            colorCollector?.on('collect', async (selectInt) => {
              if (selectInt.user.id !== interaction.user.id) return;
              currentColor = selectInt.values[0];
              
              if (chosen.includes('Draw Four')) {
                reshuffleIfNeeded(deck, discardPile);
                botHand.push(...deck.splice(0, 4));
              }
              
              await selectInt.update({
                embeds: [createGameEmbed(`You chose **${currentColor}**. You played \`${chosen}\`.`)],
                components: [],
                files: [unoGifAttachment] // Include the GIF file
              });
              
              isPlayerTurn = false;
              setTimeout(playTurn, 2000);
            });
            
            return;
          }

          currentColor = chosen.split(' ')[0];

          if (chosen.includes('Draw Two')) {
            reshuffleIfNeeded(deck, discardPile);
            botHand.push(...deck.splice(0, 2));
          }

          if (chosen.includes('Skip') || chosen.includes('Reverse')) {
            await btnInteraction.update({
              embeds: [createGameEmbed(`You played \`${chosen}\`. Bot's turn skipped!`)],
              components: [],
              files: [unoGifAttachment] // Include the GIF file
            });
            return setTimeout(() => {
              isPlayerTurn = true;
              playTurn();
            }, 2000);
          }

          await btnInteraction.update({
            embeds: [createGameEmbed(`✅ You played \`${chosen}\`.`)],
            components: [],
            files: [unoGifAttachment] // Include the GIF file
          });
          
          isPlayerTurn = false;
          setTimeout(playTurn, 2000);
        });

        collector?.on('end', (collected) => {
          if (collected.size === 0 && !gameOver) {
            // Timeout penalty
            UserService.updateUserStats(interaction.user.id, {
              sanity: Math.max(user.sanity - 3, 0),
              suspiciousLevel: Math.min(user.suspiciousLevel + 5, 100)
            });

            // Pick a random card or draw
            let timeoutMessage = '';
            if (playable.length > 0) {
              const randomPlay = playable[Math.floor(Math.random() * playable.length)];
              playerHand.splice(playerHand.indexOf(randomPlay), 1);
              discardPile.push(randomPlay);
              topCard = randomPlay;
              currentColor = randomPlay.split(' ')[0];
              timeoutMessage = `You hesitated! A random card \`${randomPlay}\` was played for you.`;
            } else {
              const newCard = deck.shift()!;
              playerHand.push(newCard);
              timeoutMessage = `Time's up! You drew \`${newCard}\`.`;
            }

            interaction.editReply({
              embeds: [createGameEmbed(user.sanity < 40 
                ? corruptText(timeoutMessage) 
                : timeoutMessage)],
              components: [],
              files: [unoGifAttachment] // Include the GIF file
            });

            isPlayerTurn = false;
            setTimeout(playTurn, 2000);
          }
        });
        collector?.on('end', (collected) => {
          if (collected.size === 0 && !gameOver) {
            try {
              UserService.updateUserStats(interaction.user.id, {
                sanity: Math.max(user.sanity - 3, 0),
                suspiciousLevel: Math.min(user.suspiciousLevel + 5, 100)
              });
  
              let timeoutMessage = '';
              if (playable.length > 0) {
                const randomPlay = playable[Math.floor(Math.random() * playable.length)];
                const idx = playerHand.indexOf(randomPlay);
                if (idx !== -1) playerHand.splice(idx, 1);
                discardPile.push(randomPlay);
                topCard = randomPlay;
                currentColor = randomPlay.split(' ')[0];
                timeoutMessage = `You hesitated! A random card \`${randomPlay}\` was played for you.`;
              } else {
                const newCard = deck.shift();
                if (newCard) playerHand.push(newCard);
                timeoutMessage = `Time's up! You drew \`${newCard ?? 'nothing'}\`.`;
              }
              interaction.editReply({
                embeds: [createGameEmbed(user.sanity < 40 
                  ? corruptText(timeoutMessage) 
                  : timeoutMessage)],
                components: [],
                files: [unoGifAttachment]
              });
  
              isPlayerTurn = false;
              setTimeout(playTurn, 2000);
            } catch (err) {
              console.error('Error in UNO collector end:', err);
            }
          }
        });
      } else {
        // Bot's turn
        const playable = botHand.filter(c => canPlay(topCard, c));
        let botPlayMessage = '';
        
        if (playable.length === 0) {
          reshuffleIfNeeded(deck, discardPile);
          const drawn = deck.shift()!;
          botHand.push(drawn);
          botPlayMessage = `🤖 Bot drew a card.`;
        } else {
          // Simple bot strategy - play random card
          const chosen = playable[Math.floor(Math.random() * playable.length)];
          botHand.splice(botHand.indexOf(chosen), 1);
          discardPile.push(chosen);
          topCard = chosen;
          
          // Handle wild cards
          if (chosen.includes('Wild') || chosen.includes('Draw Four')) {
            // Choose most common color in bot's hand, or random if none
            const colorCounts = {} as Record<string, number>;
            botHand.forEach(card => {
              if (!card.includes('Wild') && !card.includes('Draw Four')) {
                const cardColor = card.split(' ')[0];
                colorCounts[cardColor] = (colorCounts[cardColor] || 0) + 1;
              }
            });
            
            let maxCount = 0;
            let dominantColor = colours[Math.floor(Math.random() * colours.length)];
            
            for (const [color, count] of Object.entries(colorCounts)) {
              if (count > maxCount) {
                maxCount = count;
                dominantColor = color;
              }
            }
            
            currentColor = dominantColor;
            botPlayMessage = `🤖 Bot played \`${chosen}\` and chose color **${currentColor}**!`;
            
            if (chosen.includes('Draw Four')) {
              reshuffleIfNeeded(deck, discardPile);
              playerHand.push(...deck.splice(0, 4));
              botPlayMessage += user.sanity < 40 ? 
                corruptText(`\n⚠️ Y̴o̶u̸ ̵d̸r̶a̸w̶ ̷f̵o̴u̶r̶ ̸c̸a̶r̸d̵s̴.̸.̸.`) : 
                `\n⚠️ You drew four cards!`;
            }
          } else {
            currentColor = chosen.split(' ')[0];
            botPlayMessage = `🤖 Bot played \`${chosen}\`.`;
            
            if (chosen.includes('Draw Two')) {
              reshuffleIfNeeded(deck, discardPile);
              playerHand.push(...deck.splice(0, 2));
              botPlayMessage += user.sanity < 40 ? 
                corruptText(`\n⚠️ Y̴o̶u̸ ̵d̸r̶a̸w̶ ̷t̵w̴o̶ ̸c̸a̶r̸d̵s̴.̸.̸.`) : 
                `\n⚠️ You drew two cards!`;
            }
          }

          // Handle Skip or Reverse
          if (chosen.includes('Skip') || chosen.includes('Reverse')) {
            botPlayMessage += user.sanity < 40 ? 
              corruptText(`\n⚠️ Y̴o̶u̸r̵ ̵t̸u̵r̸n̸ ̸i̵s̴ ̷s̴k̴i̵p̸p̶e̷d̶!`) : 
              `\n⚠️ Your turn is skipped!`;
            isPlayerTurn = false;
          } else {
            isPlayerTurn = true;
          }
        }

        // Add UNO call for bot (when bot has 1 card left)
        if (botHand.length === 1) {
          botPlayMessage += user.sanity < 30 ? 
            corruptText(`\n🔊 *B̵̫̓o̶̙͐t̷̩̍ ̶̯̇c̵͍̾a̶̞̎l̷̠̈́l̴̳̓s̶͉̓ ̵̮̏Ū̵̱N̸̜̄O̶͚̓!̸͉̈́*`) : 
            '\n🔊 *Bot calls UNO!*';
        }

        await interaction.editReply({
          embeds: [createGameEmbed(botPlayMessage)],
          components: [],
          files: [unoGifAttachment] // Include the GIF file
        });

        setTimeout(playTurn, 2000);
      }
    };

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(getGameColor())
          .setTitle('🎮 UNO - You vs Bot!')
          .setDescription(
            `${user.sanity < 50 ? getRandomGlitchMessage() + '\n\n' : ''}` +
            `Your Hand: ${playerHand.length} cards\n` +
            `Bot Hand: ${botHand.length} cards\n\n` +
            `Dealing cards${user.sanity < 30 ? '̶.̵.̸.̵' : '...'}`
          )
          .setImage('attachment://UNO.gif') // Include the GIF in the initial screen
          .setFooter({ text: 'Game starting...' })
      ],
      components: [],
      files: [unoGifAttachment] // Include the GIF file
    });

    setTimeout(playTurn, 1000);
  },
});

function getColorFromPrisonColor(colorKey: keyof typeof PRISON_COLORS): ColorResolvable {
  return PRISON_COLORS[colorKey] as ColorResolvable;
}