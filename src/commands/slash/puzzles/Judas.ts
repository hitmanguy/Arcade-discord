import { RegisterType, SlashCommand } from '../../../handler';
import {
    ChatInputCommandInteraction,
    EmbedBuilder,
    ButtonBuilder,
    ActionRowBuilder,
    ButtonStyle,
    ButtonInteraction,
    TextChannel,
    ColorResolvable,
    SlashCommandBuilder,
    SlashCommandSubcommandBuilder,
    SlashCommandStringOption,
    SlashCommandSubcommandGroupBuilder,
    MessageFlags
} from 'discord.js';
import { User, UserDocument } from '../../../model/user_status';
import { UserService } from '../../../services/user_services';
import { STORYLINE, PRISON_COLORS, PUZZLE_REWARDS, SANITY_EFFECTS } from '../../../constants/GAME_CONSTANTS';
import { getGame, createGame, endGame, startGame } from '../../../functions/judas-game-lobby';
import { JudasGameState, JudasPlayer } from '../../../constants/judas/types';
import { 
    assignSecrets, 
    processVote, 
    resolveVotes, 
    getRandomSystemLie, 
    checkGameEnd,
    getAlivePlayers,
    shouldAdvancePhase,
    advancePhase
} from '../../../constants/judas/logic';
import { 
    PHASE_MESSAGES, 
    NOTIFICATIONS, 
    VICTORY_MESSAGES 
} from '../../../constants/judas/phrases';

// Type guard for storyline entries
function isStorylineEntry(key: string): key is keyof typeof STORYLINE {
    return key in STORYLINE;
}

export default new SlashCommand({
    registerType: RegisterType.Guild,
    data: new SlashCommandBuilder()
        .setName('judas')
        .setDescription('Enter the Judas Protocol - a game of trust and deception')
        .addSubcommandGroup((group: SlashCommandSubcommandGroupBuilder) =>
            group.setName('game')
                .setDescription('Judas Protocol game commands')
                .addSubcommand((subcommand: SlashCommandSubcommandBuilder) =>
                    subcommand.setName('create')
                        .setDescription('Create a new Judas Protocol instance')
                        .addStringOption((option: SlashCommandStringOption) =>
                            option.setName('difficulty')
                                .setDescription('Choose difficulty level')
                                .setRequired(true)
                                .addChoices(
                                    { name: '😰 Normal (3-5 players)', value: 'normal' },
                                    { name: '😱 Hard (5-7 players)', value: 'hard' }
                                )
                        )
                )
                .addSubcommand((subcommand: SlashCommandSubcommandBuilder) =>
                    subcommand.setName('join')
                        .setDescription('Join an active Judas Protocol')
                        .addStringOption((option: SlashCommandStringOption) =>
                            option.setName('code')
                                .setDescription('The protocol instance code')
                                .setRequired(true)
                        )
                )
                .addSubcommand((subcommand: SlashCommandSubcommandBuilder) =>
                    subcommand.setName('start')
                        .setDescription('Start a Judas Protocol that you created')
                        .addStringOption((option: SlashCommandStringOption) =>
                            option.setName('code')
                                .setDescription('The protocol instance code')
                                .setRequired(true)
                        )
                )
        ) as SlashCommandBuilder,

    async execute(interaction: ChatInputCommandInteraction) {
        const sub = interaction.options.getSubcommand();
        const channelId = interaction.channelId;

        // Check user registration
        const user = await User.findOne({ discordId: interaction.user.id });
        if (!user) {
            await interaction.reply({ content: "You must register first! Use `/register` to begin.", ephemeral: true });
            return;
        }

        // // Check if player has completed required puzzles
        // const requiredPuzzles = ['puzzles1', 'tunnel1', 'matchingpairs', 'UNO', 'numbers-game-command'];
        // const completedPuzzles = user.puzzleProgress.filter(p => requiredPuzzles.includes(p.puzzleId) && p.completed);
        
        // // Add type guard for storyline entries
        // function isStorylineEntry(value: any): value is { name: string; description: string; flavorText: string } {
        //     return value && typeof value === 'object' && 'name' in value;
        // }

        // // Update the progress display with proper type checking
        // if (completedPuzzles.length < requiredPuzzles.length) {
        //     await interaction.reply({ 
        //         embeds: [new EmbedBuilder()
        //             .setColor(getColorFromPrisonColor('danger'))
        //             .setTitle('⚠️ Access Denied')
        //             .setDescription('The Judas Protocol requires mastery of simpler trials first.')
        //             .addFields({
        //                 name: 'Required Trials',
        //                 value: requiredPuzzles.map(id => {
        //                     const completed = user.puzzleProgress.find(p => p.puzzleId === id)?.completed;
        //                     const storylineEntry = STORYLINE[id as keyof typeof STORYLINE];
        //                     const name = isStorylineEntry(storylineEntry) ? storylineEntry.name : id;
        //                     return `${completed ? '✅' : '❌'} ${name}`;
        //                 }).join('\n')
        //             })],
        //         ephemeral: true
        //     });
        //     return;
        // }

        // Check for isolation or high suspicion
        if (user.isInIsolation || user.suspiciousLevel >= 80) {
            await interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor(PRISON_COLORS.danger as ColorResolvable)
                    .setTitle('⚠️ Access Denied')
                    .setDescription(user.isInIsolation 
                        ? 'You are currently in isolation. Access to trials is restricted.'
                        : 'Your suspicious behavior has been noted. Access temporarily restricted.')
                    .setFooter({ text: 'Try again when your status improves' })],
                flags: [MessageFlags.Ephemeral]
            });
            return;
        }

        switch (sub) {
            case 'create':
                await handleCreate(interaction, user);
                break;
            case 'join':
                await handleJoin(interaction, user);
                break;
            case 'start':
                await handleStart(interaction, user);
                break;
        }
    }
});

