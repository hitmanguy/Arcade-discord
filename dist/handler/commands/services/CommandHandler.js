"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandHandler = void 0;
const tslib_1 = require("tslib");
const config_1 = tslib_1.__importDefault(require("../../../config"));
const index_1 = require("../../../index");
const LogManager_1 = require("../../utils/LogManager");
const CommandValidator_1 = require("../validators/CommandValidator");
const discord_js_1 = require("discord.js");
class CommandHandler {
    static async handleSlashCommandInteraction(interaction) {
        const command = index_1.client.commands.slash.get(interaction.commandName);
        if (!command) {
            return LogManager_1.LogManager.logError(`No command matching ${interaction.commandName} was found.`);
        }
        if (interaction.isAutocomplete()) {
            return this.handleAutocomplete(interaction, command);
        }
        if (!(await this.checkCommandPermission(command, interaction)))
            return;
        try {
            await command.execute(interaction);
            if (command.logUsage)
                await this.sendUsageLog(interaction, interaction.commandName, 'Slash Command');
        }
        catch (err) {
            LogManager_1.LogManager.logError(`Error executing command ${interaction.commandName}`, err);
        }
    }
    static async handleContextMenuInteraction(interaction) {
        const contextMenu = index_1.client.commands.context.get(interaction.commandName);
        if (!contextMenu) {
            return LogManager_1.LogManager.logError(`No context menu matching ${interaction.commandName} was found.`);
        }
        if (!(await this.checkCommandPermission(contextMenu, interaction)))
            return;
        try {
            await contextMenu.execute(interaction);
            if (contextMenu.logUsage)
                await this.sendUsageLog(interaction, interaction.commandName, 'Context Menu');
        }
        catch (err) {
            LogManager_1.LogManager.logError(`Error executing context menu ${interaction.commandName}`, err);
        }
    }
    static async handlePrefixCommand(message) {
        const commandName = message.content.slice(config_1.default.prefix.length).trim().split(/\s+/)[0];
        const resolvedCommandName = index_1.client.commands.prefixAliases.get(commandName) ?? commandName;
        const command = index_1.client.commands.prefix.get(resolvedCommandName);
        if (!command) {
            return;
        }
        if (!(await this.checkCommandPermission(command, message)))
            return;
        try {
            await command.execute(message);
            if (command.logUsage)
                await this.sendUsageLog(message, resolvedCommandName, 'Prefix Command');
        }
        catch (err) {
            LogManager_1.LogManager.logError(`Error executing prefix command ${resolvedCommandName}`, err);
        }
    }
    static async handleAutocomplete(interaction, command) {
        if (!command.autocomplete) {
            return LogManager_1.LogManager.logError(`No autocomplete in ${interaction.commandName} was found.`);
        }
        try {
            await command.autocomplete(interaction);
        }
        catch (err) {
            LogManager_1.LogManager.logError(`Error executing autocomplete for command ${interaction.commandName}`, err);
        }
    }
    static async checkCommandPermission(command, context) {
        const { allowed, reason, cooldown } = CommandValidator_1.CommandValidator.isAllowedCommand(command, context.user || context.author, context.channel, context.guild, context.member);
        if (allowed)
            return true;
        const reply = cooldown?.timeLeft
            ? config_1.default.deniedCommandReplies.cooldowns[cooldown.type]?.replace('{time}', cooldown.timeLeft.toString())
            : config_1.default.deniedCommandReplies.specific[reason ?? ''] || config_1.default.deniedCommandReplies.general;
        const replyEmbed = new discord_js_1.EmbedBuilder().setColor(discord_js_1.Colors.Red).setTitle(reply);
        await (context.reply?.({
            embeds: [replyEmbed],
            flags: [discord_js_1.MessageFlags.Ephemeral],
        }) || context.channel.send({ embeds: [replyEmbed] }));
        return false;
    }
    static async sendUsageLog(context, commandName, commandType) {
        try {
            const logChannelConfig = config_1.default.logChannelConfig;
            if (!logChannelConfig || logChannelConfig.channelId.length > 0)
                return;
            const channel = await index_1.client.channels.fetch(logChannelConfig.channelId);
            if (!channel)
                return;
            if (channel.isSendable()) {
                await channel.send(await logChannelConfig.message(context, commandName, commandType));
            }
        }
        catch (err) {
            LogManager_1.LogManager.logError(`Error sending command usage log for command ${commandName}`, err);
        }
    }
}
exports.CommandHandler = CommandHandler;
//# sourceMappingURL=CommandHandler.js.map