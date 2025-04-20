"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.glitchText = glitchText;
exports.formatTime = formatTime;
function glitchText(text) {
    const glitchChars = ['̷', '̸', '̵', '̶', '̴', '̢', '̛', '̤', '̩', '̳', '̺'];
    let result = '';
    for (const char of text) {
        result += char;
        if (Math.random() < 0.3) {
            const numGlitches = Math.floor(Math.random() * 3) + 1;
            for (let i = 0; i < numGlitches; i++) {
                const glitchChar = glitchChars[Math.floor(Math.random() * glitchChars.length)];
                result += glitchChar;
            }
        }
        if (Math.random() < 0.1) {
            result += char.repeat(Math.floor(Math.random() * 2) + 1);
        }
    }
    if (Math.random() < 0.5) {
        result += ' ▓▒░▒▓';
    }
    return result;
}
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}
//# sourceMappingURL=text_util.js.map