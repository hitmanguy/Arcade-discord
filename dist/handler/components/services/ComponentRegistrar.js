"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComponentRegistrar = void 0;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const config_1 = tslib_1.__importDefault(require("../../../config"));
const Modal_1 = require("../base/Modal");
const Button_1 = require("../base/Button");
const Features_1 = require("../../types/Features");
const SelectMenu_1 = require("../base/SelectMenu");
const LogManager_1 = require("../../utils/LogManager");
const ModuleManager_1 = require("../../utils/ModuleManager");
const ComponentCollections_1 = require("../../types/ComponentCollections");
class ComponentRegistrar {
    static folderPath = path_1.default.join(__dirname, `../../../${config_1.default.componentsFolder}`);
    static async registerComponents(client) {
        try {
            const componentFiles = await ModuleManager_1.ModuleManager.getAllModulePaths(this.folderPath);
            const componentModules = await Promise.all(componentFiles.map(ModuleManager_1.ModuleManager.importModule));
            componentModules.forEach((module, index) => this.registerComponent(client, module, componentFiles[index]));
        }
        catch (err) {
            LogManager_1.LogManager.logError('Error registering components', err);
        }
    }
    static async reloadComponents(client) {
        try {
            client.components = ComponentCollections_1.emptyComponentCollections;
            await ModuleManager_1.ModuleManager.clearModulesInDirectory(this.folderPath);
            await this.registerComponents(client);
        }
        catch (err) {
            LogManager_1.LogManager.logError('Error reloading components', err);
        }
    }
    static registerComponent(client, componentModule, filePath) {
        const { default: component } = componentModule;
        if (!this.isValidComponent(component)) {
            LogManager_1.LogManager.logError(`Invalid component in file: ${filePath}. Expected an instance of a Component class.`);
            return;
        }
        if (component instanceof Button_1.Button && client.isEnabledFeature(Features_1.Features.Buttons)) {
            client.components.button.set(component.customId, component);
        }
        else if (component instanceof SelectMenu_1.SelectMenu && client.isEnabledFeature(Features_1.Features.SelectMenus)) {
            client.components.selectMenu.set(component.customId, component);
        }
        else if (component instanceof Modal_1.Modal && client.isEnabledFeature(Features_1.Features.Modals)) {
            client.components.modal.set(component.customId, component);
        }
    }
    static isValidComponent(component) {
        return component instanceof Button_1.Button || component instanceof SelectMenu_1.SelectMenu || component instanceof Modal_1.Modal;
    }
}
exports.ComponentRegistrar = ComponentRegistrar;
//# sourceMappingURL=ComponentRegistrar.js.map