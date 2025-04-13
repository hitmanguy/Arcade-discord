"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Event = void 0;
class Event {
    name;
    once;
    disabled;
    execute;
    constructor({ name, once = false, disabled = false, execute }) {
        this.name = name;
        this.once = once;
        this.disabled = disabled;
        this.execute = execute;
    }
}
exports.Event = Event;
//# sourceMappingURL=Event.js.map