"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const handler_1 = require("../../../handler");
const path_1 = require("path");
const user_status_1 = require("../../../model/user_status");
const GAME_CONSTANTS_1 = require("../../../constants/GAME_CONSTANTS");
const user_services_1 = require("../../../services/user_services");
const fs_1 = require("fs");
async function getPuzzleAttachment() {
    const puzzleGifPath = (0, path_1.join)(__dirname, '..', '..', '..', '..', 'gif', 'puzzle.gif');
    try {
        await fs_1.promises.access(puzzleGifPath);
        return new discord_js_1.AttachmentBuilder(puzzleGifPath, { name: 'puzzle.gif' });
    }
    catch (error) {
        console.error('Puzzle GIF not found:', error);
        console.error('Attempted path:', puzzleGifPath);
        return null;
    }
}
function createTimeoutEmbed(sanityLoss, suspicionGain) {
    return new discord_js_1.EmbedBuilder()
        .setColor(GAME_CONSTANTS_1.PRISON_COLORS.danger)
        .setTitle('⏰ Time\'s Up!')
        .setDescription('```diff\n' +
        '- You took too long to answer...\n' +
        '- The silence weighs heavily on your mind\n' +
        '```')
        .addFields({
        name: '😰 Consequences',
        value: `• Sanity: ${sanityLoss < 0 ? '' : '-'}${sanityLoss}\n• Suspicion: +${suspicionGain}`,
        inline: true
    }, {
        name: '⚠️ Warning',
        value: 'Failing to respond raises suspicion from the guards',
        inline: true
    })
        .setFooter({ text: 'Moving to next puzzle in 2 seconds...' });
}
const level1Puzzles = [
    {
        type: 'riddle',
        question: "I speak without a mouth and hear without ears. I have no body, but come alive with wind. What am I?",
        options: ['Echo', 'Shadow', 'Ghost', 'Thought'],
        answer: 'Echo',
        flavor: '🎭 *Whispers echo through the empty corridors...*',
        reward: 8,
        sanityImpact: { success: 2, failure: -5 }
    },
    {
        type: 'riddle',
        question: "The more you take, the more you leave behind. What am I?",
        options: ['Memories', 'Footsteps', 'Time', 'Shadows'],
        answer: 'Footsteps',
        flavor: '👣 *Your steps fade into darkness...*',
        reward: 10,
        sanityImpact: { success: 3, failure: -6 }
    },
    {
        type: 'math',
        question: "If 3 prisoners can dig 3 tunnels in 3 days, how many days will it take 6 prisoners to dig 6 tunnels?",
        options: ['3 days', '6 days', '9 days', '12 days'],
        answer: '3 days',
        reward: 15,
        sanityImpact: { success: 4, failure: -8 }
    },
    {
        type: 'logic',
        question: "In a prison with 100 cells, if guard A lies on Monday, Wednesday, Friday and guard B lies on Tuesday, Thursday, Saturday, which guard is telling the truth on Sunday?",
        options: ['Guard A', 'Guard B', 'Both lie', 'Both tell truth'],
        answer: 'Both tell truth',
        reward: 20,
        sanityImpact: { success: 5, failure: -10 }
    },
    {
        id: 'riddle_footsteps',
        type: 'riddle',
        question: "The more of me you take, the more you leave behind. What am I?",
        options: ['Time', 'Shadow', 'Footsteps', 'Silence'],
        answer: 'Footsteps',
        flavor: '👣 *Your steps echo in the empty corridor...*',
        reward: 15,
        sanityImpact: { success: 5, failure: -3 }
    },
    {
        id: 'riddle_teapot',
        type: 'riddle',
        question: 'What begins with T, ends with T, and has T in it?',
        options: ['Teapot', 'Tablet', 'Tent', 'Toilet'],
        answer: 'Teapot',
        reward: 10,
        sanityImpact: { success: 4, failure: -2 }
    },
    {
        id: 'riddle_breath',
        type: 'riddle',
        question: "I'm light as a feather, yet the strongest man can't hold me for more than 5 minutes. What am I?",
        options: ['Breath', 'Cloud', 'Shadow', 'Hope'],
        answer: 'Breath',
        reward: 10,
        sanityImpact: { success: 4, failure: -2 }
    },
    {
        id: 'riddle_echo',
        type: 'riddle',
        question: 'I speak without a mouth and hear without ears. I have nobody, but I come alive with the wind. What am I?',
        options: ['Echo', 'Wind', 'Whistle', 'Voice'],
        answer: 'Echo',
        reward: 10,
        sanityImpact: { success: 4, failure: -2 }
    },
    {
        id: 'trivia_paris',
        type: 'trivia',
        question: 'What is the capital of France?',
        options: ['Paris', 'Berlin', 'London', 'Madrid'],
        answer: 'Paris',
        reward: 10,
        sanityImpact: { success: 4, failure: -2 }
    },
    {
        id: 'trivia_mars',
        type: 'trivia',
        question: 'Which planet is known as the Red Planet?',
        options: ['Mars', 'Venus', 'Jupiter', 'Saturn'],
        answer: 'Mars',
        reward: 10,
        sanityImpact: { success: 4, failure: -2 }
    },
    {
        id: 'trivia_lion',
        type: 'trivia',
        question: 'Which animal is known as the King of the Jungle?',
        options: ['Lion', 'Tiger', 'Elephant', 'Bear'],
        answer: 'Lion',
        reward: 10,
        sanityImpact: { success: 4, failure: -2 }
    },
    {
        id: 'trivia_spider',
        type: 'trivia',
        question: 'How many legs does a spider have?',
        options: ['6', '8', '10', '12'],
        answer: '8',
        reward: 10,
        sanityImpact: { success: 4, failure: -2 }
    },
    {
        id: 'trivia_pink',
        type: 'trivia',
        question: 'What color do you get when you mix red and white?',
        options: ['Pink', 'Purple', 'Orange', 'Peach'],
        answer: 'Pink',
        reward: 10,
        sanityImpact: { success: 4, failure: -2 }
    },
    {
        id: 'math_19',
        type: 'math',
        question: 'What is 9 + 10?',
        options: ['19', '21', '18', '20'],
        answer: '19',
        reward: 10,
        sanityImpact: { success: 4, failure: -2 }
    },
    {
        id: 'math_32',
        type: 'math',
        question: 'What is the next number in the pattern: 2, 4, 8, 16, ?',
        options: ['20', '30', '32', '24'],
        answer: '32',
        reward: 10,
        sanityImpact: { success: 4, failure: -2 }
    },
    {
        id: 'math_50',
        type: 'math',
        question: "What's half of 100?",
        options: ['50', '40', '25', '60'],
        answer: '50',
        reward: 10,
        sanityImpact: { success: 4, failure: -2 }
    },
    {
        id: 'math_12',
        type: 'math',
        question: 'A dozen equals how many?',
        options: ['10', '11', '12', '13'],
        answer: '12',
        reward: 10,
        sanityImpact: { success: 4, failure: -2 }
    },
    {
        id: 'math_5pm',
        type: 'math',
        question: 'If a train leaves at 3:00 PM and takes 2 hours to reach its destination, what time will it arrive?',
        options: ['4:00 PM', '5:00 PM', '3:30 PM', '6:00 PM'],
        answer: '5:00 PM',
        reward: 10,
        sanityImpact: { success: 4, failure: -2 }
    },
];
const userProgressMap = new Map();
function getRandomPuzzles(n) {
    const shuffled = [...level1Puzzles].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, n);
}
exports.default = new handler_1.SlashCommand({
    registerType: handler_1.RegisterType.Global,
    data: new discord_js_1.SlashCommandBuilder()
        .setName('puzzle')
        .setDescription('Solve a sequence of level 1 puzzles!'),
    async execute(interaction) {
        const user = await user_status_1.User.findOne({ discordId: interaction.user.id });
        if (!user) {
            await interaction.reply({
                content: 'You need to register first! Use `/register` to begin your journey.',
                flags: [discord_js_1.MessageFlags.Ephemeral]
            });
            return;
        }
        const suspicous = user.suspiciousLevel > 50;
        if (suspicous) {
            await interaction.reply('You are too suspicious to play this game. Try again later.');
            return;
        }
        user.survivalDays += 1;
        await user.save();
        const userId = interaction.user.id;
        const puzzles = getRandomPuzzles(5);
        await interaction.deferReply({ flags: [discord_js_1.MessageFlags.Ephemeral] });
        userProgressMap.set(userId, {
            index: 0,
            puzzles,
            merit: 0,
            hint: 0,
            sanity: 0,
            suspicion: 0,
        });
        await sendPuzzle(interaction, userId);
    },
});
function getDistortedText(text, sanity) {
    if (sanity > 70)
        return text;
    const intensity = (100 - sanity) / 100;
    if (sanity < 30) {
        return text.split('').map(char => {
            if (Math.random() < intensity * 0.4) {
                return ['̷', '̶', '̸', '̵', '̴'][Math.floor(Math.random() * 5)] + char;
            }
            if (Math.random() < intensity * 0.3) {
                return ['⌀', '∆', '◊', '▣', '▥'][Math.floor(Math.random() * 5)];
            }
            return char;
        }).join('');
    }
    return GAME_CONSTANTS_1.SANITY_EFFECTS.hallucinations.distortCards(text, sanity);
}
function createTimeDistortedEmbed(sanityLoss, suspicionGain, user) {
    const baseMessage = '⏰ Time\'s Up!';
    const consequence = 'The silence weighs heavily on your mind...';
    return new discord_js_1.EmbedBuilder()
        .setColor(user.sanity < 30 ? GAME_CONSTANTS_1.PRISON_COLORS.danger : GAME_CONSTANTS_1.PRISON_COLORS.warning)
        .setTitle(user.sanity < 40 ? getDistortedText(baseMessage, user.sanity) : baseMessage)
        .setDescription('```diff\n' +
        `- ${user.sanity < 40 ? getDistortedText(consequence, user.sanity) : consequence}\n` +
        '```')
        .addFields({
        name: user.sanity < 30 ? '💀 P̷u̴n̵i̸s̷h̵m̶e̸n̷t̸' : '😰 Consequences',
        value: `• Sanity: ${sanityLoss < 0 ? '' : '-'}${sanityLoss}\n• Suspicion: +${suspicionGain}`,
        inline: true
    })
        .setFooter({
        text: user.sanity < 40
            ? 'T̸h̵e̷ ̵w̶a̸l̵l̷s̸ ̵h̶a̵v̷e̶ ̷e̵y̸e̵s̷.̶.̸.'
            : 'The guards note your hesitation...'
    });
}
async function sendPuzzle(interaction, userId) {
    const session = userProgressMap.get(userId);
    if (!session)
        return;
    const user = await user_status_1.User.findOne({ discordId: userId });
    if (!user)
        return;
    const current = session.puzzles[session.index];
    const distortedOptions = current.options.map(opt => user.sanity < 50 ? getDistortedText(opt, user.sanity) : opt);
    if (user.sanity < 30 && Math.random() < 0.3) {
        const idx1 = Math.floor(Math.random() * distortedOptions.length);
        const idx2 = Math.floor(Math.random() * distortedOptions.length);
        [distortedOptions[idx1], distortedOptions[idx2]] = [distortedOptions[idx2], distortedOptions[idx1]];
    }
    const row = new discord_js_1.ActionRowBuilder().addComponents(distortedOptions.map((opt, index) => new discord_js_1.ButtonBuilder()
        .setCustomId(`puzzle:answer:${opt}:${Date.now()}:${index}`)
        .setLabel(opt)
        .setStyle(discord_js_1.ButtonStyle.Primary)));
    const puzzleGifAttachment = await getPuzzleAttachment();
    const puzzleEmbed = new discord_js_1.EmbedBuilder()
        .setColor(user.sanity < 30 ? GAME_CONSTANTS_1.PRISON_COLORS.danger : '#0099ff')
        .setTitle(`🧠 ${current.type.toUpperCase()} PUZZLE`)
        .setDescription(`${user.sanity < 40 ? getDistortedText('🧩 Solve the puzzle:', user.sanity) : '🧩 Solve the puzzle:'}\n\n` +
        `${getDistortedText(current.question, user.sanity)}`)
        .setFooter({
        text: user.sanity < 40
            ? 'T̷i̸m̵e̷ ̶i̸s̷ ̸a̵n̷ ̶i̸l̵l̷u̵s̸i̷o̸n̶.̷.̸.'
            : `Puzzle ${session.index + 1}/5`
    });
    if (puzzleGifAttachment) {
        puzzleEmbed.setImage('attachment://puzzle.gif');
    }
    if (current.flavor) {
        puzzleEmbed.addFields({
            name: '\u200B',
            value: getDistortedText(current.flavor, user.sanity)
        });
    }
    const message = await interaction.editReply({
        embeds: [puzzleEmbed],
        ...(puzzleGifAttachment ? { files: [puzzleGifAttachment] } : {}),
        components: [row],
    });
    const collector = message.createMessageComponentCollector({
        componentType: discord_js_1.ComponentType.Button,
        time: 30000,
        max: 1,
    });
    let answered = false;
    collector?.on('collect', async (btnInteraction) => {
        answered = true;
        if (btnInteraction.user.id !== interaction.user.id) {
            return btnInteraction.reply({ content: 'This is not your puzzle!', ephemeral: true });
        }
        const [, , chosen] = btnInteraction.customId.split(':');
        const isCorrect = chosen === current.answer;
        if (isCorrect) {
            session.merit += current.reward;
            session.hint += 1;
            if (current.sanityImpact?.success) {
                session.sanity += current.sanityImpact.success;
            }
        }
        else {
            if (current.sanityImpact?.failure) {
                session.sanity += current.sanityImpact.failure;
            }
            session.suspicion += 5;
        }
        const resultEmbed = new discord_js_1.EmbedBuilder()
            .setColor(isCorrect ? '#00ff00' : '#ff0000')
            .setTitle(isCorrect ? '✅ CORRECT!' : '❌ INCORRECT!')
            .setDescription(isCorrect
            ? `**${current.answer}** was the right answer.\n\n🎉 +${current.reward} Merit | 🧠 +1 Hint${current.sanityImpact?.success ? ` | 😌 +${current.sanityImpact.success} Sanity` : ''}`
            : `The correct answer was **${current.answer}**.\n\n${current.sanityImpact?.failure ? `🔻 ${current.sanityImpact.failure} Sanity | ` : ''}⚠️ +5 Suspicion`);
        await btnInteraction.update({
            embeds: [resultEmbed],
            files: [],
            components: [],
        });
        session.index += 1;
        setTimeout(async () => {
            if (session.index < 5) {
                await sendPuzzle(interaction, userId);
            }
            else {
                await showFinalOptions(interaction, userId);
            }
        }, 2000);
    });
    collector?.on('end', async (collected) => {
        if (!answered) {
            session.sanity -= 10;
            session.suspicion += 10;
            const timeoutEmbed = new discord_js_1.EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('⏰ You took too long!')
                .setDescription('You failed to answer in time.\n\n🔻 -10 Sanity | ⚠️ +10 Suspicion');
            try {
                await interaction.editReply({
                    embeds: [timeoutEmbed],
                    files: [],
                    components: [],
                });
            }
            catch (error) {
                console.error('Failed to show timeout penalty:', error);
            }
            session.index += 1;
            setTimeout(async () => {
                if (session.index < 5) {
                    await sendPuzzle(interaction, userId);
                }
                else {
                    await showFinalOptions(interaction, userId);
                }
            }, 2000);
        }
    });
    collector.on('end', async (collected) => {
        try {
            if (!answered && !(session.index >= 5)) {
                const sanityLoss = -10;
                const suspicionGain = 10;
                session.sanity += sanityLoss;
                session.suspicion += suspicionGain;
                const timeoutEmbed = createTimeoutEmbed(sanityLoss, suspicionGain);
                await interaction.editReply({
                    embeds: [timeoutEmbed],
                    files: [],
                    components: [],
                });
                session.index += 1;
                setTimeout(async () => {
                    try {
                        if (session.index < 5) {
                            await sendPuzzle(interaction, userId);
                        }
                        else {
                            await showFinalOptions(interaction, userId);
                        }
                    }
                    catch (err) {
                        console.error('Error in timeout progression:', err);
                    }
                }, 2000);
            }
        }
        catch (err) {
            console.error('Error in collector end:', err);
        }
    });
}
async function showFinalOptions(interaction, userId) {
    const session = userProgressMap.get(userId);
    if (!session)
        return;
    const user = await user_status_1.User.findOne({ discordId: interaction.user.id });
    if (!user)
        return;
    const puzzleGifAttachment = await getPuzzleAttachment();
    const embed = new discord_js_1.EmbedBuilder()
        .setTitle('🧩 Puzzle Report')
        .setDescription(`You've completed Level 1 puzzles!`)
        .addFields({ name: '💰 Merit Points', value: session.merit.toString(), inline: true }, { name: '🧠 Sanity', value: session.sanity.toString(), inline: true }, { name: '👁️ Suspicion', value: session.suspicion.toString(), inline: true })
        .setColor('Blue')
        .setFooter({ text: 'Return tomorrow for more puzzles!' });
    if (puzzleGifAttachment) {
        embed.setImage('attachment://puzzle.gif');
    }
    const buttonRow = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
        .setCustomId('puzzle:progress')
        .setLabel('📊 View Progress')
        .setStyle(discord_js_1.ButtonStyle.Primary), new discord_js_1.ButtonBuilder()
        .setCustomId('puzzle:profile')
        .setLabel('👤 View Profile')
        .setStyle(discord_js_1.ButtonStyle.Secondary));
    await Promise.all([
        user_services_1.UserService.updateUserStats(interaction.user.id, {
            meritPoints: user.meritPoints + session.merit,
            sanity: Math.min(Math.max(user.sanity + 0.5 * (session.sanity), 0), 100),
            suspiciousLevel: Math.min(user.suspiciousLevel + session.suspicion, 100),
            totalGamesPlayed: user.totalGamesPlayed + 1,
            totalGamesWon: user.totalGamesWon + 1,
            currentStreak: user.currentStreak + 1
        }),
        user_services_1.UserService.updatePuzzleProgress(interaction.user.id, 'puzzle1', true)
    ]);
    const message = await interaction.editReply({
        embeds: [embed],
        ...(puzzleGifAttachment ? { files: [puzzleGifAttachment] } : {}),
        components: [buttonRow]
    });
    const collector = message.createMessageComponentCollector({
        componentType: discord_js_1.ComponentType.Button,
        time: 60000
    });
    collector?.on('collect', async (btnInteraction) => {
        if (btnInteraction.user.id !== interaction.user.id) {
            await btnInteraction.reply({
                content: 'This is not your game!',
                ephemeral: true
            });
            return;
        }
        const action = btnInteraction.customId.split(':')[1];
        if (!btnInteraction.deferred) {
            await btnInteraction.deferUpdate();
        }
        switch (action) {
            case 'progress':
                await btnInteraction.followUp({
                    content: 'Use the `/progress` command to see your full progress!',
                    ephemeral: true
                });
                break;
            case 'profile':
                await btnInteraction.followUp({
                    content: 'Use the `/profile view` command to see your full profile!',
                    ephemeral: true
                });
                break;
        }
    });
    collector?.on('end', async () => {
        try {
            await interaction.editReply({
                components: []
            });
        }
        catch (error) {
            console.error('Failed to remove components:', error);
        }
    });
}
//# sourceMappingURL=puzzles1.js.map