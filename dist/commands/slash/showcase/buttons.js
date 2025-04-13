"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const handler_1 = require("../../../handler");
const discord_js_1 = require("discord.js");
exports.default = new handler_1.SlashCommand({
    registerType: handler_1.RegisterType.Guild,
    data: new discord_js_1.SlashCommandBuilder()
        .setName('buttons')
        .setDescription('Try out these interactive buttons!'),
    async execute(interaction) {
        const row = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId('buttons:confirm')
            .setLabel('Confirm')
            .setStyle(discord_js_1.ButtonStyle.Success), new discord_js_1.ButtonBuilder()
            .setCustomId('buttons:cancel')
            .setLabel('Cancel')
            .setStyle(discord_js_1.ButtonStyle.Secondary), new discord_js_1.ButtonBuilder()
            .setCustomId('buttons:info')
            .setLabel('More Info')
            .setStyle(discord_js_1.ButtonStyle.Primary));
        await interaction.reply({
            content: 'Here are some interactive buttons. Try them out!',
            components: [row],
            flags: [discord_js_1.MessageFlags.Ephemeral],
        });
    },
});
//# sourceMappingURL=buttons.js.map