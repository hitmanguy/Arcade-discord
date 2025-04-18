"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const handler_1 = require("../../../handler");
const discord_js_1 = require("discord.js");
function generateGuardPuzzle() {
    const intervals = [75, 80, 90, 70];
    const interval = intervals[Math.floor(Math.random() * intervals.length)];
    const startTime = new Date();
    startTime.setHours(2, 30, 0);
    const patrols = [];
    for (let i = 0; i < 3; i++) {
        const time = new Date(startTime.getTime() + interval * i * 60000);
        patrols.push(time.toTimeString().substring(0, 5));
    }
    const nextTime = new Date(startTime.getTime() + interval * 3 * 60000);
    const correctAnswer = nextTime.toTimeString().substring(0, 5);
    const distractors = [
        new Date(nextTime.getTime() + 10 * 60000).toTimeString().substring(0, 5),
        new Date(nextTime.getTime() - 10 * 60000).toTimeString().substring(0, 5),
        new Date(nextTime.getTime() + 20 * 60000).toTimeString().substring(0, 5),
    ];
    const options = [correctAnswer, ...distractors].sort(() => Math.random() - 0.5);
    const question = `🧩 The guard patrols at regular intervals.\nThe last 3 patrols were at: **${patrols.join(', ')}**.\n\n⏰ What time will he patrol next?`;
    return { question, options, correctAnswer };
}
exports.default = new handler_1.SlashCommand({
    registerType: handler_1.RegisterType.Guild,
    data: new discord_js_1.SlashCommandBuilder()
        .setName('puzzle')
        .setDescription('Solve a tricky prison logic puzzle!'),
    async execute(interaction) {
        const { question, options, correctAnswer } = generateGuardPuzzle();
        const row = new discord_js_1.ActionRowBuilder().addComponents(options.map((opt) => new discord_js_1.ButtonBuilder()
            .setCustomId(`puzzle:answer:${opt}`)
            .setLabel(opt)
            .setStyle(discord_js_1.ButtonStyle.Primary)));
        await interaction.reply({
            content: question,
            components: [row],
            flags: [discord_js_1.MessageFlags.Ephemeral],
        });
        const collector = interaction.channel?.createMessageComponentCollector({
            componentType: discord_js_1.ComponentType.Button,
            time: 15000,
            max: 1,
        });
        collector?.on('collect', async (btnInteraction) => {
            if (btnInteraction.user.id !== interaction.user.id) {
                return btnInteraction.reply({ content: 'This is not your puzzle!', ephemeral: true });
            }
            const chosen = btnInteraction.customId.split(':')[2];
            const isCorrect = chosen === correctAnswer;
            await btnInteraction.update({
                content: isCorrect
                    ? `✅ Correct! The guard's next patrol is at **${correctAnswer}**.\n🎉 +10 Merit | 🧠 +1 Hint`
                    : `❌ Wrong! The correct time was **${correctAnswer}**.\n🔻 -5 Sanity | ⚠️ +5 Suspicion`,
                components: [],
            });
        });
    },
});
//# sourceMappingURL=puzzles1.js.map