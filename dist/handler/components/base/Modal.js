"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Modal = void 0;
class Modal {
    customId;
    disabled;
    execute;
    constructor({ customId, disabled = false, execute }) {
        this.customId = customId;
        this.disabled = disabled;
        this.execute = execute;
    }
}
exports.Modal = Modal;
//# sourceMappingURL=Modal.js.map