"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const handler_1 = require("../../handler");
exports.default = new handler_1.SelectMenu({
    customId: 'selectMenu',
    async execute(interaction, values, uniqueIds) {
        const choice = values[0];
        const responses = {
            cats: 'You chose cats! 🐱',
            dogs: 'You chose dogs! 🐶',
            birds: 'You chose birds! 🐦',
        };
        await interaction.reply({ content: responses[choice] });
    },
});
//# sourceMappingURL=select.js.map