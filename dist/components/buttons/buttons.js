"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const handler_1 = require("../../handler");
const discord_js_1 = require("discord.js");
exports.default = new handler_1.Button({
    customId: 'buttons',
    async execute(interaction, uniqueId) {
        await interaction.reply({
            content: `You have pressed the **${uniqueId}** button.`,
            flags: [discord_js_1.MessageFlags.Ephemeral],
        });
    },
});
//# sourceMappingURL=buttons.js.map