"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventManager = void 0;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const config_1 = tslib_1.__importDefault(require("../../config"));
const Event_1 = require("./base/Event");
const Features_1 = require("../types/Features");
const LogManager_1 = require("../utils/LogManager");
const ModuleManager_1 = require("../utils/ModuleManager");
class EventManager {
    static DEFAULT_LISTENER_PATH = path_1.default.join(__dirname, '../../handler/events/listeners');
    static folderPaths = [
        path_1.default.join(__dirname, `../../${config_1.default.eventsFolder}`),
        this.DEFAULT_LISTENER_PATH,
    ];
    static async registerEvents(client) {
        const pathsToLoad = client.isEnabledFeature(Features_1.Features.Events)
            ? this.folderPaths
            : [this.DEFAULT_LISTENER_PATH];
        try {
            for (const folderPath of pathsToLoad) {
                const eventFiles = await ModuleManager_1.ModuleManager.getAllModulePaths(folderPath);
                const eventModules = await Promise.all(eventFiles.map(ModuleManager_1.ModuleManager.importModule));
                eventModules.forEach((module, index) => {
                    const event = module?.default;
                    if (event instanceof Event_1.Event) {
                        this.registerEvent(client, event, eventFiles[index]);
                    }
                    else {
                        LogManager_1.LogManager.logError(`Invalid event in file: ${eventFiles[index]}. Expected an instance of Event.`);
                    }
                });
            }
        }
        catch (err) {
            LogManager_1.LogManager.logError('Error registering events', err);
        }
    }
    static async reloadEvents(client) {
        if (!client.isEnabledFeature(Features_1.Features.Events))
            return;
        try {
            client.events = [];
            client.removeAllListeners();
            await Promise.all(this.folderPaths.map(ModuleManager_1.ModuleManager.clearModulesInDirectory));
            await this.registerEvents(client);
        }
        catch (err) {
            LogManager_1.LogManager.logError('Error reloading events', err);
        }
    }
    static registerEvent(client, event, filePath) {
        if (!client.events.includes(event.name))
            client.events.push(event.name);
        client[event.once ? 'once' : 'on'](event.name, (...args) => {
            event.execute(...args).catch((err) => LogManager_1.LogManager.logError(`Error executing event ${event.name}:`, err));
        });
    }
}
exports.EventManager = EventManager;
//# sourceMappingURL=EventManager.js.map