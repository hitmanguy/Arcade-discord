"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const handler_1 = require("../handler");
const user_status_1 = require("../model/user_status");
exports.default = new handler_1.Event({
    name: discord_js_1.Events.ClientReady,
    once: true,
    async execute() {
        setInterval(async () => {
            try {
                const users = await user_status_1.User.find({ suspiciousLevel: { $gt: 0 } });
                for (const user of users) {
                    user.suspiciousLevel = Math.max(0, user.suspiciousLevel - 1);
                    if (user.suspiciousLevel > 50) {
                        user.isInIsolation = true;
                    }
                    else {
                        user.isInIsolation = false;
                    }
                    await user.save();
                }
            }
            catch (error) {
                console.error('Error updating suspicion levels:', error);
            }
        }, 300000);
        console.log('Suspicion decay system initialized');
    }
});
//# sourceMappingURL=suspicious.js.map