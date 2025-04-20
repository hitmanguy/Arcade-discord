import { RegisterType, SlashCommand } from '../../../handler';
import {
    ChatInputCommandInteraction,
    EmbedBuilder,
    ActionRowBuilder,
    SlashCommandBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    SlashCommandBooleanOption
} from 'discord.js';
import { User, UserDocument } from '../../../model/user_status';
import { UserService } from '../../../services/user_services';
import { STORYLINE, PRISON_COLORS, PUZZLE_REWARDS, SANITY_EFFECTS, createProgressBar } from '../../../constants/GAME_CONSTANTS';

interface Card {
    color: 'red' | 'blue' | 'green' | 'yellow' | 'wild';
    value: string;
    id: string;
}

interface UnoGame {
    playerHand: Card[];
    computerHand: Card[];
    currentCard: Card;
    isPlayerTurn: boolean;
    difficulty: 'easy' | 'medium' | 'hard';
    round: number;
}

const COLORS = ['red', 'blue', 'green', 'yellow'] as const;
const VALUES = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'skip', 'reverse', '+2'];
const COLOR_EMOJIS = {
    red: '❤️',
    blue: '💙',
    green: '💚',
    yellow: '💛',
    wild: '🌈'
};

function createDeck(): Card[] {
    const deck: Card[] = [];
    let id = 0;

    // Regular cards
    COLORS.forEach(color => {
        VALUES.forEach(value => {
            deck.push({ color, value, id: `${id++}` });
            if (value !== '0') { // Two of each except 0
                deck.push({ color, value, id: `${id++}` });
            }
        });
    });

    // Wild cards
    for (let i = 0; i < 4; i++) {
        deck.push({ color: 'wild', value: 'wild', id: `${id++}` });
        deck.push({ color: 'wild', value: '+4', id: `${id++}` });
    }

    return shuffleDeck(deck);
}

function shuffleDeck(deck: Card[]): Card[] {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

function createGame(difficulty: 'easy' | 'medium' | 'hard'): UnoGame {
    const deck = createDeck();
    const playerCards = deck.splice(0, 7);
    const computerCards = deck.splice(0, difficulty === 'easy' ? 5 : difficulty === 'medium' ? 7 : 9);
    const firstCard = deck.find(card => card.color !== 'wild') || deck[0];

    return {
        playerHand: playerCards,
        computerHand: computerCards,
        currentCard: firstCard,
        isPlayerTurn: true,
        difficulty,
        round: 1
    };
}

function formatCard(card: Card, sanity: number): string {
    let display = `${COLOR_EMOJIS[card.color]} ${card.value}`;
    
    // Apply visual distortions based on sanity
    if (sanity < 50) {
        // Randomly show wrong colors
        if (sanity < 30 && Math.random() < 0.2) {
            const colors = Object.keys(COLOR_EMOJIS);
            display = `${COLOR_EMOJIS[colors[Math.floor(Math.random() * colors.length)] as keyof typeof COLOR_EMOJIS]} ${card.value}`;
        }
        
        // Corrupt the card value
        if (sanity < 40 && Math.random() < 0.15) {
            display = addGlitches(display);
        }
    }
    
    return display;
}

function canPlayCard(card: Card, currentCard: Card): boolean {
    return card.color === 'wild' ||
           card.color === currentCard.color ||
           card.value === currentCard.value;
}

function getComputerMove(game: UnoGame): Card | null {
    const playableCards = game.computerHand.filter(card => canPlayCard(card, game.currentCard));
    if (playableCards.length === 0) return null;
    
    // Sort by priority (non-wild cards first, then by matching color/value)
    playableCards.sort((a, b) => {
        if (a.color === 'wild' && b.color !== 'wild') return 1;
        if (a.color !== 'wild' && b.color === 'wild') return -1;
        if (a.color === game.currentCard.color) return -1;
        if (b.color === game.currentCard.color) return 1;
        return 0;
    });
    
    return playableCards[0];
}

export default new SlashCommand({
    registerType: RegisterType.Guild,
    data: new SlashCommandBuilder()
    .setName('uno')
    .setDescription('Challenge the system to a game of UNO')
    .addStringOption(option =>
        option
            .setName('difficulty')
            .setDescription('Choose your challenge level')
            .setRequired(true)
            .addChoices(
                { name: '😌 Easy (5 cards)', value: 'easy' },
                { name: '😰 Medium (7 cards)', value: 'medium' },
                { name: '😱 Hard (9 cards)', value: 'hard' }
            )
    )as SlashCommandBuilder,
    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        await interaction.deferReply();

        const user = await User.findOne({ discordId: interaction.user.id });
        if (!user) {
            await interaction.editReply('You need to register first! Use `/register` to begin your journey.');
            return;
        }

        // Check for isolation or high suspicion
        if (user.isInIsolation || user.suspiciousLevel >= 80) {
            const embed = new EmbedBuilder()
                .setColor(PRISON_COLORS.danger)
                .setTitle('⚠️ Access Denied')
                .setDescription(user.isInIsolation 
                    ? 'You are currently in isolation. Access to trials is restricted.'
                    : 'Your suspicious behavior has been noted. Access temporarily restricted.')
                .setFooter({ text: 'Try again when your status improves' });
            
            await interaction.editReply({ embeds: [embed] });
            return;
        }

        const difficulty = interaction.options.getString('difficulty', true) as 'easy' | 'medium' | 'hard';
        const game = createGame(difficulty);
        
        await playGame(interaction, game, user);
    }
});

