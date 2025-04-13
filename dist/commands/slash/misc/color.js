"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const handler_1 = require("../../../handler");
exports.default = new handler_1.SlashCommand({
    registerType: handler_1.RegisterType.Guild,
    data: new discord_js_1.SlashCommandBuilder()
        .setName('color')
        .setDescription('Replies with a colorful message example!')
        .setDefaultMemberPermissions(discord_js_1.PermissionFlagsBits.SendMessages),
    async execute(interaction) {
        const coloredMessage = new handler_1.ColoredMessageBuilder()
            .add('Welcome to the ', handler_1.Color.Green)
            .add('Color Showcase!', handler_1.Color.Blue, handler_1.BackgroundColor.Orange, handler_1.Format.Bold)
            .addNewLine()
            .add('This text is ', handler_1.Color.Red)
            .add('red ', handler_1.Color.Red, handler_1.BackgroundColor.None, handler_1.Format.Bold)
            .add('with an underline.', handler_1.Color.Gray, handler_1.BackgroundColor.None, handler_1.Format.Underline)
            .addNewLine()
            .add('Let’s ', handler_1.Color.White)
            .add('explore ', handler_1.Color.Cyan, handler_1.BackgroundColor.None, handler_1.Format.Bold)
            .add('a ', handler_1.Color.Yellow)
            .addRainbow('rainbow ')
            .add('effect: ', handler_1.Color.Pink)
            .addRainbow('rainboooooooow!', handler_1.Format.Normal)
            .addNewLine()
            .add('Thanks for using the command!', handler_1.Color.Cyan, handler_1.BackgroundColor.MarbleBlue, handler_1.Format.Bold)
            .build();
        await interaction.reply({ content: coloredMessage });
    },
});
//# sourceMappingURL=color.js.map