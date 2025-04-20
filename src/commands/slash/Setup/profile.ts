// src/commands/profile.ts
import { RegisterType, SlashCommand } from '../../../handler';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ComponentType,
  ColorResolvable,
  GuildMember,
  ButtonInteraction,
  MessageFlags
} from 'discord.js';
import { setTimeout as sleep } from 'node:timers/promises';
import { UserService } from '../../../services/user_services';
import { PRISON_COLORS, createProgressBar } from '../../../constants/GAME_CONSTANTS';
import { UserDocument } from '../../../model/user_status';

export default new SlashCommand({
  registerType: RegisterType.Guild,

  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('View and manage your Infinite Prison profile')
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('View your prison profile')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('User to view (defaults to yourself)')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('stats')
        .setDescription('View detailed stats about your prison life')
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {

    const targetUser = interaction.options.getUser('user') || interaction.user;
    const member = interaction.guild?.members.cache.get(targetUser.id);
    const subcommand = interaction.options.getSubcommand();
    
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
    
    // Get or create user in database
    let userData = await UserService.getUserData(targetUser.id, member);
    
    if (!userData) {
      const notRegisteredEmbed = new EmbedBuilder()
        .setColor(PRISON_COLORS.warning as ColorResolvable)
        .setTitle('❌ Not Registered')
        .setDescription('You haven\'t registered to the Infinite Prison yet.')
        .addFields({
          name: 'How to Register',
          value: 'Use `/register` to begin your sentence in the Infinite Prison.'
        });
      
      await interaction.editReply({ embeds: [notRegisteredEmbed] });
      return;
    }
    
    if (subcommand === 'view') {
      await showProfile(interaction, userData, member);
    }  else if (subcommand === 'stats') {
      await showDetailedStats(interaction, userData);
    }
  },
});

async function showProfile(interaction: ChatInputCommandInteraction, userData: UserDocument, member?: GuildMember | null) {
  const loadingEmbed = new EmbedBuilder()
    .setColor(PRISON_COLORS.primary as ColorResolvable)
    .setTitle('🔄 Accessing Infinite Prison Database...')
    .setDescription('```\nConnecting to secure prison records...\n```');
  
  await interaction.editReply({ embeds: [loadingEmbed] });
  
  for (let i = 0; i < 3; i++) {
    await sleep(800);
    await interaction.editReply({
      embeds: [
        loadingEmbed.setDescription(`\`\`\`\nAccessing inmate #${userData.discordId.slice(-6)}${'.'.repeat(i+1)}\n\`\`\``)
      ]
    });
  }
  
  const profileEmbed = new EmbedBuilder()
    .setColor(PRISON_COLORS.accent as ColorResolvable)
    .setTitle(`🔒 INFINITE PRISON - INMATE #${userData.discordId.slice(-6)}`)
    .setThumbnail(member?.user.displayAvatarURL({ extension: 'png' }) || null)
    .addFields(
      { name: '👤 Identity', value: `**Name:** ${userData.username}\n**Cell:** A-01\n**Role:** Inmate`, inline: true },
      { name: '📊 Status', value: `**Days Survived:** ${userData.survivalDays}\n**Sanity:** ${userData.sanity}/100\n**Merit Points:** ${userData.meritPoints}`, inline: true },
      { name: '⚠️ Security', value: `**Suspicion Level:** ${userData.suspiciousLevel}/100\n**Isolation:** ${userData.isInIsolation ? 'Yes' : 'No'}`, inline: true },
      { name: '🏆 Achievements', value: userData.achievements.length > 0 ? userData.achievements.join(', ') : 'None yet', inline: false }
    )
    .setFooter({ text: `Incarcerated since: ${new Date(userData.joinedAt).toLocaleDateString()}` });
  
  // Create interactive buttons
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('profile:inventory')
      .setLabel('🎒 Inventory')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('profile:stats')
      .setLabel('📊 Statistics')
      .setStyle(ButtonStyle.Primary),
  );

  await interaction.editReply({
    embeds: [profileEmbed],
    components: [row]
  });
  
  // Set timeout duration to 60 seconds
  const timeoutDuration = 60000;
  
  const collector = interaction.channel?.createMessageComponentCollector({
    componentType: ComponentType.Button,
    filter: (i) => i.user.id === interaction.user.id && i.customId.startsWith('profile:'),
    time: timeoutDuration
  });
  
  collector?.on('collect', async (i: ButtonInteraction) => {
    const action = i.customId.split(':')[1];
    
    switch (action) {
      case 'inventory':
        await showInventory(i, userData);
        break;
      case 'stats':
        await showStats(i, userData);
        break;
      case 'back':
        await i.update({
          embeds: [profileEmbed],
          components: [row]
        });
        break;
    }
  });
  
  collector?.on('end', () => {
    const timeoutEmbed = new EmbedBuilder()
      .setColor(PRISON_COLORS.primary as ColorResolvable)
      .setTitle(`🔒 INFINITE PRISON - INMATE #${userData.discordId.slice(-6)}`)
      .setDescription('**Session timed out**\nThe terminal has automatically logged out due to inactivity.')
      .setFooter({ text: 'Use the /profile command again to access your data' });
    
    interaction.editReply({ 
      embeds: [timeoutEmbed], 
      components: [] 
    }).catch(() => {});
  });
}

