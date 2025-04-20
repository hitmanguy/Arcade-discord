"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const handler_1 = require("../../handler");
const user_status_1 = require("../../model/user_status");
const GAME_CONSTANTS_1 = require("../../constants/GAME_CONSTANTS");
const discord_js_1 = require("discord.js");
exports.default = new handler_1.Button({
    customId: 'progress-stats',
    async execute(interaction) {
        const user = await user_status_1.User.findOne({ discordId: interaction.user.id });
        if (!user) {
            await interaction.reply({ content: 'User data not found!', ephemeral: true });
            return;
        }
        const statsEmbed = new discord_js_1.EmbedBuilder()
            .setColor(GAME_CONSTANTS_1.PRISON_COLORS.primary)
            .setTitle('📊 Detailed Statistics')
            .addFields({
            name: 'Total Completions',
            value: user.puzzleProgress.reduce((acc, curr) => acc + curr.completionCount, 0).toString(),
            inline: true
        }, {
            name: 'Time in Prison',
            value: `${Math.floor((Date.now() - user.joinedAt.getTime()) / (1000 * 60 * 60 * 24))} days`,
            inline: true
        }, {
            name: 'Current Streak',
            value: user.currentStreak.toString(),
            inline: true
        });
        await interaction.reply({ embeds: [statsEmbed], ephemeral: true });
    },
});
//# sourceMappingURL=handle_progress.js.map