async function handleCreate(interaction: ChatInputCommandInteraction, user: UserDocument) {
    if (!interaction.channel?.isTextBased()) {
        await interaction.reply({ content: 'This command can only be used in text channels.', ephemeral: true });
        return;
    }

    const difficulty = interaction.options.getString('difficulty', true);
    const minPlayers = difficulty === 'hard' ? 5 : 3;
    const maxPlayers = difficulty === 'hard' ? 7 : 5;

    const game = await createGame(interaction.channelId, interaction.user.id, minPlayers, maxPlayers);

    const embed = new EmbedBuilder()
        .setColor(user.sanity < 30 ? PRISON_COLORS.danger as ColorResolvable : PRISON_COLORS.primary as ColorResolvable)
        .setTitle('👥 Judas Protocol Initializing')
        .setDescription(
            `${STORYLINE.Judas.flavorText}\n\n` +
            (user.sanity < 50 ? getRandomGlitchMessage() + '\n\n' : '') +
            `Protocol ID: **${game.gameId}**`
        )
        .addFields(
            { name: 'Host', value: `<@${interaction.user.id}>`, inline: true },
            { name: 'Players', value: `1/${maxPlayers}`, inline: true },
            { name: 'Difficulty', value: difficulty, inline: true },
            { name: 'Join', value: `Use \`/judas join code:${game.gameId}\` to participate` },
            { name: '⚠️ Warning', value: 'This is a high-stakes psychological game. Trust carefully...' }
        )
        .setFooter({ text: user.sanity < 30 ? 'T̷r̷u̷s̷t̷ ̷n̷o̷ ̷o̷n̷e̷.̷.̷.' : 'The truth lies in the shadows...' });

    await interaction.reply({ embeds: [embed] });
}

