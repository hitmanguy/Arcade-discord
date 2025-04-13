"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const handler_1 = require("../../../handler");
const discord_js_1 = require("discord.js");
exports.default = new handler_1.SlashCommand({
    registerType: handler_1.RegisterType.Guild,
    data: new discord_js_1.SlashCommandBuilder()
        .setName('autocomplete')
        .setDescription('Explore the autocomplete feature!')
        .addStringOption((option) => option
        .setName('topic')
        .setDescription('Choose a topic from the suggestions')
        .setAutocomplete(true)
        .setRequired(true)),
    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused().toLowerCase();
        const choices = [
            'Getting Started with Discord.js',
            'Building Slash Commands',
            'Understanding Permissions',
            'Working with Autocomplete',
            'Creating Buttons and Select Menus',
            'Error Handling in Discord Bots',
        ];
        const filtered = choices.filter((choice) => choice.toLowerCase().includes(focusedValue));
        await interaction.respond(filtered.map((choice) => ({ name: choice, value: choice })));
    },
    async execute(interaction) {
        const selectedTopic = interaction.options.getString('topic', true);
        await interaction.reply({
            content: `You selected: **${selectedTopic}**`,
        });
    },
});
//# sourceMappingURL=autocomplete.js.map