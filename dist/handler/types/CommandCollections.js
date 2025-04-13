"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emptyCommandCooldownCollections = exports.emptyCommandCollections = void 0;
const discord_js_1 = require("discord.js");
exports.emptyCommandCollections = {
    slash: new discord_js_1.Collection(),
    context: new discord_js_1.Collection(),
    prefix: new discord_js_1.Collection(),
    prefixAliases: new discord_js_1.Collection(),
};
exports.emptyCommandCooldownCollections = {
    user: new discord_js_1.Collection(),
    guild: new discord_js_1.Collection(),
    global: new discord_js_1.Collection(),
};
//# sourceMappingURL=CommandCollections.js.map