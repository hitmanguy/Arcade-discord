"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComponentManager = void 0;
const ComponentRegistrar_1 = require("./services/ComponentRegistrar");
class ComponentManager {
    static async registerComponents(client) {
        await ComponentRegistrar_1.ComponentRegistrar.registerComponents(client);
    }
    static async reloadComponents(client) {
        await ComponentRegistrar_1.ComponentRegistrar.reloadComponents(client);
    }
}
exports.ComponentManager = ComponentManager;
//# sourceMappingURL=ComponentManager.js.map