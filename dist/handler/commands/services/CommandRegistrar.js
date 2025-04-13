"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandRegistrar = void 0;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const config_1 = tslib_1.__importDefault(require("../../../config"));
const Features_1 = require("../../types/Features");
const LogManager_1 = require("../../utils/LogManager");
const PrefixCommand_1 = require("../prefix/PrefixCommand");
const ContextMenu_1 = require("../interactions/ContextMenu");
const ModuleManager_1 = require("../../utils/ModuleManager");
const SlashCommand_1 = require("../interactions/SlashCommand");
const CommandCollections_1 = require("../../types/CommandCollections");
class CommandRegistrar {
    static folderPath = path_1.default.join(__dirname, `../../../${config_1.default.commandsFolder}`);
    static async registerCommands(client) {
        try {
            const commandFiles = await ModuleManager_1.ModuleManager.getAllModulePaths(this.folderPath);
            const commandModules = await Promise.all(commandFiles.map(ModuleManager_1.ModuleManager.importModule));
            commandModules.forEach((module, index) => this.registerCommand(client, module, commandFiles[index]));
        }
        catch (err) {
            LogManager_1.LogManager.logError('Error registering commands', err);
        }
    }
    static async reloadCommands(client) {
        try {
            client.commands = CommandCollections_1.emptyCommandCollections;
            await ModuleManager_1.ModuleManager.clearModulesInDirectory(this.folderPath);
            await this.registerCommands(client);
        }
        catch (err) {
            LogManager_1.LogManager.logError('Error reloading commands', err);
        }
    }
    static registerCommand(client, commandModule, filePath) {
        const { default: command } = commandModule;
        if (!this.isValidCommand(command)) {
            LogManager_1.LogManager.logError(`Invalid command in file: ${filePath}. Expected an instance of a Command class.`);
            return;
        }
        if (command instanceof SlashCommand_1.SlashCommand && client.isEnabledFeature(Features_1.Features.SlashCommands)) {
            client.commands.slash.set(command.data.name, command);
        }
        else if (command instanceof ContextMenu_1.ContextMenu && client.isEnabledFeature(Features_1.Features.ContextMenus)) {
            client.commands.context.set(command.data.name, command);
        }
        else if (command instanceof PrefixCommand_1.PrefixCommand && client.isEnabledFeature(Features_1.Features.PrefixCommands)) {
            client.commands.prefix.set(command.name, command);
            if (command.aliases) {
                command.aliases.forEach((alias) => {
                    client.commands.prefixAliases.set(alias, command.name);
                });
            }
        }
    }
    static isValidCommand(command) {
        return command instanceof SlashCommand_1.SlashCommand || command instanceof ContextMenu_1.ContextMenu || command instanceof PrefixCommand_1.PrefixCommand;
    }
}
exports.CommandRegistrar = CommandRegistrar;
//# sourceMappingURL=CommandRegistrar.js.map