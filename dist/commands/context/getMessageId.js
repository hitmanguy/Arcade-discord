"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const handler_1 = require("../../handler");
const discord_js_1 = require("discord.js");
exports.default = new handler_1.ContextMenu({
    registerType: handler_1.RegisterType.Guild,
    data: new discord_js_1.ContextMenuCommandBuilder()
        .setName('Get Message ID')
        .setType(discord_js_1.ApplicationCommandType.Message),
    async execute(interaction) {
        await interaction.reply({ content: `Message ID: ${interaction.targetId}`, flags: [discord_js_1.MessageFlags.Ephemeral] });
    },
});
//# sourceMappingURL=getMessageId.js.map