async function handleJoin(interaction: ChatInputCommandInteraction, user: UserDocument) {
    const gameId = interaction.options.getString('code', true);
    const game = getGame(gameId);

    if (!game) {
        await interaction.reply({ content: 'Protocol instance not found.', flags: [MessageFlags.Ephemeral] });
        return;
    }

    if (game.players.some(p => p.id === interaction.user.id)) {
        await interaction.reply({ content: 'You are already part of this protocol.', ephemeral: true });
        return;
    }

    if (game.players.length >= game.maxPlayers) {
        await interaction.reply({ content: 'This protocol instance is full.', ephemeral: true });
        return;
    }

    if (game.started) {
        await interaction.reply({ content: 'This protocol is already in progress.', ephemeral: true });
        return;
    }

    game.players.push({
        id: interaction.user.id,
        username: interaction.user.username,
        secret: '',
        revealed: false,
        sanity: user.sanity,
        merit: user.meritPoints,
        suspiciousLevel: user.suspiciousLevel,
        isAlive: true
    });

    const embed = new EmbedBuilder()
        .setColor(user.sanity < 30 ? PRISON_COLORS.danger as ColorResolvable : PRISON_COLORS.success as ColorResolvable)
        .setTitle('👥 Subject Added to Protocol')
        .setDescription(
            (user.sanity < 50 ? getRandomGlitchMessage() + '\n\n' : '') +
            `Welcome to Protocol ${gameId}`
        )
        .addFields(
            { name: 'Host', value: `<@${game.hostId}>`, inline: true },
            { name: 'Players', value: `${game.players.length}/${game.maxPlayers}`, inline: true },
            { name: 'Subject List', value: game.players.map(p => `<@${p.id}>`).join('\n') }
        )
        .setFooter({ text: user.sanity < 30 ? 'W̷a̷t̷c̷h̷ ̷y̷o̷u̷r̷ ̷b̷a̷c̷k̷.̷.̷.' : 'Trust is a fragile thing...' });

    await interaction.reply({ embeds: [embed] });

    if (game.players.length >= game.minPlayers) {
        const readyEmbed = new EmbedBuilder()
            .setColor(PRISON_COLORS.success as ColorResolvable)
            .setTitle('🔓 Protocol Ready')
            .setDescription('Minimum player count reached. The host may start when ready.');

        if (interaction.channel instanceof TextChannel) {
            await interaction.channel.send({ embeds: [readyEmbed] });
        }
    }
}

async function handleStart(interaction: ChatInputCommandInteraction, user: UserDocument) {
    const gameId = interaction.options.getString('code', true);
    const game = getGame(gameId);

    if (!game) {
        await interaction.reply({ content: 'Protocol instance not found.', flags: [MessageFlags.Ephemeral] });
        return;
    }

    if (game.hostId !== interaction.user.id) {
        await interaction.reply({ content: 'Only the host can start the protocol.', flags: [MessageFlags.Ephemeral] });
        return;
    }

    if (game.started) {
        await interaction.reply({ content: 'This protocol is already in progress.', flags: [MessageFlags.Ephemeral] });
        return;
    }

    if (game.players.length < game.minPlayers) {
        await interaction.reply({ 
            content: `Not enough players. Need at least ${game.minPlayers} to start.`, 
            flags: [MessageFlags.Ephemeral]
        });
        return;
    }

    // Assign secrets and roles
    const { success, judasId } = assignSecrets(gameId);
    if (!success || !judasId) {
        await interaction.reply({ content: 'Failed to initialize protocol.', ephemeral: true });
        return;
    }

    // Start the game
    await startGame(gameId);

    // Send initial DMs to all players
    const dmPromises = game.players.map(async (player) => {
        const dmEmbed = new EmbedBuilder()
            .setColor(player.id === judasId ? PRISON_COLORS.danger as ColorResolvable : PRISON_COLORS.primary as ColorResolvable)
            .setTitle(player.id === judasId ? '🎭 You are the Judas' : '👥 Your Secret')
            .setDescription(
                player.id === judasId ?
                'Your mission is to blend in and eliminate the others without being discovered.' :
                'Trust carefully. One among you is not what they seem.'
            )
            .addFields(
                { name: 'Your Secret', value: player.secret },
                { 
                    name: player.id === judasId ? 'Mission' : 'Warning',
                    value: player.id === judasId ?
                        'Use this fake background to gain trust. Survive until only one loyal prisoner remains.' :
                        'Share information carefully. The Judas will use what they learn against you.'
                }
            );

        const userObj = await interaction.client.users.fetch(player.id);
        await userObj.send({ embeds: [dmEmbed] }).catch(() => {
            // Handle DM failure silently - player might have DMs disabled
        });
    });

    // Wait for DMs to be sent
    await Promise.all(dmPromises);

    // Send public start message
    const startEmbed = new EmbedBuilder()
        .setColor(user.sanity < 30 ? PRISON_COLORS.danger as ColorResolvable : PRISON_COLORS.warning as ColorResolvable)
        .setTitle('🎭 The Judas Protocol Begins')
        .setDescription(
            (user.sanity < 50 ? getRandomSystemLie(gameId) + '\n\n' : '') +
            'Each prisoner holds a secret. But one of you is the Judas, with a false identity.\n\n' +
            'Phase 1: Share information or keep it hidden. Watch reactions carefully.'
        )
        .addFields(
            { name: 'Subjects', value: game.players.map(p => `<@${p.id}>`).join('\n') },
            { name: '⏳ Time', value: `${game.roundDuration / 1000} seconds for information sharing` }
        )
        .setFooter({ text: user.sanity < 30 ? 'T̷r̷u̷s̷t̷ ̷n̷o̷ ̷o̷n̷e̷.̷.̷.' : 'The truth lies in the shadows...' });

    await interaction.reply({ embeds: [startEmbed] });

    // Set round timer
    game.timer = setTimeout(() => {
        advancePhase(gameId);
    }, game.roundDuration);
}

