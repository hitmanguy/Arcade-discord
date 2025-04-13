"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtendedClient = void 0;
const tslib_1 = require("tslib");
const config_1 = tslib_1.__importDefault(require("../../config"));
const Features_1 = require("../types/Features");
const LogManager_1 = require("../utils/LogManager");
const TerminalColor_1 = require("../types/TerminalColor");
const EventManager_1 = require("../events/EventManager");
const CommandManager_1 = require("../commands/CommandManager");
const ComponentManager_1 = require("../components/ComponentManager");
const Intent_1 = require("../types/Intent");
const discord_js_1 = require("discord.js");
const ComponentCollections_1 = require("../types/ComponentCollections");
const CommandCollections_1 = require("../types/CommandCollections");
class ExtendedClient extends discord_js_1.Client {
    events = [];
    commands = CommandCollections_1.emptyCommandCollections;
    commandCooldowns = CommandCollections_1.emptyCommandCooldownCollections;
    components = ComponentCollections_1.emptyComponentCollections;
    features;
    disabledFeatures;
    uploadCommands;
    startupTime = Date.now();
    constructor(options) {
        super(options);
        this.features = options.features;
        this.disabledFeatures = options.disabledFeatures;
        this.uploadCommands = options.uploadCommands;
    }
    async login(token) {
        if (!token) {
            LogManager_1.LogManager.logError(`Bot token is undefined! ${(0, TerminalColor_1.Gray)('Please provide a valid token in the environment variables.')}`);
            await this.shutdown();
        }
        try {
            await this.initializeFeatures();
            const result = await super.login(token);
            LogManager_1.LogManager.logDefault(`\n  ${(0, TerminalColor_1.Green)(this.user?.tag ?? 'Unknown User')}  ${(0, TerminalColor_1.Gray)('ready in')} ${Date.now() - this.startupTime}ms\n`);
            return result;
        }
        catch (err) {
            LogManager_1.LogManager.logError('Failed to connect to the bot', err);
            await this.shutdown();
            return '';
        }
    }
    async reloadEvents() {
        await EventManager_1.EventManager.reloadEvents(this);
    }
    async reloadCommands() {
        if (this.isEnabledFeature(Features_1.Features.SlashCommands) ||
            this.isEnabledFeature(Features_1.Features.ContextMenus) ||
            this.isEnabledFeature(Features_1.Features.PrefixCommands))
            await CommandManager_1.CommandManager.reloadCommands(this);
    }
    async reloadComponents() {
        if (this.isEnabledFeature(Features_1.Features.Buttons) ||
            this.isEnabledFeature(Features_1.Features.SelectMenus) ||
            this.isEnabledFeature(Features_1.Features.Modals))
            await ComponentManager_1.ComponentManager.reloadComponents(this);
    }
    async deleteCommand(registerType, commandId) {
        await CommandManager_1.CommandManager.deleteCommands(registerType, [commandId]);
    }
    async deleteCommands(registerType, commandIds) {
        await CommandManager_1.CommandManager.deleteCommands(registerType, commandIds);
    }
    async initializeFeatures() {
        await EventManager_1.EventManager.registerEvents(this);
        if (this.options.intents.bitfield === Intent_1.AutomaticIntents)
            this.assignIntents();
        if (this.isEnabledFeature(Features_1.Features.SlashCommands) ||
            this.isEnabledFeature(Features_1.Features.ContextMenus) ||
            this.isEnabledFeature(Features_1.Features.PrefixCommands)) {
            await CommandManager_1.CommandManager.registerCommands(this);
            if (this.uploadCommands)
                await CommandManager_1.CommandManager.deployCommands(this);
        }
        if (this.isEnabledFeature(Features_1.Features.Buttons) ||
            this.isEnabledFeature(Features_1.Features.SelectMenus) ||
            this.isEnabledFeature(Features_1.Features.Modals)) {
            await ComponentManager_1.ComponentManager.registerComponents(this);
        }
    }
    isEnabledFeature(feature) {
        return ((this.features.includes(feature) || this.features.includes(Features_1.Features.All)) &&
            !this.disabledFeatures?.includes(feature));
    }
    assignIntents() {
        const intentBitField = new discord_js_1.IntentsBitField();
        for (const event of this.events) {
            const intents = Intent_1.EventIntentMapping[event];
            if (intents) {
                intentBitField.add(...intents);
            }
        }
        intentBitField.add(...config_1.default.defaultIntents);
        this.options.intents = intentBitField;
    }
    async shutdown() {
        try {
            await this.destroy();
        }
        catch (err) {
            LogManager_1.LogManager.logError('Error during shutdown', err);
        }
        finally {
            process.exit(0);
        }
    }
}
exports.ExtendedClient = ExtendedClient;
//# sourceMappingURL=ExtendedClient.js.map