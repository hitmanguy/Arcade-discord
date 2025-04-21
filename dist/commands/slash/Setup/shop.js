"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const handler_1 = require("../../../handler");
const discord_js_1 = require("discord.js");
const user_status_1 = require("../../../model/user_status");
exports.default = new handler_1.SlashCommand({
    registerType: handler_1.RegisterType.Global,
    data: new discord_js_1.SlashCommandBuilder()
        .setName('shop')
        .setDescription('Buy tools to manage sanity and suspicion'),
    async execute(interaction) {
        await interaction.deferReply({ flags: [discord_js_1.MessageFlags.Ephemeral] });
        const player = await user_status_1.User.findOne({ discordId: interaction.user.id });
        if (!player) {
            await interaction.editReply({ content: 'Player not found.' });
            return;
        }
        const embedContent = `🪙 **Merit Points:** ${player.meritPoints}\n\n` +
            '**Items for Purchase:**\n' +
            '🧪 **Syringe** — Gain +20 Sanity (Cost: 50)\n' +
            '🕒 **Skip a Day** — Lose -25 Suspicion (Cost: 75)\n' +
            '⏱️ **Suspicion Timer** — -1 Suspicion every 5 mins (Cost: 100)\n';
        const row = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder().setCustomId('buy_syringe').setLabel('🧪 Syringe').setStyle(discord_js_1.ButtonStyle.Primary), new discord_js_1.ButtonBuilder().setCustomId('buy_skip').setLabel('🕒 Skip a Day').setStyle(discord_js_1.ButtonStyle.Secondary), new discord_js_1.ButtonBuilder().setCustomId('buy_timer').setLabel('⏱️ Timer').setStyle(discord_js_1.ButtonStyle.Success));
        await interaction.editReply({
            content: embedContent,
            components: [row]
        });
        const collector = interaction.channel?.createMessageComponentCollector({
            componentType: discord_js_1.ComponentType.Button,
            time: 60 * 1000,
        });
        collector?.on('collect', async (btnInt) => {
            await btnInt.deferUpdate();
            if (btnInt.user.id !== interaction.user.id) {
                return btnInt.editReply({ content: 'You cannot use this shop.' });
            }
            let response = '';
            switch (btnInt.customId) {
                case 'buy_syringe': {
                    if (player.meritPoints >= 50) {
                        player.meritPoints -= 50;
                        player.sanity = Math.min(100, player.sanity + 20);
                        response = '🧪 You bought a Syringe! +20 Sanity';
                    }
                    else {
                        response = 'Not enough Merit for a Syringe!';
                    }
                    break;
                }
                case 'buy_skip': {
                    if (player.meritPoints >= 75) {
                        player.meritPoints -= 75;
                        player.suspiciousLevel = Math.max(0, player.suspiciousLevel - 25);
                        response = '🕒 You skipped a day! -25 Suspicion';
                    }
                    else {
                        response = 'Not enough Merit to skip a day!';
                    }
                    break;
                }
                case 'buy_timer': {
                    if (player.meritPoints >= 100) {
                        const hasTimer = player.achievements.includes('TIMER_ACTIVE');
                        if (hasTimer) {
                            response = '⏱️ Timer already active!';
                        }
                        else {
                            player.meritPoints -= 100;
                            player.achievements.push('TIMER_ACTIVE');
                            response = '⏱️ Suspicion Timer activated!';
                        }
                    }
                    else {
                        response = 'Not enough Merit to activate timer!';
                    }
                    break;
                }
            }
            await player.save();
            if (response) {
                await btnInt.editReply({ content: response });
            }
        });
    },
});
//# sourceMappingURL=shop.js.map