"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const handler_1 = require("../../handler");
exports.default = new handler_1.PrefixCommand({
    name: 'ping',
    aliases: ['peng'],
    userCooldown: 10,
    async execute(message) {
        await message.reply('Pong!');
    },
});
//# sourceMappingURL=ping.js.map