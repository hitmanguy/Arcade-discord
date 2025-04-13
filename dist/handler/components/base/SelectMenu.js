"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SelectMenu = void 0;
class SelectMenu {
    customId;
    disabled;
    execute;
    constructor({ customId, disabled = false, execute }) {
        this.customId = customId;
        this.disabled = disabled;
        this.execute = execute;
    }
}
exports.SelectMenu = SelectMenu;
//# sourceMappingURL=SelectMenu.js.map