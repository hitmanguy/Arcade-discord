"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const handler_1 = require("../../handler");
const discord_js_1 = require("discord.js");
exports.default = new handler_1.Modal({
    customId: 'askModal',
    async execute(interaction, fields) {
        const favoriteColor = fields.getTextInputValue('favoriteColor');
        const hobbies = fields.getTextInputValue('hobbies');
        await interaction.reply({
            content: `Your favorite color is **${favoriteColor}** and you enjoy **${hobbies}**!`,
            flags: [discord_js_1.MessageFlags.Ephemeral],
        });
    },
});
//# sourceMappingURL=askModal.js.map