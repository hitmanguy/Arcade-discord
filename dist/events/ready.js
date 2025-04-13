"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const handler_1 = require("../handler");
const discord_js_1 = require("discord.js");
exports.default = new handler_1.Event({
    name: discord_js_1.Events.ClientReady,
    once: true,
    async execute(client) {
        client.user?.setStatus(discord_js_1.PresenceUpdateStatus.Online);
        client.user?.setActivity('Development', { type: discord_js_1.ActivityType.Watching });
    },
});
//# sourceMappingURL=ready.js.map