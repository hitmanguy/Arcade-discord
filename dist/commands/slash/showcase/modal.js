"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const handler_1 = require("../../../handler");
const discord_js_1 = require("discord.js");
exports.default = new handler_1.SlashCommand({
    registerType: handler_1.RegisterType.Guild,
    data: new discord_js_1.SlashCommandBuilder()
        .setName('modal')
        .setDescription('Share your favorite color and hobbies'),
    async execute(interaction) {
        const modal = new discord_js_1.ModalBuilder()
            .setCustomId('askModal')
            .setTitle('Tell us about yourself!');
        const colorInput = new discord_js_1.TextInputBuilder()
            .setCustomId('favoriteColor')
            .setLabel("What's your favorite color?")
            .setPlaceholder('e.g., Blue')
            .setStyle(discord_js_1.TextInputStyle.Short);
        const hobbiesInput = new discord_js_1.TextInputBuilder()
            .setCustomId('hobbies')
            .setLabel("What's one of your favorite hobbies?")
            .setPlaceholder('e.g., Reading books')
            .setStyle(discord_js_1.TextInputStyle.Paragraph);
        const colorRow = new discord_js_1.ActionRowBuilder().addComponents(colorInput);
        const hobbiesRow = new discord_js_1.ActionRowBuilder().addComponents(hobbiesInput);
        modal.addComponents(colorRow, hobbiesRow);
        await interaction.showModal(modal);
    },
});
//# sourceMappingURL=modal.js.map