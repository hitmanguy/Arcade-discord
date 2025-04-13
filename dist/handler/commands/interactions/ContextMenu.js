"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextMenu = void 0;
const BaseCommand_1 = require("../base/BaseCommand");
const RegisterType_1 = require("../../types/RegisterType");
class ContextMenu extends BaseCommand_1.BaseCommand {
    registerType;
    data;
    execute;
    constructor(options) {
        super(options);
        this.data = options.data;
        this.registerType = options.registerType ?? RegisterType_1.RegisterType.Guild;
        this.execute = options.execute;
        Object.assign(this, options);
    }
}
exports.ContextMenu = ContextMenu;
//# sourceMappingURL=ContextMenu.js.map