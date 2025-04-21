"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const handler_1 = require("../../../handler");
const discord_js_1 = require("discord.js");
const Device_schema_1 = require("../../../model/Device_schema");
const user_status_1 = require("../../../model/user_status");
exports.default = new handler_1.SlashCommand({
    registerType: handler_1.RegisterType.Global,
    data: new discord_js_1.SlashCommandBuilder()
        .setName('restart')
        .setDescription('restart your progress and reset your device'),
    async execute(interaction) {
        const device = await Device_schema_1.Device.findOne({ discordId: interaction.user.id });
        const user = await user_status_1.User.findOne({ discordId: interaction.user.id });
        await interaction.deferReply({
            flags: [discord_js_1.MessageFlags.Ephemeral]
        });
        if (user) {
            await user.deleteOne();
            await interaction.editReply({
                content: 'Your progress has been reset. You can now register again.',
            });
        }
        if (device) {
            await device.deleteOne();
            await interaction.editReply({
                content: 'Your device has been reset. You can now register again.',
            });
        }
        if (!user && !device) {
            await interaction.editReply({
                content: 'You have not registered yet. Please register first.',
            });
        }
    }
});
//# sourceMappingURL=restart.js.map