async function handleSecretReveal(interaction: ButtonInteraction, game: JudasGameState) {
    const player = game.players.find(p => p.id === interaction.user.id);
    if (!player || !player.isAlive) {
        await interaction.reply({ content: 'You are not an active player in this protocol.', ephemeral: true });
        return;
    }

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId('confirm_reveal')
            .setLabel('Confirm Reveal')
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId('cancel_reveal')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({
        content: 'Are you sure you want to reveal your secret? This cannot be undone.',
        components: [row],
        ephemeral: true
    });
}

async function handleVoteSubmission(
    interaction: ButtonInteraction, 
    game: JudasGameState,
    targetId: string
) {
    const voter = game.players.find(p => p.id === interaction.user.id);
    const target = game.players.find(p => p.id === targetId);

    if (!voter || !voter.isAlive) {
        await interaction.reply({ 
            content: NOTIFICATIONS.invalidVote, 
            ephemeral: true 
        });
        return;
    }

    if (game.votes[voter.id]) {
        await interaction.reply({ 
            content: NOTIFICATIONS.alreadyVoted, 
            ephemeral: true 
        });
        return;
    }

    if (!target || !target.isAlive) {
        await interaction.reply({ 
            content: NOTIFICATIONS.invalidVote, 
            ephemeral: true 
        });
        return;
    }

    // Record the vote
    if (processVote(game.gameId, voter.id, targetId)) {
        await interaction.reply({ 
            content: `Your vote against <@${targetId}> has been recorded.`, 
            ephemeral: true 
        });

        // Check if all active players have voted
        const alivePlayers = getAlivePlayers(game.gameId);
        const voteCount = Object.keys(game.votes).length;

        if (voteCount === alivePlayers.length) {
            await resolveVoting(interaction, game);
        }
    } else {
        await interaction.reply({ 
            content: 'Failed to process vote. Please try again.', 
            ephemeral: true 
        });
    }
}

