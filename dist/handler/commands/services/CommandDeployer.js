"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandDeployer = void 0;
const ConfigManager_1 = require("./ConfigManager");
const LogManager_1 = require("../../utils/LogManager");
class CommandDeployer {
    static async deployCommands(registerType, commands) {
        const rest = ConfigManager_1.ConfigManager.setupREST();
        const route = ConfigManager_1.ConfigManager.getRoute(registerType);
        if (!rest || !route)
            return;
        try {
            const data = commands
                .map((command) => command.data)
                .filter(Boolean);
            await rest.put(route, { body: data });
            LogManager_1.LogManager.log(`Successfully uploaded ${data.length} ${registerType} commands.`);
        }
        catch (err) {
            LogManager_1.LogManager.logError('Error uploading commands.', err);
        }
    }
    static async deleteCommands(registerType, commandIds) {
        const rest = ConfigManager_1.ConfigManager.setupREST();
        const route = ConfigManager_1.ConfigManager.getRoute(registerType);
        if (!rest || !route)
            return;
        try {
            await Promise.all(commandIds.map((commandId) => rest.delete(`${route}/${commandId}`)));
            LogManager_1.LogManager.log(`Successfully deleted ${commandIds.length} ${registerType} commands.`);
        }
        catch (err) {
            LogManager_1.LogManager.logError('Error deleting commands.', err);
        }
    }
}
exports.CommandDeployer = CommandDeployer;
//# sourceMappingURL=CommandDeployer.js.map