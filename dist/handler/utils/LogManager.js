"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogManager = void 0;
const TerminalColor_1 = require("../types/TerminalColor");
class LogManager {
    static log(message) {
        this.logMessage('log', (0, TerminalColor_1.Cyan)('[handler]'), message);
    }
    static logError(message, data) {
        this.logMessage('error', (0, TerminalColor_1.Red)('[handler]'), message, data);
    }
    static logDefault(message) {
        console.info(message);
    }
    static logMessage(level, prefix, message, data) {
        const formattedMessage = this.formatMessage(prefix, message);
        console[level](formattedMessage, data ?? '');
    }
    static formatMessage(prefix, message) {
        const timestamp = new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
        return `${(0, TerminalColor_1.Gray)(timestamp)} ${prefix} ${message}`;
    }
}
exports.LogManager = LogManager;
//# sourceMappingURL=LogManager.js.map