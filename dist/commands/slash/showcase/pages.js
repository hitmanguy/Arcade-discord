"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const handler_1 = require("../../../handler");
const discord_js_1 = require("discord.js");
exports.default = new handler_1.SlashCommand({
    registerType: handler_1.RegisterType.Guild,
    data: new discord_js_1.SlashCommandBuilder()
        .setName('pages')
        .setDescription('Browse through pages of information!'),
    async execute(interaction) {
        const pages = [
            new discord_js_1.EmbedBuilder()
                .setTitle('Welcome to the Paginator')
                .setDescription('This is **Page 1** of the paginator.')
                .setColor(discord_js_1.Colors.Blue),
            {
                embed: new discord_js_1.EmbedBuilder()
                    .setTitle('Page 2 with Buttons')
                    .setDescription('Here is **Page 2** with custom buttons.')
                    .setColor(discord_js_1.Colors.Green),
                components: [
                    new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
                        .setCustomId('buttons:confirm')
                        .setLabel('Confirm')
                        .setStyle(discord_js_1.ButtonStyle.Success), new discord_js_1.ButtonBuilder()
                        .setCustomId('buttons:cancel')
                        .setLabel('Cancel')
                        .setStyle(discord_js_1.ButtonStyle.Danger)),
                ],
            },
            new discord_js_1.EmbedBuilder()
                .setTitle('Page 3')
                .setDescription('Finally, this is **Page 3**. Enjoy!')
                .setColor(discord_js_1.Colors.Red),
        ];
        const paginator = new handler_1.EmbedPaginator({
            pages,
            timeout: 60,
            autoPageDisplay: true,
        });
        await paginator.send({ context: interaction });
    },
});
//# sourceMappingURL=pages.js.map