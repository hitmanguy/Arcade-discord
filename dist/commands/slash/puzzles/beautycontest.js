"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startRound = startRound;
exports.handleKingsOfDiamondsButton = handleKingsOfDiamondsButton;
const handler_1 = require("../../../handler");
const discord_js_1 = require("discord.js");
const beauty_context_game_1 = require("../../../functions/beauty_context_game");
const text_util_1 = require("../../../constants/text_util");
const user_status_1 = require("../../../model/user_status");
const GAME_CONSTANTS_1 = require("../../../constants/GAME_CONSTANTS");
const user_services_1 = require("../../../services/user_services");
const GAME_REWARDS = {
    winner: {
        meritPoints: 50,
        sanity: 15,
        suspicionDecrease: 10
    },
    participant: {
        meritPoints: -10,
        sanity: -5,
        suspicionIncrease: 5
    }
};
const activeGames = new Map();
exports.default = new handler_1.SlashCommand({
    registerType: handler_1.RegisterType.Guild,
    data: new discord_js_1.SlashCommandBuilder()
        .setName('king-of-diamonds')
        .setDescription('Play the King of Diamonds game from Alice in Borderland')
        .addSubcommand(subcommand => subcommand
        .setName('start')
        .setDescription('Start a new King of Diamonds game'))
        .addSubcommand(subcommand => subcommand
        .setName('join')
        .setDescription('Join an active King of Diamonds game'))
        .addSubcommand(subcommand => subcommand
        .setName('rules')
        .setDescription('Display the rules of King of Diamonds')),
    async execute(interaction) {
        const user = await user_status_1.User.findOne({ discordId: interaction.user.id });
        if (!user) {
            await interaction.reply({
                content: 'You must be registered to use this command. Use `/register` first.',
                flags: [discord_js_1.MessageFlags.Ephemeral]
            });
            return;
        }
        const suspicous = user.suspiciousLevel > 50;
        if (suspicous) {
            await interaction.reply('You are too suspicious to play this game. Try again later.');
            return;
        }
        const merit = user.meritPoints;
        if (merit < 100) {
            await interaction.reply('You dont have enough merit points to play this. You can play the previous game to earn more points');
            return;
        }
        user.survivalDays += 1;
        await user.save();
        const subcommand = interaction.options.getSubcommand();
        switch (subcommand) {
            case 'start':
                await handleGameStart(interaction);
                break;
            case 'join':
                await handleGameJoin(interaction);
                break;
            case 'rules':
                await handleShowRules(interaction);
                break;
        }
    },
});
async function handleGameStart(interaction) {
    const channelId = interaction.channelId;
    if (activeGames.has(channelId)) {
        await interaction.reply({
            content: 'There is already an active King of Diamonds game in this channel! Use `/king-of-diamonds join` to join it.',
            flags: [discord_js_1.MessageFlags.Ephemeral]
        });
        return;
    }
    const game = new beauty_context_game_1.KingsOfDiamondsGame();
    activeGames.set(channelId, game);
    const user = await user_status_1.User.findOne({ discordId: interaction.user.id });
    const success = game.addPlayer({
        id: interaction.user.id,
        name: interaction.user.username,
        sanity: user?.sanity || 100
    });
    if (!success) {
        await interaction.reply({
            content: 'Failed to create the game. Please try again.',
            flags: [discord_js_1.MessageFlags.Ephemeral]
        });
        activeGames.delete(channelId);
        return;
    }
    const row = new discord_js_1.ActionRowBuilder()
        .addComponents(new discord_js_1.ButtonBuilder()
        .setCustomId('kod_join')
        .setLabel('Join Game')
        .setStyle(discord_js_1.ButtonStyle.Primary), new discord_js_1.ButtonBuilder()
        .setCustomId('kod_start')
        .setLabel('Start Game')
        .setStyle(discord_js_1.ButtonStyle.Success));
    const embed = new discord_js_1.EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('King of Diamonds - Alice in Borderland')
        .setDescription('A new King of Diamonds game is starting! Click the button below to join.')
        .addFields({ name: 'Players', value: `1. ${interaction.user.username}`, inline: true }, { name: 'Status', value: 'Waiting for players...', inline: true }, { name: 'Minimum Players', value: '3', inline: true })
        .setFooter({ text: 'The game will start when the host clicks "Start Game"' });
    let response;
    if (!interaction.replied && !interaction.deferred) {
        response = await interaction.reply({
            embeds: [embed],
            components: [row],
            fetchReply: true
        });
    }
    else {
        response = await interaction.followUp({
            embeds: [embed],
            components: [row],
            fetchReply: true
        });
    }
    const collector = response.createMessageComponentCollector({
        componentType: discord_js_1.ComponentType.Button,
        time: 300000
    });
    collector.on('collect', async (buttonInteraction) => {
        if (buttonInteraction.customId === 'kod_join') {
            await handleJoinButton(buttonInteraction, game, embed);
        }
        else if (buttonInteraction.customId === 'kod_start') {
            if (buttonInteraction.user.id !== interaction.user.id) {
                await buttonInteraction.reply({
                    content: 'Only the host can start the game!',
                    ephemeral: true
                });
                return;
            }
            if (game.getPlayerCount() < 3) {
                await buttonInteraction.reply({
                    content: 'You need at least 3 players to start the game!',
                    ephemeral: true
                });
                return;
            }
            collector.stop('game_started');
            await buttonInteraction.update({
                components: []
            });
            await startGame(buttonInteraction, game, channelId);
        }
    });
    collector.on('end', async (collected, reason) => {
        if (reason !== 'game_started') {
            activeGames.delete(channelId);
            await interaction.editReply({
                content: 'The game setup has timed out.',
                embeds: [],
                components: []
            });
        }
    });
}
async function handleJoinButton(interaction, game, embed) {
    const user = await user_status_1.User.findOne({ discordId: interaction.user.id });
    if (game.hasPlayer(interaction.user.id)) {
        await interaction.reply({
            content: 'You have already joined this game!',
            flags: [discord_js_1.MessageFlags.Ephemeral]
        });
        return;
    }
    const success = game.addPlayer({
        id: interaction.user.id,
        name: interaction.user.username,
        sanity: user?.sanity || 100
    });
    if (!success) {
        await interaction.reply({
            content: 'Failed to join the game. The game might be full.',
            flags: [discord_js_1.MessageFlags.Ephemeral]
        });
        return;
    }
    const players = game.getPlayers().map((player, i) => `${i + 1}. ${player.name}`).join('\n');
    embed.setFields({ name: 'Players', value: players, inline: true }, { name: 'Status', value: 'Waiting for players...', inline: true }, { name: 'Minimum Players', value: '3', inline: true });
    if (!interaction.replied && !interaction.deferred) {
        await interaction.update({
            embeds: [embed]
        });
    }
    else {
        await interaction.followUp({
            embeds: [embed]
        });
    }
}
async function handleGameJoin(interaction) {
    const channelId = interaction.channelId;
    const game = activeGames.get(channelId);
    if (!game) {
        await interaction.reply({
            content: 'There is no active King of Diamonds game in this channel! Use `/king-of-diamonds start` to start one.',
            flags: [discord_js_1.MessageFlags.Ephemeral]
        });
        return;
    }
    if (game.hasPlayer(interaction.user.id)) {
        await interaction.reply({
            content: 'You have already joined this game!',
            flags: [discord_js_1.MessageFlags.Ephemeral]
        });
        return;
    }
    const user = await user_status_1.User.findOne({ discordId: interaction.user.id });
    const success = game.addPlayer({
        id: interaction.user.id,
        name: interaction.user.username,
        sanity: user?.sanity || 100
    });
    if (!success) {
        await interaction.reply({
            content: 'Failed to join the game. The game might be full or already started.',
            flags: [discord_js_1.MessageFlags.Ephemeral]
        });
        return;
    }
    await interaction.reply({
        content: `You've joined the King of Diamonds game! Wait for the host to start the game.`,
        flags: [discord_js_1.MessageFlags.Ephemeral]
    });
}
async function handleShowRules(interaction) {
    const embed = new discord_js_1.EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('King of Diamonds - Rules')
        .setDescription('Welcome to the ultimate test of wit and strategy, where your decisions determine your fate!')
        .addFields({
        name: 'Basic Rules',
        value: '- Select a number between 0 and 100\n- At the end of each round, all chosen numbers are averaged and multiplied by 0.8\n- The player whose selected number is closest to the calculated product wins the round\n- The winner gets no point deductions while the losers lose a point\n- Any player who accumulates a score of -10 is eliminated\n- Last player standing wins!'
    }, {
        name: 'Special Rules',
        value: '- If all players select the same number, everyone receives a deduction\n- New rules are added as players are eliminated!'
    });
    await interaction.reply({
        embeds: [embed],
        flags: [discord_js_1.MessageFlags.Ephemeral]
    });
}
async function startGame(interaction, game, channelId) {
    game.startGame();
    const introEmbed = new discord_js_1.EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('King of Diamonds - Game Started')
        .setDescription('Welcome to the ultimate test of wit and strategy, where your decisions determine your fate!')
        .addFields({ name: 'Players', value: game.getPlayers().map(p => p.name).join('\n'), inline: true }, { name: 'Round', value: '1', inline: true });
    await interaction.followUp({
        embeds: [introEmbed]
    });
    await startRound(interaction, game, channelId);
}
async function startRound(interaction, game, channelId) {
    await game.startRound();
    const embed = new discord_js_1.EmbedBuilder()
        .setColor('#FF0000')
        .setTitle(`King of Diamonds - Round ${game.getRound()}`)
        .setDescription('Make your selection!')
        .addFields({ name: 'Time Remaining', value: '30 seconds', inline: true }, { name: 'Players', value: game.getActivePlayers().map(p => `${p.name} (${p.score})`).join('\n'), inline: true });
    const row = new discord_js_1.ActionRowBuilder()
        .addComponents(new discord_js_1.ButtonBuilder()
        .setCustomId('kod_select_number')
        .setLabel('Select Your Number')
        .setStyle(discord_js_1.ButtonStyle.Primary));
    const response = await interaction.followUp({
        embeds: [embed],
        components: [row]
    });
    const buttonCollector = response.createMessageComponentCollector({
        componentType: discord_js_1.ComponentType.Button,
        time: 30000
    });
    buttonCollector.on('collect', async (i) => {
        if (i.customId === 'kod_select_number') {
            const player = game.getPlayer(i.user.id);
            if (!player) {
                await i.reply({
                    content: 'You are not part of this game!',
                    flags: discord_js_1.MessageFlags.Ephemeral
                });
                return;
            }
            if (player.hasSelected) {
                await i.reply({
                    content: 'You have already made your selection for this round!',
                    flags: discord_js_1.MessageFlags.Ephemeral
                });
                return;
            }
            await showNumberSelectionModal(i);
        }
    });
    const modalFilter = (i) => i.customId === 'kod_number_select' && game.hasPlayer(i.user.id);
    const modalHandler = async (modal) => {
        if (!modal.isModalSubmit())
            return;
        if (!modalFilter(modal))
            return;
        const number = parseInt(modal.fields.getTextInputValue('selected_number'));
        if (isNaN(number) || number < 0 || number > 100) {
            await modal.reply({
                content: 'Please enter a valid number between 0 and 100!',
                flags: discord_js_1.MessageFlags.Ephemeral
            });
            return;
        }
        const player = game.getPlayer(modal.user.id);
        if (!player || player.hasSelected)
            return;
        if (player.sanity < 30) {
            const glitched = (0, text_util_1.glitchText)('Your hands are shaking... you can barely focus...');
            await modal.reply({
                content: glitched,
                flags: discord_js_1.MessageFlags.Ephemeral
            });
            const actualNumber = Math.random() < 0.7 ? number : Math.floor(Math.random() * 101);
            game.selectNumber(modal.user.id, actualNumber);
            setTimeout(async () => {
                await modal.followUp({
                    content: (0, text_util_1.glitchText)(`You selected: ${actualNumber}`),
                    flags: discord_js_1.MessageFlags.Ephemeral
                });
            }, 1500);
        }
        else {
            game.selectNumber(modal.user.id, number);
            await modal.reply({
                content: `You selected: ${number}`,
                flags: discord_js_1.MessageFlags.Ephemeral
            });
        }
        const selectedPlayers = game.getActivePlayers()
            .map(p => `${p.name} (${p.score})${p.hasSelected ? ' ✓' : ''}`)
            .join('\n');
        embed.setFields({ name: 'Time Remaining', value: 'Waiting for players...', inline: true }, { name: 'Players', value: selectedPlayers, inline: true });
        await response.edit({
            embeds: [embed]
        });
        if (game.allPlayersSelected()) {
            buttonCollector.stop('all_selected');
        }
    };
    interaction.client.on('interactionCreate', modalHandler);
    buttonCollector.on('end', async () => {
        interaction.client.removeListener('interactionCreate', modalHandler);
        await processRoundResults(interaction, game, channelId);
    });
}
async function showNumberSelectionModal(interaction) {
    const modal = new discord_js_1.ModalBuilder()
        .setCustomId('kod_number_select')
        .setTitle('Select Your Number')
        .addComponents(new discord_js_1.ActionRowBuilder()
        .addComponents(new discord_js_1.TextInputBuilder()
        .setCustomId('selected_number')
        .setLabel('Enter a number between 0 and 100')
        .setStyle(discord_js_1.TextInputStyle.Short)
        .setMinLength(1)
        .setMaxLength(3)
        .setPlaceholder('Enter your number here...')
        .setRequired(true)));
    await interaction.showModal(modal);
}
async function processRoundResults(interaction, game, channelId) {
    let results = game.evaluateRound();
    if (!results) {
        game.assignRandomNumbers();
        results = game.evaluateRound();
        if (!results) {
            await interaction.followUp({
                content: 'Error processing round results.',
            });
            return;
        }
    }
    const resultsEmbed = new discord_js_1.EmbedBuilder()
        .setColor('#FF0000')
        .setTitle(`King of Diamonds - Round ${game.getRound()} Results`)
        .setDescription(results.message)
        .addFields({ name: 'Player Choices', value: results.choices.map(c => `${c.name}: ${c.number}`).join('\n'), inline: true }, { name: 'Regal\'s Number', value: results.regalsNumber.toString(), inline: true }, { name: 'Scores', value: game.getActivePlayers().map(p => `${p.name}: ${p.score}`).join('\n'), inline: true });
    const components = [];
    if (game.getPhase() === 1 && results.winners.length > 0) {
        const row = new discord_js_1.ActionRowBuilder()
            .addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId('kod_reduce_life')
            .setLabel('Reduce Player Life')
            .setStyle(discord_js_1.ButtonStyle.Danger));
        components.push(row);
    }
    if (game.getPhase() === 2 && !game.allPlayersSelected()) {
        const row = new discord_js_1.ActionRowBuilder()
            .addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId('kod_form_team')
            .setLabel('Form Team')
            .setStyle(discord_js_1.ButtonStyle.Primary));
        components.push(row);
    }
    await interaction.followUp({
        embeds: [resultsEmbed],
        components
    });
    if (components.length > 0) {
        const collector = interaction.channel?.createMessageComponentCollector({
            componentType: discord_js_1.ComponentType.Button,
            time: 30000
        });
        collector?.on('collect', async (i) => {
            if (i.customId === 'kod_reduce_life' && results.winners.includes(i.user.id)) {
                await handleLifeReduction(i, game);
            }
            else if (i.customId === 'kod_form_team' && game.getActivePlayers().some(p => p.id === i.user.id)) {
                await handleTeamFormation(i, game);
            }
        });
    }
    const eliminatedPlayers = game.checkForEliminations();
    if (eliminatedPlayers.length > 0) {
        const eliminationEmbed = new discord_js_1.EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('Player Eliminated!')
            .setDescription(`${eliminatedPlayers.map(p => p.name).join(', ')} has been eliminated!`);
        await interaction.followUp({
            embeds: [eliminationEmbed]
        });
        if (game.shouldAddNewRule()) {
            const newRule = game.addNewRule();
            const ruleEmbed = new discord_js_1.EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('New Rule Added!')
                .setDescription(newRule);
            await interaction.followUp({
                embeds: [ruleEmbed]
            });
        }
    }
    if (game.isGameOver()) {
        const winner = game.getWinner();
        const losers = game.getPlayers().filter(p => p.id !== winner?.id);
        if (winner) {
            const winnerUser = await user_status_1.User.findOne({ discordId: winner.id });
            if (winnerUser) {
                winnerUser.completedAllPuzzles = true;
                await winnerUser.save();
            }
            if (winnerUser) {
                await user_services_1.UserService.updateUserStats(winner.id, {
                    meritPoints: winnerUser.meritPoints + GAME_REWARDS.winner.meritPoints,
                    sanity: Math.min(winnerUser.sanity + GAME_REWARDS.winner.sanity, 100),
                    suspiciousLevel: Math.max(winnerUser.suspiciousLevel - GAME_REWARDS.winner.suspicionDecrease, 0),
                    totalGamesPlayed: winnerUser.totalGamesPlayed + 1,
                    totalGamesWon: winnerUser.totalGamesWon + 1,
                    currentStreak: winnerUser.currentStreak + 1
                });
            }
            for (const loser of losers) {
                const loserUser = await user_status_1.User.findOne({ discordId: loser.id });
                if (loserUser) {
                    await user_services_1.UserService.updateUserStats(loser.id, {
                        meritPoints: Math.max(loserUser.meritPoints + GAME_REWARDS.participant.meritPoints, 0),
                        sanity: Math.max(loserUser.sanity + GAME_REWARDS.participant.sanity, 0),
                        suspiciousLevel: Math.min(loserUser.suspiciousLevel + GAME_REWARDS.participant.suspicionIncrease, 100),
                        totalGamesPlayed: loserUser.totalGamesPlayed + 1,
                        currentStreak: 0
                    });
                }
            }
            const gameOverEmbed = new discord_js_1.EmbedBuilder()
                .setColor(GAME_CONSTANTS_1.PRISON_COLORS.success)
                .setTitle('👑 Game Over - King of Diamonds')
                .setDescription(`${winner.name} has won the game!`)
                .addFields({
                name: '🏆 Winner Rewards',
                value: `• Merit Points: +${GAME_REWARDS.winner.meritPoints}\n• Sanity: +${GAME_REWARDS.winner.sanity}\n• Suspicion: -${GAME_REWARDS.winner.suspicionDecrease}\n• Win Streak: ${winnerUser?.currentStreak ?? 1}`,
                inline: true
            }, {
                name: '⚠️ Other Players',
                value: `• Merit Points: ${GAME_REWARDS.participant.meritPoints}\n• Sanity: ${GAME_REWARDS.participant.sanity}\n• Suspicion: +${GAME_REWARDS.participant.suspicionIncrease}\n• Streak Reset`,
                inline: true
            })
                .setFooter({ text: 'The game has concluded. Thank you for playing!' });
            await interaction.followUp({ embeds: [gameOverEmbed] });
        }
        activeGames.delete(channelId);
        return;
    }
    setTimeout(() => {
        startRound(interaction, game, channelId);
    }, 30000);
}
async function handleLifeReduction(interaction, game) {
    const players = game.getActivePlayers().filter(p => p.id !== interaction.user.id);
    if (players.length === 0) {
        await interaction.reply({
            content: 'No players available to target!',
            flags: discord_js_1.MessageFlags.Ephemeral
        });
        return;
    }
    const row = new discord_js_1.ActionRowBuilder()
        .addComponents(new discord_js_1.StringSelectMenuBuilder()
        .setCustomId('kod_life_target')
        .setPlaceholder('Select a player to reduce their life')
        .addOptions(players.map(p => ({
        label: p.name,
        value: p.id,
        description: `Extra lives: ${p.extraLives}`
    }))));
    await interaction.reply({
        content: 'Select a player to reduce their extra life:',
        components: [row],
        ephemeral: true
    });
    const collector = interaction.channel?.createMessageComponentCollector({
        componentType: discord_js_1.ComponentType.StringSelect,
        filter: (i) => i.customId === 'kod_life_target' && i.user.id === interaction.user.id,
        time: 30000,
        max: 1
    });
    collector?.on('collect', async (i) => {
        const targetId = i.values[0];
        const success = game.reducePlayerLife(targetId);
        const target = game.getPlayer(targetId);
        if (success && target) {
            if (!i.replied && !i.deferred) {
                await i.update({
                    content: `Successfully reduced ${target.name}'s extra life! They now have ${target.extraLives} lives remaining.`,
                    components: []
                });
            }
            else {
                await i.followUp({
                    content: `Successfully reduced ${target.name}'s extra life! They now have ${target.extraLives} lives remaining.`,
                    components: [],
                    ephemeral: true
                });
            }
        }
        else {
            await i.update({
                content: 'Failed to reduce player\'s life. They might not have any extra lives left.',
                components: []
            });
        }
    });
}
async function handleTeamFormation(interaction, game) {
    const availablePlayers = game.getActivePlayers().filter(p => p.id !== interaction.user.id && !p.teamMate);
    if (availablePlayers.length === 0) {
        await interaction.reply({
            content: 'No available players to team up with!',
            flags: discord_js_1.MessageFlags.Ephemeral
        });
        return;
    }
    const row = new discord_js_1.ActionRowBuilder()
        .addComponents(new discord_js_1.StringSelectMenuBuilder()
        .setCustomId('kod_team_target')
        .setPlaceholder('Select a player to team up with')
        .addOptions(availablePlayers.map(p => ({
        label: p.name,
        value: p.id,
        description: `Current score: ${p.score}`
    }))));
    await interaction.reply({
        content: 'Select a player to team up with:',
        components: [row],
        flags: discord_js_1.MessageFlags.Ephemeral
    });
    const collector = interaction.channel?.createMessageComponentCollector({
        componentType: discord_js_1.ComponentType.StringSelect,
        filter: (i) => i.customId === 'kod_team_target' && i.user.id === interaction.user.id,
        time: 30000,
        max: 1
    });
    collector?.on('collect', async (i) => {
        const targetId = i.values[0];
        const modal = new discord_js_1.ModalBuilder()
            .setCustomId(`kod_team_number_${targetId}`)
            .setTitle('Team Number Selection')
            .addComponents(new discord_js_1.ActionRowBuilder()
            .addComponents(new discord_js_1.TextInputBuilder()
            .setCustomId('team_number')
            .setLabel('Enter your team\'s number (0-100)')
            .setStyle(discord_js_1.TextInputStyle.Short)
            .setRequired(true)));
        await i.showModal(modal);
        const modalFilter = (mi) => mi.customId === `kod_team_number_${targetId}` && mi.user.id === interaction.user.id;
        try {
            const modalInteraction = await interaction.awaitModalSubmit({
                filter: modalFilter,
                time: 60000
            });
            const number = parseInt(modalInteraction.fields.getTextInputValue('team_number'));
            if (isNaN(number) || number < 0 || number > 100) {
                await modalInteraction.reply({
                    content: 'Please enter a valid number between 0 and 100!',
                    flags: discord_js_1.MessageFlags.Ephemeral
                });
                return;
            }
            const success = game.formTeam(interaction.user.id, targetId, number);
            if (success) {
                const teammate = game.getPlayer(targetId);
                await modalInteraction.reply({
                    content: `Successfully formed a team with ${teammate?.name}! Your team number is ${number}.`,
                    flags: discord_js_1.MessageFlags.Ephemeral
                });
            }
            else {
                await modalInteraction.reply({
                    content: 'Failed to form team. The player might already be in a team.',
                    flags: discord_js_1.MessageFlags.Ephemeral
                });
            }
        }
        catch (error) {
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: 'The game setup has timed out.',
                    embeds: [],
                    components: [],
                    ephemeral: true
                });
            }
            else {
                await interaction.editReply({
                    content: 'The game setup has timed out.',
                    embeds: [],
                    components: []
                });
            }
        }
    });
}
async function handleKingsOfDiamondsButton(interaction) {
    const channelId = interaction.channelId;
    const game = activeGames.get(channelId);
    if (!game) {
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: 'The game has ended or doesnt exist anymore.',
                embeds: [],
                components: [],
                ephemeral: true
            });
        }
        else {
            await interaction.editReply({
                content: 'The game has ended or doesnt exist anymore.',
                embeds: [],
                components: []
            });
        }
        return;
    }
}
function getColorFromPrisonColor(colorKey) {
    return GAME_CONSTANTS_1.PRISON_COLORS[colorKey];
}
//# sourceMappingURL=beautycontest.js.map