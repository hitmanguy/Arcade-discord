"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const config_1 = tslib_1.__importDefault(require("../../../config"));
const Event_1 = require("../base/Event");
const index_1 = require("../../../index");
const discord_js_1 = require("discord.js");
const CommandHandler_1 = require("../../commands/services/CommandHandler");
exports.default = new Event_1.Event({
    name: discord_js_1.Events.MessageCreate,
    async execute(message) {
        if (!index_1.client.user || message.author.bot) {
            return;
        }
        let prefix = config_1.default.prefix;
        if (message.guild?.id && config_1.default.customPrefixes) {
            const customPrefix = config_1.default.customPrefixes.find((p) => p.guildId === message.guild.id)?.prefix;
            if (customPrefix)
                prefix = customPrefix;
        }
        if (!message.content.startsWith(prefix)) {
            return;
        }
        await CommandHandler_1.CommandHandler.handlePrefixCommand(message);
    },
});
//# sourceMappingURL=messageCreate.js.map