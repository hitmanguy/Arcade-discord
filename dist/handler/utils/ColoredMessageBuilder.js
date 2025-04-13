"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ColoredMessageBuilder = void 0;
exports.colored = colored;
exports.rainbow = rainbow;
const Formatting_1 = require("../types/Formatting");
class ColoredMessageBuilder {
    message = '';
    start = '\u001b[';
    reset = '\u001b[0m';
    add(text, param1, param2, param3 = Formatting_1.Format.Normal) {
        let color;
        let backgroundColor;
        let format = Formatting_1.Format.Normal;
        if (Object.values(Formatting_1.Color).includes(param1))
            color = param1;
        if (Object.values(Formatting_1.BackgroundColor).includes(param1))
            backgroundColor = param1;
        if (param2 && Object.values(Formatting_1.BackgroundColor).includes(param2))
            backgroundColor = param2;
        if (param2 && Object.values(Formatting_1.Format).includes(param2))
            format = param2;
        if (param3)
            format = param3;
        backgroundColor = backgroundColor ? `${backgroundColor};` : Formatting_1.BackgroundColor.None;
        this.message += `${this.start}${format};${backgroundColor}${color}m${text}${this.reset}`;
        return this;
    }
    addRainbow(text, format = Formatting_1.Format.Normal) {
        const rainbowColors = [Formatting_1.Color.Red, Formatting_1.Color.Yellow, Formatting_1.Color.Green, Formatting_1.Color.Cyan, Formatting_1.Color.Blue, Formatting_1.Color.Pink];
        for (let i = 0; i < text.length; i++) {
            const char = text.charAt(i);
            const color = rainbowColors[i % rainbowColors.length];
            this.message += `${this.start}${format};${color}m${char}${this.reset}`;
        }
        return this;
    }
    addNewLine() {
        this.message += '\n';
        return this;
    }
    build() {
        return `\`\`\`ansi\n${this.message}\n\`\`\``;
    }
}
exports.ColoredMessageBuilder = ColoredMessageBuilder;
function colored(text, param1, param2, param3 = Formatting_1.Format.Normal) {
    return new ColoredMessageBuilder().add(text, param1, param2, param3).build();
}
function rainbow(text, format = Formatting_1.Format.Normal) {
    return new ColoredMessageBuilder().addRainbow(text, format).build();
}
//# sourceMappingURL=ColoredMessageBuilder.js.map