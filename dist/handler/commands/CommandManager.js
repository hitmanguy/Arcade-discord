"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandManager = void 0;
const RegisterType_1 = require("../types/RegisterType");
const CommandDeployer_1 = require("./services/CommandDeployer");
const CommandRegistrar_1 = require("./services/CommandRegistrar");
class CommandManager {
    static async registerCommands(client) {
        await CommandRegistrar_1.CommandRegistrar.registerCommands(client);
    }
    static async reloadCommands(client) {
        await CommandRegistrar_1.CommandRegistrar.reloadCommands(client);
    }
    static async deployCommands(client) {
        const { guildCommands, globalCommands } = this.categorizeCommands(client);
        await Promise.all([
            guildCommands.length && CommandDeployer_1.CommandDeployer.deployCommands(RegisterType_1.RegisterType.Guild, guildCommands),
            globalCommands.length && CommandDeployer_1.CommandDeployer.deployCommands(RegisterType_1.RegisterType.Global, globalCommands),
        ]);
    }
    static async deleteCommands(registerType, commandIds) {
        await CommandDeployer_1.CommandDeployer.deleteCommands(registerType, commandIds);
    }
    static categorizeCommands(client) {
        const guildCommands = [];
        const globalCommands = [];
        [client.commands.slash, client.commands.context].forEach((commandCollection) => {
            commandCollection.forEach((command) => {
                (command.registerType === RegisterType_1.RegisterType.Guild ? guildCommands : globalCommands).push(command);
            });
        });
        return { guildCommands, globalCommands };
    }
}
exports.CommandManager = CommandManager;
//# sourceMappingURL=CommandManager.js.map