async function showInventory(interaction: ButtonInteraction, userData: UserDocument) {
  const items = UserService.getFormattedInventory(userData);
  
  const inventoryEmbed = new EmbedBuilder()
    .setColor(PRISON_COLORS.info as ColorResolvable)
    .setTitle('🎒 Inmate Inventory')
    .setDescription(items.length > 0 ? items.join('\n') : 'Your inventory is empty')
    .setFooter({ text: 'Contraband items will lead to infractions if discovered during cell inspections' });
  
  const backButton = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('profile:back')
      .setLabel('⬅️ Back to Profile')
      .setStyle(ButtonStyle.Secondary)
  );
  
  // Update with current components - the collector from the parent function handles the timeout
  await interaction.update({
    embeds: [inventoryEmbed],
    components: [backButton]
  });
}

async function showStats(interaction: ButtonInteraction, userData: UserDocument) {
  const statsEmbed = new EmbedBuilder()
    .setColor(PRISON_COLORS.warning as ColorResolvable)
    .setTitle('📊 Inmate Statistics')
    .addFields(
      { name: '🎮 Game History', value: `Games Played: ${userData.totalGamesPlayed}\nGames Won: ${userData.totalGamesWon}\nCurrent Streak: ${userData.currentStreak}` },
      { name: '🏆 Last Game', value: userData.lastGame?.type ? `Type: ${userData.lastGame.type}\nResult: ${userData.lastGame.result}\nPlayed: ${new Date(userData.lastGame.playedAt).toLocaleDateString()}` : 'No games played yet' }
    )
    .setFooter({ text: 'Your performance is continuously monitored by prison authorities' });
  
  const backButton = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('profile:back')
      .setLabel('⬅️ Back to Profile')
      .setStyle(ButtonStyle.Secondary)
  );
  
  // Update with current components - the collector from the parent function handles the timeout
  await interaction.update({
    embeds: [statsEmbed],
    components: [backButton]
  });
}


async function showDetailedStats(interaction: ChatInputCommandInteraction, userData: UserDocument) {
  const loadingEmbed = new EmbedBuilder()
    .setColor(PRISON_COLORS.primary as ColorResolvable)
    .setTitle('🔄 Retrieving Behavioral Records...')
    .setDescription('```\nAnalyzing inmate performance metrics...\n```');
  
  await interaction.editReply({ embeds: [loadingEmbed] });
  await sleep(1500);
  
  const sanityBar = createProgressBar(userData.sanity, 100);
  const suspicionBar = createProgressBar(userData.suspiciousLevel, 100);
  
  const statsEmbed = new EmbedBuilder()
    .setColor(PRISON_COLORS.info as ColorResolvable)
    .setTitle(`📊 INMATE STATISTICS - #${userData.discordId.slice(-6)}`)
    .setDescription(`Comprehensive analysis of ${userData.username}'s prison record`)
    .addFields(
      { name: '🧠 Sanity', value: `${sanityBar} ${userData.sanity}/100`, inline: false },
      { name: '⚠️ Suspicion Level', value: `${suspicionBar} ${userData.suspiciousLevel}/100`, inline: false },
      { name: '📈 Activity Stats', value: `Games Played: ${userData.totalGamesPlayed}\nGames Won: ${userData.totalGamesWon}\nWin Rate: ${userData.totalGamesPlayed ? Math.round((userData.totalGamesWon / userData.totalGamesPlayed) * 100) : 0}%\nCurrent Streak: ${userData.currentStreak}`, inline: false },
      { name: '🏆 Achievements', value: userData.achievements.length > 0 ? userData.achievements.join('\n') : 'No achievements unlocked yet', inline: false }
    )
    .setFooter({ text: 'Performance is continuously monitored by prison authorities' });
  
  const actionsRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('stats:inventory')
      .setLabel('🎒 Inventory')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('stats:back')
      .setLabel('⬅️ Back')
      .setStyle(ButtonStyle.Secondary)
  );
  
  await interaction.editReply({
    embeds: [statsEmbed],
    components: [actionsRow]
  });
  
  // Set timeout duration to 60 seconds
  const timeoutDuration = 60000;
  
  const collector = interaction.channel?.createMessageComponentCollector({
    componentType: ComponentType.Button,
    filter: (i) => i.user.id === interaction.user.id && i.customId.startsWith('stats:'),
    time: timeoutDuration
  });
  
  collector?.on('collect', async (i: ButtonInteraction) => {
    const action = i.customId.split(':')[1];
    
    if (action === 'back') {
      await showProfile(interaction, userData, interaction.guild?.members.cache.get(userData.discordId));
    } else if (action === 'inventory') {
      await showInventory(i, userData);
    } 
  });
  
  collector?.on('end', () => {
    const timeoutEmbed = new EmbedBuilder()
      .setColor(PRISON_COLORS.primary as ColorResolvable)
      .setTitle(`📊 INMATE STATISTICS - #${userData.discordId.slice(-6)}`)
      .setDescription('**Session timed out**\nStatistics terminal has been locked due to inactivity.')
      .setFooter({ text: 'Use the /profile stats command again to view your data' });
    
    interaction.editReply({ 
      embeds: [timeoutEmbed], 
      components: [] 
    }).catch(() => {});
  });
}