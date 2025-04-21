"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../../../index");
const handler_1 = require("../../../handler");
const discord_js_1 = require("discord.js");
exports.default = new handler_1.SlashCommand({
    restrictedToOwner: true,
    registerType: handler_1.RegisterType.Guild,
    data: new discord_js_1.SlashCommandBuilder()
        .setName('reload')
        .setDescription('Reloads all events, commands, and components.'),
    async execute(interaction) {
        const embed = new discord_js_1.EmbedBuilder();
        try {
            await index_1.client.reloadEvents();
            await index_1.client.reloadCommands();
            await index_1.client.reloadComponents();
            embed
                .setTitle('Reload Successful')
                .setColor(discord_js_1.Colors.Green);
        }
        catch (err) {
            embed
                .setTitle('Reload Failed')
                .setDescription('An error occurred while reloading.')
                .setColor(discord_js_1.Colors.Red);
        }
        await interaction.reply({ embeds: [embed], flags: [discord_js_1.MessageFlags.Ephemeral] });
    },
});
//# sourceMappingURL=reload.js.map