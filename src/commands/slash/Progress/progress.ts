import { RegisterType, SlashCommand } from '../../../handler';
import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
    ColorResolvable,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ButtonInteraction
} from 'discord.js';
import { User } from '../../../model/user_status';
import { UserService } from '../../../services/user_services';
import { STORYLINE, RANKS, PRISON_COLORS, createProgressBar } from '../../../constants/GAME_CONSTANTS';

function calculateRank(meritPoints: number, sanity: number) {
    return Object.entries(RANKS)
        .reverse()
        .find(([_, rank]) => 
            meritPoints >= rank.requirement.meritPoints && 
            sanity >= rank.requirement.sanity
        )?.[1] || RANKS.novice;
}

function getGlitchEffect(sanity: number): string {
    if (sanity > 70) return '';
    if (sanity > 50) return '`Data corruption minimal...`';
    if (sanity > 30) return '`W̷a̴r̶n̷i̸n̵g̷:̴ ̶D̵a̷t̵a̵ ̵c̶o̶r̸r̶u̷p̵t̷i̸o̴n̸`';
    return '`C̷̦̊R̷̙̈́I̶̝͌T̷͚́I̶͈͝C̷̳͑A̶̜͆L̸̰̏ ̵̱̒S̷͔̈́Y̶̹͝S̶͉̈́T̵̗̆E̵͇͝M̷̯̌ ̶͖̒F̵̭̈́A̶̜̽Ȉ̷͜L̵͈̔Ụ̶̓R̷͎̆E̷͓̽`';
}

interface StorylineData {
    name: string;
    description: string;
    flavorText: string;
}

function isStorylineData(data: any): data is StorylineData {
    return typeof data === 'object' && data !== null && 
           'name' in data && 'description' in data && 'flavorText' in data;
}

export default new SlashCommand({
    registerType: RegisterType.Global,
    data: new SlashCommandBuilder()
        .setName('progress')
        .setDescription('View your journey through the digital prison'),

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        await interaction.deferReply();

        const user = await User.findOne({ discordId: interaction.user.id });
        if (!user) {
            await interaction.editReply('You need to register first! Use `/register` to begin your journey.');
            return;
        }

        const currentPuzzleId = user.currentPuzzle || 'puzzles1';
        const puzzleOrder = ['puzzles1', 'tunnel1', 'matchingpairs', 'UNO', 'numbers-game-command'];
        const currentIndex = puzzleOrder.indexOf(currentPuzzleId);
        const completedCount = user.puzzleProgress.filter(p => p.completed).length;
        
        const rank = calculateRank(user.meritPoints, user.sanity);
        const glitchEffect = getGlitchEffect(user.sanity);

        let progressDescription = `${STORYLINE.intro}\n\n`;

        const overallProgress = createProgressBar(completedCount, puzzleOrder.length, {
            length: 15,
            chars: { empty: '⬡', filled: '⬢' }
        });
        const overallPercent = Math.round((completedCount / puzzleOrder.length) * 100);

        puzzleOrder.forEach((puzzleId, index) => {
            const progress = user.puzzleProgress.find(p => p.puzzleId === puzzleId);
            const storylineData = STORYLINE[puzzleId as keyof typeof STORYLINE];
            const isCurrentPuzzle = puzzleId === currentPuzzleId;
            const treshold= isStorylineData(storylineData)? storylineData.merit: Number(storylineData);
            const isLocked = user.meritPoints < treshold && !isCurrentPuzzle;

            
            const status = progress?.completed ? '✨' : isCurrentPuzzle ? '▶️' : isLocked ? '🔒' : '⏳';
            const completionCount = progress?.completionCount || 0;
            const completionText = completionCount > 0 ? ` │ Mastered ${completionCount}×` : '';
            const sanityImpact = user.sanity < 50 && !isLocked ? ' │ `D̷͎a̴̦t̷̗a̷̮ ̶͎c̶̹o̷͚r̶̫r̷͎u̷̗p̷̪t̴̗e̷͚d̷̝`' : '';
            
            const name = isStorylineData(storylineData) ? storylineData.name : String(storylineData);
            progressDescription += `\n${status} **${name}**${completionText}${sanityImpact}\n`;
            
            if (!isLocked) {
                if (isStorylineData(storylineData)) {
                    progressDescription += `┣━ *${storylineData.description}*\n`;
                    if (isCurrentPuzzle) {
                        progressDescription += `┗━ ${storylineData.flavorText}\n`;
                    }
                    progressDescription += `┗━ ${storylineData.slash}\n`;
                }
            } else {
                if(isStorylineData(storylineData)) {
                progressDescription += `┗━ *[Access Denied - ${storylineData.access}]*\n`;
                }
            }
        });

        const embed = new EmbedBuilder()
            .setColor(user.sanity < 30 ? PRISON_COLORS.danger : PRISON_COLORS.primary as ColorResolvable)
            .setTitle(`${rank.title} - Digital Prison Progress`)
            .setDescription(glitchEffect + progressDescription)
            .addFields(
                { 
                    name: '📊 Status',
                    value: `Sanity: ${createProgressBar(user.sanity, 100, {
                        chars: { empty: '□', filled: '■' }
                    })} ${user.sanity}/100\nMerit: ${user.meritPoints} points\nSuspicion: ${createProgressBar(user.suspiciousLevel, 100, {
                        chars: { empty: '○', filled: '●' }
                    })} ${user.suspiciousLevel}/100`,
                    inline: false 
                },
                { 
                    name: '🎯 Progress',
                    value: `${overallProgress} ${overallPercent}%\nPuzzles Mastered: ${completedCount}/${puzzleOrder.length}`,
                    inline: false 
                }
            )
            .setFooter({ 
                text: user.suspiciousLevel >= 80 
                    ? '⚠️ WARNING: High suspicion level detected. Access may be restricted.'
                    : '🔒 Complete all trials to earn your freedom' 
            });
        if (user.isInIsolation) {
            embed.addFields({
                name: '⚠️ ISOLATION ACTIVE',
                value: 'Your suspicious behavior has been noted. Access to trials is temporarily restricted.',
                inline: false
            });
        }

        const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('progress-stats')
                    .setLabel('📈 Detailed Stats')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(user.sanity < 20), // Disable when sanity is critically low
            );

        await interaction.editReply({
            embeds: [embed],
            components: [row]
        });
    }
});