async function resolveVoting(interaction: ButtonInteraction, game: JudasGameState) {
    const result = resolveVotes(game.gameId);
    if (!result) {
        if (interaction.channel instanceof TextChannel) {
            await interaction.channel.send({
                embeds: [new EmbedBuilder()
                    .setColor(getColorFromPrisonColor('warning'))
                    .setTitle('📊 Vote Results')
                    .setDescription(NOTIFICATIONS.tieVote)]
            });
        }
        return;
    }

    const eliminatedPlayer = game.players.find(p => p.id === result.eliminated);
    if (!eliminatedPlayer) return;

    // Create results embed
    const resultsEmbed = new EmbedBuilder()
        .setColor(result.isJudas ? PRISON_COLORS.success as ColorResolvable : PRISON_COLORS.danger as ColorResolvable)
        .setTitle('📊 Elimination Results')
        .setDescription(NOTIFICATIONS.playerEliminated.replace('{player}', `<@${result.eliminated}>`))
        .addFields({
            name: 'Identity',
            value: result.isJudas ? 
                '🎭 The eliminated prisoner was indeed the Judas!' :
                '❌ The eliminated prisoner was innocent!'
        });

    if (interaction.channel instanceof TextChannel) {
        await interaction.channel.send({ embeds: [resultsEmbed] });
    }

    // Check if game should end
    const endResult = checkGameEnd(game.gameId);
    if (endResult.ended) {
        await handleGameEnd(interaction, game, endResult.judasWon || false);
    } else if (shouldAdvancePhase(game.gameId)) {
        advancePhase(game.gameId);
        await announceNextPhase(interaction, game);
    }
}

async function handleGameEnd(
    interaction: ButtonInteraction, 
    game: JudasGameState, 
    judasWon: boolean
) {
    const victoryMessage = judasWon ? 
        VICTORY_MESSAGES.judasWins : 
        VICTORY_MESSAGES.innocentsWin;

    const endEmbed = new EmbedBuilder()
        .setColor(judasWon ? PRISON_COLORS.danger as ColorResolvable : PRISON_COLORS.success as ColorResolvable)
        .setTitle(victoryMessage.title)
        .setDescription(victoryMessage.description)
        .addFields(
            { name: 'The Judas', value: `<@${game.judasId}>` },
            { name: 'Survivors', value: getAlivePlayers(game.gameId)
                .map(p => `<@${p.id}>`).join('\n') || 'None' }
        );

    if (interaction.channel instanceof TextChannel) {
        await interaction.channel.send({ embeds: [endEmbed] });
    }

    // Update stats for all players
    for (const player of game.players) {
        const isJudas = player.id === game.judasId;
        const wasSuccessful = (isJudas && judasWon) || (!isJudas && !judasWon);
        await updatePlayerStats(player, isJudas, wasSuccessful);
    }

    // End the game
    endGame(game.gameId);
}

async function announceNextPhase(interaction: ButtonInteraction, game: JudasGameState) {
    const phaseMessage = PHASE_MESSAGES[`phase${game.phase}`];
    if (!phaseMessage) return;

    const phaseEmbed = new EmbedBuilder()
        .setColor(PRISON_COLORS.primary as ColorResolvable)
        .setTitle(`Phase ${game.phase}`)
        .setDescription(phaseMessage.start)
        .addFields(
            { name: 'Remaining Players', value: getAlivePlayers(game.gameId)
                .map(p => `<@${p.id}>`).join('\n') },
            { name: '⏳ Time', value: `${game.roundDuration / 1000} seconds` }
        );

    if (interaction.channel instanceof TextChannel) {
        await interaction.channel.send({ embeds: [phaseEmbed] });
    }

    // Reset round timer
    if (game.timer) {
        clearTimeout(game.timer);
    }
    game.timer = setTimeout(() => {
        advancePhase(game.gameId);
    }, game.roundDuration);
}

