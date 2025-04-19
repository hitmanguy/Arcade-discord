// src/commands/register.ts
import { RegisterType, SlashCommand } from '../../../handler';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
  ComponentType,
  ColorResolvable,
  ButtonInteraction
} from 'discord.js';
import { setTimeout as sleep } from 'node:timers/promises';
import { UserService } from '../../../services/user_services';
import { PRISON_COLORS, STARTER_ITEMS } from '../../../constants/GAME_CONSTANTS';

export default new SlashCommand({
  registerType: RegisterType.Guild,

  data: new SlashCommandBuilder()
    .setName('register')
    .setDescription('Register as an inmate in the Infinite Prison')
    .addStringOption(option => 
      option
        .setName('crime')
        .setDescription('What crime brings you to Infinite Prison? (Optional)')
        .setRequired(false)
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: false });
    
    const member = interaction.member;
    if (!member) {
      await interaction.editReply({ content: '❌ Failed to get member information.' });
      return;
    }
    
    // Check if user is already registered
    const userId = interaction.user.id;
    const existingUser = await UserService.getUserData(userId);
    
    if (existingUser) {
      await interaction.editReply({
        content: `⚠️ You are already registered as inmate #${userId.slice(-6)}!`
      });
      return;
    }
    
    // Create loading animation
    const loadingEmbed = new EmbedBuilder()
      .setColor(PRISON_COLORS.primary as ColorResolvable)
      .setTitle('🔄 Processing New Inmate...')
      .setDescription('```\nScanning biometric data...\n```');
    
    await interaction.editReply({ embeds: [loadingEmbed] });
    
    // Simulate processing
    for (let i = 0; i < 3; i++) {
      await sleep(800);
      await interaction.editReply({
        embeds: [
          loadingEmbed.setDescription(`\`\`\`\nInitializing prisoner profile${'.'.repeat(i+1)}\n\`\`\``)
        ]
      });
    }
    
    // Get optional crime reason
    const crime = interaction.options.getString('crime') || "Unknown crimes against humanity";
    
    // Create new user with starter items
    const newUser = await UserService.createNewUser(userId, interaction.user.username);
    
    if (!newUser) {
      await interaction.editReply({ content: '❌ Failed to register you in the system. Please try again later.' });
      return;
    }
    
    // Add starter items to inventory
    for (const item of STARTER_ITEMS) {
      await UserService.addToInventory(userId, item.itemId, item.name, item.quantity);
    }
    
    // Create welcome embed
    const welcomeEmbed = new EmbedBuilder()
      .setColor(PRISON_COLORS.danger as ColorResolvable)
      .setTitle(`🔒 WELCOME TO INFINITE PRISON - INMATE #${userId.slice(-6)}`)
      .setDescription(`*"${crime}"*\n\nYour sentence begins today. There is no escape from the Infinite Prison.`)
      .setThumbnail(interaction.user.displayAvatarURL())
      .addFields(
        { 
          name: '📜 Prison Rules', 
          value: '1. Obey all guard instructions\n2. No escape attempts\n3. Daily check-ins required\n4. No contraband items\n5. Maintain acceptable sanity levels' 
        },
        { 
          name: '🎮 How To Play', 
          value: 'The Infinite Prison is a daily survival game. Complete activities, earn merit points, and try to maintain your sanity while avoiding suspicion. Use `/profile` to check your status and `/activities` to see available actions.' 
        },
        { 
          name: '⚠️ Warning', 
          value: 'Your actions have consequences. High suspicion levels will result in isolation. Low sanity may lead to hallucinations or worse.' 
        }
      )
      .setFooter({ text: `Incarceration Date: ${new Date().toLocaleDateString()}` });
    
    // Create action buttons
    const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('register:tutorial')
        .setLabel('📖 View Tutorial')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('register:profile')
        .setLabel('👤 View Profile')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('register:activities')
        .setLabel('🎯 Available Activities')
        .setStyle(ButtonStyle.Success)
    );
    
    await interaction.editReply({
      content: `<@${userId}> has been processed and admitted to the Infinite Prison.`,
      embeds: [welcomeEmbed],
      components: [buttonRow]
    });
    
    // Set up collector for button interactions
    const collector = interaction.channel?.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: (i) => i.user.id === interaction.user.id && i.customId.startsWith('register:'),
      time: 300000 // 5 minutes
    });
    
    collector?.on('collect', async (i: ButtonInteraction) => {
      const action = i.customId.split(':')[1];
      
      switch (action) {
        case 'tutorial':
          await showTutorial(i);
          break;
        case 'profile':
          await i.reply({ content: 'Use the `/profile view` command to see your full profile!', ephemeral: true });
          break;
        case 'activities':
          await showActivities(i);
          break;
      }
    });
  },
});

