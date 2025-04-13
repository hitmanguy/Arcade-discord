"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Event_1 = require("../base/Event");
const discord_js_1 = require("discord.js");
const CommandHandler_1 = require("../../commands/services/CommandHandler");
const ComponentHandler_1 = require("../../components/services/ComponentHandler");
exports.default = new Event_1.Event({
    name: discord_js_1.Events.InteractionCreate,
    async execute(interaction) {
        if (interaction.isChatInputCommand() || interaction.isAutocomplete()) {
            await CommandHandler_1.CommandHandler.handleSlashCommandInteraction(interaction);
        }
        else if (interaction.isContextMenuCommand()) {
            await CommandHandler_1.CommandHandler.handleContextMenuInteraction(interaction);
        }
        else if (interaction.isButton()) {
            await ComponentHandler_1.ComponentHandler.handleButtonInteraction(interaction);
        }
        else if (interaction.isAnySelectMenu()) {
            await ComponentHandler_1.ComponentHandler.handleAnySelectMenuInteraction(interaction);
        }
        else if (interaction.isModalSubmit()) {
            await ComponentHandler_1.ComponentHandler.handleModalInteraction(interaction);
        }
    },
});
//# sourceMappingURL=interactionCreate.js.map