async function playGame(
    interaction: ChatInputCommandInteraction,
    game: UnoGame,
    user: UserDocument
): Promise<void> {
    const storylineData = STORYLINE.UNO;

    function createGameEmbed(): EmbedBuilder {
        const glitchEffect = user.sanity < 50 ? getRandomGlitchMessage() + '\n\n' : '';
        
        return new EmbedBuilder()
            .setColor(user.sanity < 30 ? PRISON_COLORS.danger : PRISON_COLORS.primary)
            .setTitle('🃏 Digital Card Protocol')
            .setDescription(
                `${storylineData.flavorText}\n\n${glitchEffect}` +
                `**Current Card:**\n${formatCard(game.currentCard, user.sanity)}\n\n` +
                `**Your Hand:**\n${game.playerHand.map((card, i) => 
                    `${i + 1}. ${formatCard(card, user.sanity)}`
                ).join('\n')}\n\n` +
                `Opponent's Cards: ${game.computerHand.length}\n` +
                `Turn: ${game.isPlayerTurn ? 'Your Move' : 'Opponent Thinking...'}`
            )
            .addFields(
                { name: '🎯 Difficulty', value: game.difficulty, inline: true },
                { name: '🧠 Sanity', value: `${createProgressBar(user.sanity, 100)} ${user.sanity}%`, inline: true }
            )
            .setFooter({ 
                text: user.sanity < 40 
                    ? 'T̷h̷e̶ ̷c̶o̵l̷o̴r̷s̶ ̷b̵l̷e̷e̵d̵.̷.̶.' 
                    : 'Play your cards wisely...' 
            });
    }

    function createCardButtons(): ActionRowBuilder<ButtonBuilder>[] {
        const rows: ActionRowBuilder<ButtonBuilder>[] = [];
        const cardsPerRow = 5;
        
        for (let i = 0; i < game.playerHand.length; i += cardsPerRow) {
            const row = new ActionRowBuilder<ButtonBuilder>();
            const rowCards = game.playerHand.slice(i, i + cardsPerRow);
            
            rowCards.forEach((card, index) => {
                const button = new ButtonBuilder()
                    .setCustomId(`card_${card.id}`)
                    .setLabel(formatCard(card, user.sanity))
                    .setStyle(canPlayCard(card, game.currentCard) ? ButtonStyle.Primary : ButtonStyle.Secondary)
                    .setDisabled(!game.isPlayerTurn || !canPlayCard(card, game.currentCard));
                
                row.addComponents(button);
            });
            
            rows.push(row);
        }
        
        // Add draw card button
        if (rows.length < 5) {
            const drawRow = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('draw_card')
                        .setLabel('Draw Card')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(!game.isPlayerTurn)
                );
            rows.push(drawRow);
        }
        
        return rows;
    }

    // Initial game display
    const message = await interaction.editReply({
        embeds: [createGameEmbed()],
        components: createCardButtons()
    });

    // Set up collector for button interactions
    const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 300000 // 5 minutes
    });

    collector.on('collect', async (btnInteraction) => {
        if (btnInteraction.user.id !== interaction.user.id) {
            await btnInteraction.reply({
                content: 'These cards aren\'t meant for you...',
                ephemeral: true
            });
            return;
        }

        if (btnInteraction.customId === 'draw_card') {
            // Add a new card to player's hand
            game.playerHand.push(createDeck()[0]);
            game.isPlayerTurn = false;
        } else {
            const cardId = btnInteraction.customId.split('_')[1];
            const cardIndex = game.playerHand.findIndex(c => c.id === cardId);
            const playedCard = game.playerHand[cardIndex];
            
            // Play the card
            game.playerHand.splice(cardIndex, 1);
            game.currentCard = playedCard;
            game.isPlayerTurn = false;
            
            // Handle special cards
            if (playedCard.value === 'skip' || playedCard.value === 'reverse') {
                game.isPlayerTurn = true; // Skip computer's turn
            } else if (playedCard.value === '+2') {
                game.computerHand.push(...createDeck().slice(0, 2));
            } else if (playedCard.value === '+4') {
                game.computerHand.push(...createDeck().slice(0, 4));
            }
        }

        // Check win condition
        if (game.playerHand.length === 0) {
            collector.stop('win');
            return;
        }

        // Computer's turn
        if (!game.isPlayerTurn) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate thinking
            
            const computerCard = getComputerMove(game);
            if (computerCard) {
                const cardIndex = game.computerHand.findIndex(c => c.id === computerCard.id);
                game.computerHand.splice(cardIndex, 1);
                game.currentCard = computerCard;
                
                // Handle special cards
                if (computerCard.value === '+2') {
                    game.playerHand.push(...createDeck().slice(0, 2));
                } else if (computerCard.value === '+4') {
                    game.playerHand.push(...createDeck().slice(0, 4));
                }
            } else {
                game.computerHand.push(createDeck()[0]);
            }
            
            game.isPlayerTurn = true;
        }

        // Check computer win
        if (game.computerHand.length === 0) {
            collector.stop('lose');
            return;
        }

        // Update game display
        await btnInteraction.update({
            embeds: [createGameEmbed()],
            components: createCardButtons()
        });
    });

    collector.on('end', async (collected, reason) => {
        const isWin = reason === 'win';
        const isTimeout = reason === 'time';
        
        if (isTimeout) {
            const timeoutEmbed = new EmbedBuilder()
                .setColor(PRISON_COLORS.warning)
                .setTitle('⏰ Time\'s Up!')
                .setDescription(user.sanity < 40 
                    ? 'T̵i̸m̵e̵ ̸m̵e̷l̷t̴s̵ ̶l̷i̷k̴e̵ ̷c̶a̵r̷d̵s̴.̷.̶.'
                    : 'The game fades into static...\nPerhaps speed is as important as strategy.'
                )
                .setFooter({ text: 'Try another round with /uno' });

            await interaction.editReply({
                embeds: [timeoutEmbed],
                components: []
            });

            // Penalize for timeout
            await UserService.updateUserStats(interaction.user.id, {
                sanity: Math.max(user.sanity - 2, 0),
                currentStreak: 0
            });
            return;
        }

        // Calculate rewards based on performance
        const baseReward = PUZZLE_REWARDS[game.difficulty];
        const performanceRatio = isWin ? 1 : Math.max(0, 1 - (game.computerHand.length / 10));
        
        const meritChange = isWin 
            ? Math.round(baseReward.success.meritPoints * (1 + performanceRatio))
            : baseReward.failure.meritPoints;
        const sanityChange = isWin
            ? baseReward.success.sanity
            : Math.round(baseReward.failure.sanity * performanceRatio);

        // Add suspicion for suspicious patterns
        let suspicionChange = 0;
        if (isWin && game.round < 3) { // Suspiciously quick win
            suspicionChange = Math.min(15, user.suspiciousLevel + 10);
        }

        // Update user stats
        await Promise.all([
            UserService.updateUserStats(interaction.user.id, {
                meritPoints: user.meritPoints + meritChange,
                sanity: Math.min(Math.max(user.sanity + sanityChange, 0), 100),
                suspiciousLevel: Math.min(user.suspiciousLevel + suspicionChange, 100),
                totalGamesPlayed: user.totalGamesPlayed + 1,
                totalGamesWon: user.totalGamesWon + (isWin ? 1 : 0),
                currentStreak: isWin ? user.currentStreak + 1 : 0
            }),
            UserService.updatePuzzleProgress(interaction.user.id, 'UNO', isWin)
        ]);

        // Final result embed
        const resultEmbed = new EmbedBuilder()
            .setColor(isWin ? PRISON_COLORS.success : PRISON_COLORS.danger)
            .setTitle(isWin ? '🌟 Game Protocol Complete!' : '💫 Protocol Failed')
            .setDescription(
                `${isWin 
                    ? 'You\'ve mastered the digital deck!'
                    : 'The system proves too cunning...'}\n\n` +
                `Final Hand Size: ${game.playerHand.length}\n` +
                `Opponent's Hand: ${game.computerHand.length}`
            )
            .addFields({
                name: '📊 Results',
                value: 
                    `Merit Points: ${meritChange >= 0 ? '+' : ''}${meritChange}\n` +
                    `Sanity: ${sanityChange >= 0 ? '+' : ''}${sanityChange}\n` +
                    `Streak: ${isWin ? user.currentStreak + 1 : '0'}` +
                    (suspicionChange > 0 ? `\n⚠️ Suspicion: +${suspicionChange}` : '')
            })
            .setFooter({ 
                text: user.sanity < 30 
                    ? 'T̷h̷e̶ ̷c̶a̵r̷d̴s̷ ̶w̷h̵i̷s̷p̵e̷r̵.̷.̶.' 
                    : isWin ? 'The deck bends to your will...' : 'The cards scatter like ash...' 
            });

        await interaction.editReply({
            embeds: [resultEmbed],
            components: []
        });
    });
}

function getRandomGlitchMessage(): string {
    return SANITY_EFFECTS.glitchMessages[
        Math.floor(Math.random() * SANITY_EFFECTS.glitchMessages.length)
    ];
}

function addGlitches(text: string): string {
    const glitches = ['̷', '̶', '̸', '̵', '̴'];
    return text.split('').map(char => 
        Math.random() < 0.15 ? char + glitches[Math.floor(Math.random() * glitches.length)] : char
    ).join('');
}