async function showTutorial(interaction: ButtonInteraction) {
  const tutorialEmbed = new EmbedBuilder()
    .setColor(PRISON_COLORS.info as ColorResolvable)
    .setTitle('📖 INFINITE PRISON - TUTORIAL')
    .setDescription('Welcome to your new home. Here\'s how to survive in the Infinite Prison.')
    .addFields(
      { 
        name: '📊 Core Stats', 
        value: '• **Survival Days**: How long you\'ve lasted\n• **Sanity**: Mental health (0-100)\n• **Merit Points**: Currency for purchases\n• **Suspicion Level**: How closely guards watch you' 
      },
      { 
        name: '🗓️ Daily Routine', 
        value: '1. Check in daily with `/daily`\n2. Complete activities to earn merit points\n3. Manage your sanity carefully\n4. Explore new areas of the prison\n5. Trade with other inmates' 
      },
      { 
        name: '⚙️ Game Mechanics', 
        value: '• Missing check-ins lowers sanity\n• Some activities increase suspicion\n• High suspicion may lead to isolation\n• Collect items to help your survival\n• Form alliances with other inmates' 
      },
      { 
        name: '🏆 How To Win', 
        value: 'Survive long enough, and you might discover the secrets of the Infinite Prison. Or perhaps... a way to escape?' 
      }
    )
    .setFooter({ text: 'Remember: The walls have eyes. Your choices matter.' });
  
  const backButton = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('tutorial:back')
      .setLabel('⬅️ Back')
      .setStyle(ButtonStyle.Secondary)
  );
  
  await interaction.update({
    embeds: [tutorialEmbed],
    components: [backButton]
  });
  
  // Set up collector for the back button
  const collector = interaction.channel?.createMessageComponentCollector({
    componentType: ComponentType.Button,
    filter: (i) => i.user.id === interaction.user.id && i.customId === 'tutorial:back',
    time: 60000
  });
  
  collector?.on('collect', async (i: ButtonInteraction) => {
    // Recreate the original welcome message buttons
    const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('register:tutorial')
        .setLabel('📖 View Tutorial')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('register:profile')
        .setLabel('👤 View Profile')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('register:activities')
        .setLabel('🎯 Available Activities')
        .setStyle(ButtonStyle.Success)
    );
    
    await i.update({ components: [buttonRow] });
  });
}

async function showActivities(interaction: ButtonInteraction) {
  const activitiesEmbed = new EmbedBuilder()
    .setColor(PRISON_COLORS.success as ColorResolvable)
    .setTitle('🎯 AVAILABLE ACTIVITIES')
    .setDescription('These commands are available to you in the Infinite Prison:')
    .addFields(
      { 
        name: '📋 Basic Commands', 
        value: '`/profile view` - View your inmate profile\n`/profile customize` - Customize your profile\n`/daily` - Daily check-in for rewards\n`/inventory` - Manage your items' 
      },
      { 
        name: '🏃‍♂️ Activities', 
        value: '`/work` - Complete tasks for merit points\n`/explore` - Discover new prison areas\n`/trade` - Exchange items with other inmates\n`/game` - Play mini-games for rewards' 
      },
      { 
        name: '🔍 Special Actions', 
        value: '`/craft` - Create useful items\n`/socialize` - Interact with other inmates\n`/investigate` - Research prison mysteries\n`/experiment` - Test strange phenomena' 
      }
    )
    .setFooter({ text: 'New activities unlock as you progress and explore more of the prison' });
  
  const backButton = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('activities:back')
      .setLabel('⬅️ Back')
      .setStyle(ButtonStyle.Secondary)
  );
  
  await interaction.update({
    embeds: [activitiesEmbed],
    components: [backButton]
  });
  
  // Set up collector for the back button
  const collector = interaction.channel?.createMessageComponentCollector({
    componentType: ComponentType.Button,
    filter: (i) => i.user.id === interaction.user.id && i.customId === 'activities:back',
    time: 60000
  });
  
  collector?.on('collect', async (i: ButtonInteraction) => {
    // Recreate the original welcome message buttons
    const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('register:tutorial')
        .setLabel('📖 View Tutorial')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('register:profile')
        .setLabel('👤 View Profile')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('register:activities')
        .setLabel('🎯 Available Activities')
        .setStyle(ButtonStyle.Success)
    );
    
    await i.update({ components: [buttonRow] });
  });
}