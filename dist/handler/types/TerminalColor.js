"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Gray = exports.Cyan = exports.Magenta = exports.Blue = exports.Yellow = exports.Green = exports.Red = void 0;
const colors = {
    Red: '\x1b[31m',
    Green: '\x1b[32m',
    Yellow: '\x1b[33m',
    Blue: '\x1b[34m',
    Magenta: '\x1b[35m',
    Cyan: '\x1b[36m',
    Gray: '\x1b[90m',
};
const Reset = '\x1b[0m';
const colorFunctions = Object.fromEntries(Object.entries(colors).map(([colorName, colorValue]) => [
    colorName,
    (text) => `${colorValue}${text}${Reset}`,
]));
exports.Red = colorFunctions.Red, exports.Green = colorFunctions.Green, exports.Yellow = colorFunctions.Yellow, exports.Blue = colorFunctions.Blue, exports.Magenta = colorFunctions.Magenta, exports.Cyan = colorFunctions.Cyan, exports.Gray = colorFunctions.Gray;
//# sourceMappingURL=TerminalColor.js.map