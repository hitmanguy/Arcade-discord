"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const handler_1 = require("../../../handler");
const discord_js_1 = require("discord.js");
exports.default = new handler_1.SlashCommand({
    registerType: handler_1.RegisterType.Guild,
    data: new discord_js_1.SlashCommandBuilder()
        .setName('selectmenu')
        .setDescription('Choose your favorite animal!')
        .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.SendMessages),
    async execute(interaction) {
        const menu = new discord_js_1.StringSelectMenuBuilder()
            .setCustomId('selectMenu')
            .setPlaceholder('Choose wisely...')
            .setMinValues(1)
            .setMaxValues(1)
            .addOptions({
            label: 'Cats',
            description: 'Choose this if you like cats',
            value: 'cats',
            emoji: '🐱',
        }, {
            label: 'Dogs',
            description: 'Choose this if you like dogs',
            value: 'dogs',
            emoji: '🐶',
        }, {
            label: 'Birds',
            description: 'Choose this if you like birds',
            value: 'birds',
            emoji: '🐦',
        });
        const row = new discord_js_1.ActionRowBuilder().addComponents(menu);
        await interaction.reply({ content: 'Pick your favorite animal:', components: [row] });
    },
});
//# sourceMappingURL=selectMenu.js.map