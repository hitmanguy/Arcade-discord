import { RegisterType, SlashCommand } from '../../../handler';
import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
    ColorResolvable
} from 'discord.js';
import { User } from '../../../model/user_status';

const PUZZLES = [
    { 
        id: 'puzzles1',
        name: '🔓 Basic Training',
        description: 'Your first test...',
        image: 'https://i.imgur.com/8tJt6x2.png', // Basic training/tutorial icon
        color: '#4CAF50'
    },
    { 
        id: 'tunnel1',
        name: '🚇 The Tunnel',
        description: 'Descend into darkness...',
        image: 'https://i.imgur.com/TZz7Gdb.png', // Dark tunnel/maze icon
        color: '#455A64'
    },
    { 
        id: 'matchingpairs',
        name: '🎴 Memory Test',
        description: 'Match the patterns...',
        image: 'https://i.imgur.com/lqGUeZF.png', // Memory cards icon
        color: '#FF9800'
    },
    {
        id: 'UNO',
        name: '🃏 A Card Game',
        description: 'A fun but exciting game',
        image: 'https://i.imgur.com/KxUxZJs.png', // Card game icon
        color: '#F44336'
    },
    { 
        id: 'numbers-game-command',
        name: '🔢 Number Protocol',
        description: 'A game of trust and betrayal...',
        image: 'https://i.imgur.com/Q9WNuZM.png', // Numbers/math icon
        color: '#2196F3'
    },
    { 
        id: 'Judas',
        name: '👥 The Judas Game',
        description: 'Who can you trust?',
        image: 'https://i.imgur.com/xYSCVx9.png', // Mystery/betrayal icon
        color: '#9C27B0'
    }
];

function createProgressBar(current: number, total: number, size: number = 15): string {
    const progress = Math.floor((current / total) * size);
    const filledChar = '■'; // More modern square character
    const emptyChar = '□';  // Empty square for consistency
    return filledChar.repeat(progress) + emptyChar.repeat(size - progress);
}

function getTimeAgo(date: Date): string {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    return 'Just now';
}

export default new SlashCommand({
    registerType: RegisterType.Guild,
    data: new SlashCommandBuilder()
        .setName('progress')
        .setDescription('View your puzzle progression and current objective'),

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        await interaction.deferReply();

        const user = await User.findOne({ discordId: interaction.user.id });
        if (!user) {
            await interaction.editReply('You need to register first! Use `/register` to begin your journey.');
            return;
        }

        // Initialize puzzle progress if not exists
        if (!user.puzzleProgress || user.puzzleProgress.length === 0) {
            user.puzzleProgress = PUZZLES.map(puzzle => ({
                puzzleId: puzzle.id,
                completed: false,
                completionCount: 0,
                lastPlayed: new Date()
            }));
            user.currentPuzzle = PUZZLES[0].id;
            await user.save();
        }

        const currentPuzzleIndex = PUZZLES.findIndex(p => p.id === user.currentPuzzle);
        const currentPuzzle = PUZZLES[currentPuzzleIndex];
        let progressDescription = '';

        // Calculate total completion percentage
        const completedCount = user.puzzleProgress.filter(p => p.completed).length;
        const completionPercentage = Math.round((completedCount / PUZZLES.length) * 100);

        PUZZLES.forEach((puzzle, index) => {
            const progress = user.puzzleProgress.find(p => p.puzzleId === puzzle.id);
            const isCurrentPuzzle = puzzle.id === user.currentPuzzle;
            const isLocked = index > currentPuzzleIndex && !progress?.completed;
            
            const status = progress?.completed ? '✨' : isCurrentPuzzle ? '▶️' : isLocked ? '🔒' : '⏳';
            const completionCount = progress?.completionCount || 0;
            const completionText = completionCount > 0 ? ` │ Completed ${completionCount}×` : '';
            const lastPlayed = progress?.lastPlayed ? ` │ Last played: ${getTimeAgo(progress.lastPlayed)}` : '';
            
            progressDescription += `\n${status} **${puzzle.name}**${completionText}${lastPlayed}\n`;
            if (!isLocked) {
                progressDescription += `┗━ *${puzzle.description}*\n`;
            } else {
                progressDescription += `┗━ *[Complete previous puzzles to unlock]*\n`;
            }
        });

        const overallProgress = createProgressBar(currentPuzzleIndex + 1, PUZZLES.length);

        const embed = new EmbedBuilder()
            .setColor(currentPuzzle.color as ColorResolvable)
            .setAuthor({ 
                name: `${interaction.user.username}'s Journey`,
                iconURL: interaction.user.displayAvatarURL()
            })
            .setTitle('🎮 Puzzle Progress')
            .setThumbnail(currentPuzzle.image)
            .setDescription(progressDescription)
            .addFields(
                { 
                    name: '🎯 Current Challenge',
                    value: `>>> **${currentPuzzle.name}**\n${currentPuzzle.description}`,
                    inline: false 
                },
                { 
                    name: '📊 Progress Overview',
                    value: `${overallProgress}\n**${completionPercentage}%** Complete │ ${currentPuzzleIndex + 1}/${PUZZLES.length} Puzzles Unlocked`,
                    inline: false 
                }
            )
            .setFooter({ 
                text: '🏆 Complete each puzzle to unlock new challenges!'
            })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    }
});