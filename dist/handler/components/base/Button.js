"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Button = void 0;
class Button {
    customId;
    disabled;
    execute;
    constructor({ customId, disabled = false, execute }) {
        this.customId = customId;
        this.disabled = disabled;
        this.execute = execute;
    }
}
exports.Button = Button;
//# sourceMappingURL=Button.js.map