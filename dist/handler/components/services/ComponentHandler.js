"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComponentHandler = void 0;
const index_1 = require("../../../index");
const LogManager_1 = require("../../utils/LogManager");
class ComponentHandler {
    static async executeComponent(component, execute) {
        if (!component || component.disabled)
            return;
        try {
            await execute();
        }
        catch (err) {
            LogManager_1.LogManager.logError(`Error executing component for customId: ${component.customId}`, err);
        }
    }
    static async handleButtonInteraction(interaction) {
        const [customId, uniqueId] = interaction.customId.split(':');
        const component = index_1.client.components.button.get(customId);
        await this.executeComponent(component, () => component.execute(interaction, uniqueId || null));
    }
    static async handleAnySelectMenuInteraction(interaction) {
        const customId = interaction.customId;
        const component = index_1.client.components.selectMenu.get(customId);
        const values = interaction.values.map((item) => item.split(':')[0]);
        const uniqueIds = interaction.values.map((item) => item.split(':')[1] || null);
        await this.executeComponent(component, () => component.execute(interaction, values, uniqueIds));
    }
    static async handleModalInteraction(interaction) {
        const customId = interaction.customId;
        const component = index_1.client.components.modal.get(customId);
        await this.executeComponent(component, () => component.execute(interaction, interaction.fields));
    }
}
exports.ComponentHandler = ComponentHandler;
//# sourceMappingURL=ComponentHandler.js.map