// Function to update player stats after game ends
async function updatePlayerStats(
    player: JudasPlayer, 
    isJudas: boolean, 
    wasSuccessful: boolean
): Promise<void> {
    const rewards = PUZZLE_REWARDS.judas[isJudas ? 'traitor' : 'innocent'][wasSuccessful ? 'success' : 'failure'];
    
    const stats = {
        meritPoints: player.merit + rewards.meritPoints,
        sanity: Math.min(Math.max(player.sanity + rewards.sanity, 0), 100),
        suspiciousLevel: Math.min(player.suspiciousLevel + ('suspicion' in rewards ? rewards.suspicion : 0), 100)
    };
    
    await UserService.updateUserStats(player.id, stats);

    if (wasSuccessful) {
        await UserService.updatePuzzleProgress(player.id, 'Judas', true);
    }
}

function getRandomGlitchMessage(): string {
    const messages = SANITY_EFFECTS.glitchMessages;
    return messages[Math.floor(Math.random() * messages.length)];
}

function addGlitchEffect(text: string, sanity: number): string {
    if (sanity >= 50) return text;
    const glitches = ['̷', '̶', '̸', '̵', '̴'];
    return text.split('').map(char => 
        Math.random() < 0.2 ? char + glitches[Math.floor(Math.random() * glitches.length)] : char
    ).join('');
}

async function handleInteractions(interaction: ButtonInteraction) {
    // Extract game ID from button customId
    const [action, gameId, targetId] = interaction.customId.split('_');
    const game = getGame(gameId);

    if (!game) {
        await interaction.reply({ content: 'Protocol instance not found.', ephemeral: true });
        return;
    }

    const channel = interaction.channel;
    if (!channel || !(channel instanceof TextChannel)) {
        await interaction.reply({ content: 'Invalid channel type.', ephemeral: true });
        return;
    }

    switch (action) {
        case 'reveal':
            await handleSecretReveal(interaction, game);
            break;
        case 'vote':
            await handleVoteSubmission(interaction, game, targetId);
            break;
        case 'confirm':
            await handleConfirmReveal(interaction, game);
            break;
        case 'cancel':
            await interaction.update({ content: 'Action cancelled.', components: [] });
            break;
    }
}

// Update all EmbedBuilder color settings to use ColorResolvable
function getColorFromPrisonColor(colorKey: keyof typeof PRISON_COLORS): ColorResolvable {
    return PRISON_COLORS[colorKey] as ColorResolvable;
}

// Update player mapping with explicit types
function createVoteButtons(players: JudasPlayer[]): ActionRowBuilder<ButtonBuilder>[] {
    const rows: ActionRowBuilder<ButtonBuilder>[] = [];
    const buttons = players.map((player: JudasPlayer) => 
        new ButtonBuilder()
            .setCustomId(`vote_${player.id}`)
            .setLabel(player.username)
            .setStyle(ButtonStyle.Primary)
    );

    // Discord allows max 5 buttons per row
    for (let i = 0; i < buttons.length; i += 5) {
        rows.push(
            new ActionRowBuilder<ButtonBuilder>()
                .addComponents(buttons.slice(i, Math.min(i + 5, buttons.length)))
        );
    }

    return rows;
}

// Handle confirming a secret reveal
async function handleConfirmReveal(interaction: ButtonInteraction, game: JudasGameState) {
    const player = game.players.find(p => p.id === interaction.user.id);
    if (!player || !player.isAlive || player.revealed) {
        await interaction.update({ 
            content: 'Invalid action.', 
            components: [] 
        });
        return;
    }

    player.revealed = true;
    const isJudas = player.id === game.judasId;

    const revealEmbed = new EmbedBuilder()
        .setColor(getColorFromPrisonColor('warning'))
        .setTitle('🔍 Secret Revealed')
        .setDescription(`<@${player.id}> reveals their secret:`)
        .addFields({ 
            name: 'Secret', 
            value: `*"${player.secret}"*`
        });

    await interaction.update({ 
        content: 'Your secret has been revealed.', 
        components: [] 
    });

    if (interaction.channel instanceof TextChannel) {
        await interaction.channel.send({ embeds: [revealEmbed] });
    }

    // Check if phase should advance
    if (shouldAdvancePhase(game.gameId)) {
        advancePhase(game.gameId);
        await announceNextPhase(interaction, game);
    }
}
