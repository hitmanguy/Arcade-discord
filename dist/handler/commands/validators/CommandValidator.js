"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandValidator = void 0;
const tslib_1 = require("tslib");
const config_1 = tslib_1.__importDefault(require("../../../config"));
const index_1 = require("../../../index");
const PrefixCommand_1 = require("../prefix/PrefixCommand");
const discord_js_1 = require("discord.js");
class CommandValidator {
    static isAllowedCommand(command, user, channel, guild, member) {
        const requiredConditions = this.checkConditions(command, user, channel, guild, member);
        if (!requiredConditions.allowed)
            return requiredConditions;
        const optionalConditions = this.checkOptionalConditions(command, user, channel, guild, member);
        if (!optionalConditions.allowed)
            return optionalConditions;
        const cooldown = this.checkCooldown(command, user, guild);
        if (cooldown.onCooldown) {
            return {
                allowed: false,
                reason: null,
                cooldown: { type: cooldown.type, timeLeft: cooldown.timeLeft },
            };
        }
        return { allowed: true, reason: null };
    }
    static checkConditions(command, user, channel, guild, member) {
        const memberRoles = member?.roles;
        const isTextChannel = channel?.type === discord_js_1.ChannelType.GuildText;
        const conditions = {
            allowedUsers: command.allowedUsers?.includes(user.id) ?? true,
            blockedUsers: !(command.blockedUsers?.includes(user.id) ?? false),
            allowedChannels: channel ? (command.allowedChannels?.includes(channel.id) ?? true) : true,
            blockedChannels: channel ? !(command.blockedChannels?.includes(channel.id) ?? false) : true,
            allowedCategories: channel && !channel.isDMBased() && channel.parentId
                ? (command.allowedCategories?.includes(channel.parentId) ?? true)
                : true,
            blockedCategories: channel && !channel.isDMBased() && channel.parentId
                ? !(command.blockedCategories?.includes(channel.parentId) ?? false)
                : true,
            allowedGuilds: guild ? (command.allowedGuilds?.includes(guild.id) ?? true) : true,
            blockedGuilds: guild ? !(command.blockedGuilds?.includes(guild.id) ?? false) : true,
            allowedRoles: memberRoles
                ? (command.allowedRoles?.some((roleId) => memberRoles.cache.has(roleId)) ?? true)
                : true,
            blockedRoles: memberRoles
                ? !(command.blockedRoles?.some((roleId) => memberRoles.cache.has(roleId)) ?? false)
                : true,
            restrictedToOwner: command.restrictedToOwner ? user.id === config_1.default.ownerId : true,
            restrictedToNSFW: command.restrictedToNSFW ? isTextChannel && channel.nsfw : true,
            isDisabled: !command.isDisabled,
        };
        for (const [reason, allowed] of Object.entries(conditions)) {
            if (!allowed) {
                return { allowed: false, reason: reason };
            }
        }
        return { allowed: true, reason: null };
    }
    static checkOptionalConditions(command, user, channel, guild, member) {
        const memberRoles = member?.roles;
        const optionalConditions = [
            command.optionalAllowedUsers?.includes(user.id),
            channel ? command.optionalAllowedChannels?.includes(channel.id) : undefined,
            channel && !channel.isDMBased() && channel.parentId
                ? command.optionalAllowedCategories?.includes(channel.parentId)
                : undefined,
            guild ? command.optionalAllowedGuilds?.includes(guild.id) : undefined,
            memberRoles ? command.optionalAllowedRoles?.some((roleId) => memberRoles.cache.has(roleId)) : undefined,
        ].filter((condition) => condition !== undefined);
        if (optionalConditions.length > 0 && !optionalConditions.some(Boolean)) {
            return { allowed: false, reason: config_1.default.deniedCommandReplies.general };
        }
        return { allowed: true, reason: null };
    }
    static checkCooldown(command, user, guild) {
        const now = Math.floor(Date.now() / 1000);
        const { commandCooldowns } = index_1.client;
        const commandName = command instanceof PrefixCommand_1.PrefixCommand ? command.name : command.data.name;
        const applyCooldown = (key, cooldown, storage) => {
            const expiration = storage.get(key);
            if (expiration && now < parseInt(expiration)) {
                return parseInt(expiration) - now;
            }
            storage.set(key, (now + cooldown).toString());
            return null;
        };
        const userCooldownTime = command.userCooldown
            ? applyCooldown(`${commandName}-${user.id}`, command.userCooldown, commandCooldowns.user)
            : null;
        if (userCooldownTime)
            return { onCooldown: true, type: 'user', timeLeft: userCooldownTime };
        const guildCooldownTime = guild && command.guildCooldown
            ? applyCooldown(`${commandName}-${guild.id}`, command.guildCooldown, commandCooldowns.guild)
            : null;
        if (guildCooldownTime)
            return { onCooldown: true, type: 'guild', timeLeft: guildCooldownTime };
        const globalCooldownTime = command.globalCooldown
            ? applyCooldown(`${commandName}-global`, command.globalCooldown, commandCooldowns.global)
            : null;
        if (globalCooldownTime)
            return { onCooldown: true, type: 'global', timeLeft: globalCooldownTime };
        return { onCooldown: false };
    }
}
exports.CommandValidator = CommandValidator;
//# sourceMappingURL=CommandValidator.js.map