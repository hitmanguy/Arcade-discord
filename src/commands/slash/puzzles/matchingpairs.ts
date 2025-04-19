import { RegisterType, SlashCommand } from '../../../handler';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  ComponentType,
  SlashCommandBuilder,
  MessageFlags,
} from 'discord.js';

const allEmojis = ['🍎', '🍌', '🍇', '🍓', '🍍', '🍉'];
const shuffledPairs = shuffleArray([...allEmojis, ...allEmojis]);

function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export default new SlashCommand({
  registerType: RegisterType.Guild,

  data: new SlashCommandBuilder()
    .setName('matchpairs')
    .setDescription('Play a matching emoji pairs game'),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    let revealed: number[] = [];
    let matched: boolean[] = Array(shuffledPairs.length).fill(false);
    let tilesTurned = 0;
    let gameOver = false;

    const buildGrid = () => {
      const rows: ActionRowBuilder<ButtonBuilder>[] = [];
      for (let row = 0; row < 4; row++) {
        const actionRow = new ActionRowBuilder<ButtonBuilder>();
        for (let col = 0; col < 3; col++) {
          const idx = row * 3 + col;
          const isRevealed = revealed.includes(idx) || matched[idx];
          actionRow.addComponents(
            new ButtonBuilder()
              .setCustomId(`match:${idx}`)
              .setLabel(isRevealed ? shuffledPairs[idx] : '❓')
              .setStyle(isRevealed ? ButtonStyle.Success : ButtonStyle.Secondary)
              .setDisabled(matched[idx])
          );
        }
        rows.push(actionRow);
      }
      return rows;
    };

    const updateGrid = async (content: string) => {
      await interaction.editReply({
        content,
        components: buildGrid(),
      });
    };

    await interaction.reply({
      content: '🎮 **Match the Pairs!** Click the tiles to find pairs.',
      components: buildGrid(),
      flags: [MessageFlags.Ephemeral],
    });

    const collector = interaction.channel?.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 5 * 60 * 1000, // 5 minutes
    });

    collector?.on('collect', async (btnInt) => {
      if (btnInt.user.id !== interaction.user.id || gameOver) {
        return btnInt.reply({ content: 'This is not your game!', ephemeral: true });
      }

      const idx = parseInt(btnInt.customId.split(':')[1]);
      if (revealed.includes(idx) || matched[idx]) return;

      revealed.push(idx);
      tilesTurned++;

      await btnInt.deferUpdate();
      await updateGrid('🔎 You revealed a tile...');

      if (revealed.length === 2) {
        const [first, second] = revealed;
        if (shuffledPairs[first] === shuffledPairs[second]) {
          matched[first] = matched[second] = true;
          await updateGrid('✅ Match found!');
        } else {
          await new Promise((res) => setTimeout(res, 1500));
          await updateGrid('❌ Not a match. Try again!');
        }
        revealed = [];

        if (matched.every(Boolean)) {
          gameOver = true;
          await interaction.editReply({
            content: `🎉 **You matched all pairs!** Total tiles turned: **${tilesTurned}**`,
            components: [],
          });
          collector.stop();
        }
      }
    });

    collector?.on('end', async () => {
      if (!gameOver) {
        await interaction.editReply({
          content: `⏱️ Game over! You matched ${matched.filter(Boolean).length / 2} pairs.`,
          components: [],
        });
      }
    });
  },
});
