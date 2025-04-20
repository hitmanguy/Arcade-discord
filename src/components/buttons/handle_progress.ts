import { Button } from '../../handler';
import { ButtonInteraction } from 'discord.js';
import { User } from '../../model/user_status';
import { PRISON_COLORS } from '../../constants/GAME_CONSTANTS';
import { EmbedBuilder } from 'discord.js';

export default new Button({
    customId: 'progress-stats',

    async execute(interaction: ButtonInteraction): Promise<void> {
        const user = await User.findOne({ discordId: interaction.user.id });
        if (!user) {
            await interaction.reply({ content: 'User data not found!', ephemeral: true });
            return;
        }

        const statsEmbed = new EmbedBuilder()
            .setColor(PRISON_COLORS.primary)
            .setTitle('📊 Detailed Statistics')
            .addFields(
                { 
                    name: 'Total Completions', 
                    value: user.puzzleProgress.reduce((acc, curr) => acc + curr.completionCount, 0).toString(), 
                    inline: true 
                },
                { 
                    name: 'Time in Prison', 
                    value: `${Math.floor((Date.now() - user.joinedAt.getTime()) / (1000 * 60 * 60 * 24))} days`, 
                    inline: true 
                },
                {
                    name: 'Current Streak',
                    value: user.currentStreak.toString(),
                    inline: true
                }
            );

        await interaction.reply({ embeds: [statsEmbed], ephemeral: true });
    },
});