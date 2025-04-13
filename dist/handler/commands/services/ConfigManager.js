"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigManager = void 0;
const LogManager_1 = require("../../utils/LogManager");
const RegisterType_1 = require("../../types/RegisterType");
const discord_js_1 = require("discord.js");
class ConfigManager {
    static setupREST() {
        const { CLIENT_TOKEN } = process.env;
        if (!CLIENT_TOKEN) {
            LogManager_1.LogManager.logError('CLIENT_TOKEN is missing. Ensure it is set in the environment.');
            return null;
        }
        return new discord_js_1.REST({ version: '10' }).setToken(CLIENT_TOKEN);
    }
    static getRoute(registerType) {
        const { CLIENT_ID, GUILD_ID } = process.env;
        if (!CLIENT_ID) {
            LogManager_1.LogManager.logError('CLIENT_ID is missing. Ensure it is set in the environment.');
            return null;
        }
        if (registerType === RegisterType_1.RegisterType.Guild && !GUILD_ID) {
            LogManager_1.LogManager.logError('GUILD_ID is required for guild commands but is missing.');
            return null;
        }
        return registerType === RegisterType_1.RegisterType.Guild
            ? discord_js_1.Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID)
            : discord_js_1.Routes.applicationCommands(CLIENT_ID);
    }
}
exports.ConfigManager = ConfigManager;
//# sourceMappingURL=ConfigManager.js.map