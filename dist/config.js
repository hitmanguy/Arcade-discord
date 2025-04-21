"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const handler_1 = require("./handler");
const discord_js_1 = require("discord.js");
const defaultConfig = {
    prefix: '!',
    customPrefixes: [
        {
            guildId: "GUILD_ID",
            prefix: "?"
        }
    ],
    ownerId: '846343544707874857',
    eventsFolder: 'events',
    commandsFolder: 'commands',
    componentsFolder: 'components',
    defaultIntents: [discord_js_1.GatewayIntentBits.Guilds, discord_js_1.GatewayIntentBits.MessageContent],
    deniedCommandReplies: {
        general: 'You are not allowed to use this command.',
        specific: {
            allowedUsers: 'This command is restricted to specific users.',
            blockedUsers: 'You have been blocked from using this command.',
            allowedChannels: 'This command can only be used in specific channels.',
            blockedChannels: 'This channel is not allowed to use this command.',
            allowedCategories: 'This command is restricted to specific categories.',
            blockedCategories: 'This category is blocked from using this command.',
            allowedGuilds: 'This command is only available in specific servers.',
            blockedGuilds: 'This server is not allowed to use this command.',
            allowedRoles: 'You need a specific role to use this command.',
            blockedRoles: 'You have a role that is blocked from using this command.',
            restrictedToOwner: 'Only the bot owner can use this command.',
            restrictedToNSFW: 'This command can only be used in NSFW channels.',
            isDisabled: 'This command is currently disabled.',
            custom: 'You are not allowed to use this command.',
        },
        cooldowns: {
            user: 'You can use this command again in {time} seconds.',
            guild: 'This command is on cooldown for this server. Try again in {time} seconds.',
            global: 'This command is on global cooldown. Try again in {time} seconds.',
        },
    },
    logChannelConfig: {
        channelId: 'YOUR_LOG_CHANNEL_ID',
        message: async (context, commandName, commandType) => {
            return {
                embeds: [(0, handler_1.getLogChannelPresetEmbed)(context, commandName, commandType)],
            };
        },
    },
};
exports.default = defaultConfig;
//# sourceMappingURL=config.js.map