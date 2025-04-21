// src/commands/register.ts
import { RegisterType, SlashCommand } from '../../../handler';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ChatInputCommandInteraction,
  MessageFlags,
  EmbedBuilder,
  SlashCommandBuilder,
  ComponentType,
  ColorResolvable,
  ButtonInteraction,
  AttachmentBuilder
} from 'discord.js';
import { setTimeout as sleep } from 'node:timers/promises';
import { promises as fs } from 'fs';
import { UserService } from '../../../services/user_services';
import { PRISON_COLORS, STARTER_ITEMS } from '../../../constants/GAME_CONSTANTS';
import { Device } from '../../../model/Device_schema';
import { join } from 'path';
const welcomeGifPath = join(__dirname, '..', '..', '..', '..', 'gif', 'welcome.gif');

async function getWelcomeAttachment(): Promise<AttachmentBuilder | null> {
  try {
    // Check if file exists before creating attachment
    await fs.access(welcomeGifPath);
    return new AttachmentBuilder(welcomeGifPath, { name: 'welcome.gif' });
  } catch (error) {
    console.error('Welcome GIF not found:', error);
    console.error('Attempted path:', welcomeGifPath);
    return null;
  }
}

export default new SlashCommand({
  registerType: RegisterType.Global,

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
    try {
      await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
    } catch (error) {
      console.error('Failed to defer reply:', error);
      return;
    }
    
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
    
    const loadingEmbed = new EmbedBuilder()
      .setColor(PRISON_COLORS.primary as ColorResolvable)
      .setTitle('🔄 Processing New Inmate...')
      .setDescription('```\nScanning biometric data...\n```');
    
    await interaction.editReply({ embeds: [loadingEmbed] });
    for (let i = 0; i < 3; i++) {
      await sleep(800);
      await interaction.editReply({
        embeds: [
          loadingEmbed.setDescription(`\`\`\`\nInitializing prisoner profile${'.'.repeat(i+1)}\n\`\`\``)
        ]
      });
    }
    
    const crime = interaction.options.getString('crime') || "Unknown crimes against humanity";
    const newUser = await UserService.createNewUser(userId, interaction.user.username);
    
    if (!newUser) {
      await interaction.editReply({ content: '❌ Failed to register you in the system. Please try again later.' });
      return;
    }
    
    for (const item of STARTER_ITEMS) {
      await UserService.addToInventory(userId, item.itemId, item.name, item.quantity);
    }
    const welcomeGifAttachment = await getWelcomeAttachment();

    
    const welcomeEmbed = new EmbedBuilder()
      .setColor(PRISON_COLORS.danger as ColorResolvable)
      .setTitle(`🔒 WELCOME TO INFINITE PRISON - INMATE #${userId.slice(-6)}`)
      .setDescription(`*"${crime}"*\n\nYour sentence begins today. There is no escape from the Infinite Prison.`)
      .setImage('attachment://welcome.gif') // Reference the attachment
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
      ...(welcomeGifAttachment ? { files: [welcomeGifAttachment] } : {}), // Conditionally include files
      components: [buttonRow]
    });
    
    const collector = interaction.channel?.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: (i) => i.user.id === interaction.user.id && i.customId.startsWith('register:'),
      time: 300000 
    });

    if (!collector) {
      console.error('Failed to create collector');
      return;
    }

    collector.on('collect', async (i: ButtonInteraction) => {
      try {
        const action = i.customId.split(':')[1];
        
        switch (action) {
          case 'tutorial':
            await showTutorial(i).catch(error => {
              console.error('Tutorial error:', error);
              safeReply(i, '❌ Failed to show tutorial. Please try again.');
            });
            break;
          case 'profile':
            await safeReply(i, 'Use the `/profile view` command to see your full profile!', true);
            break;
          case 'activities':
            await showActivities(i).catch(error => {
              console.error('Activities error:', error);
              safeReply(i, '❌ Failed to show activities. Please try again.');
            });
            break;
        }
      } catch (error) {
        console.error('Collector error:', error);
        safeReply(i, '❌ Something went wrong. Please try again.');
      }
    });

    collector.on('end', async () => {
      try {
        const message = await interaction.fetchReply();
        if (message) {
          await interaction.editReply({ components: [] });
        }
      } catch (error) {
        console.error('Failed to cleanup components:', error);
      }
    });

    await sleep(60000);

    try {
      const updatedDevice = await Device.findOneAndUpdate(
        { discordId: userId },
        {
          $set: { activated: true },
          $push: {
            messages: {
              sender: '???',
              content: 'You feel a cold object in your hand. A hidden device? Use `/device` to access it. Trust no one.',
              sentAt: new Date(),
              read: false
            }
          }
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true 
        }
      );
    
      if (!updatedDevice) {
        throw new Error('Failed to create or update device');
      }
    
    } catch (error) {
      console.error('Error managing device:', error);
      throw error; 
    }
    
    const mysteriousEmbed = new EmbedBuilder()
      .setColor('#6f42c1')
      .setTitle('A Mysterious Device...')
      .setDescription('A cryptic message appears on a hidden screen:\n\n*You have been chosen. Use `/device` to connect. Beware the eyes in the dark...*')
      .setFooter({ text: 'The device vibrates softly in your palm.' });
    
    await interaction.followUp({ embeds: [mysteriousEmbed], flags: [MessageFlags.Ephemeral] }); 
    newUser.deviceActivated = true; 
    await newUser.save();
    await sleep(2000);
  },
});

async function createWelcomeEmbed(userId: string, crime: string, userAvatar: string) {
  return new EmbedBuilder()
    .setColor(PRISON_COLORS.danger as ColorResolvable)
    .setTitle(`🔒 WELCOME TO INFINITE PRISON - INMATE #${userId.slice(-6)}`)
    .setDescription(`*"${crime}"*\n\nYour sentence begins today. There is no escape from the Infinite Prison.`)
    .setImage('attachment://welcome.gif')
    .setThumbnail(userAvatar)
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
}

async function showTutorial(interaction: ButtonInteraction) {
  try {
    const tutorialEmbed = new EmbedBuilder()
    .setColor(PRISON_COLORS.info as ColorResolvable)
    .setTitle('📖 HOW TO SURVIVE IN THE INFINITE PRISON')
    .setDescription(
      'Survival in the Infinite Prison is a daily challenge. To make it, you must:\n\n' +
      '• **Play Escape Games:** Use `/puzzle`, `/tunnel`, `/uno`, `/matching`, and `/number-game` to progress your escape and unlock new areas.\n' +
      '• **Manage Your Stats:** Keep your **Sanity** high, **Suspicion** low, and earn **Merit Points** to buy items from the `/shop`.\n' +
      '• **Use Your Device:** Soon, you\'ll receive a `/device` to communicate with other inmates and uncover secrets.\n' +
      '• **Balance Your Routine:** Daily check-ins, activities, and smart choices are key. High suspicion leads to isolation. Low sanity brings hallucinations. Merit points are your lifeline.\n\n' +
      'Explore, strategize, and survive. Only the cleverest inmates will discover the secrets of the Infinite Prison.'
    )
    .addFields(
      { 
        name: '🏪 Shop & Items', 
        value: 'Use `/shop` to buy items that help you survive. Manage your inventory.'
      },
      { 
        name: '📊 Core Stats', 
        value: '• **Survival Days**: How long you\'ve lasted\n• **Sanity**: Mental health (0-100)\n• **Merit Points**: Currency for purchases\n• **Suspicion Level**: How closely guards watch you'
      }
    )
    .setFooter({ text: 'Remember: The walls have eyes. Your choices matter.' });
    
    const backButton = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('tutorial:back')
        .setLabel('⬅️ Back')
        .setStyle(ButtonStyle.Secondary)
    );
    
    await safeUpdate(interaction, {
      embeds: [tutorialEmbed],
      components: [backButton]
    });
    
    const collector = interaction.channel?.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: (i) => i.user.id === interaction.user.id && i.customId === 'tutorial:back',
      time: 60000
    });
    
    if (!collector) {
      throw new Error('Failed to create back collector');
    }

    collector?.on('collect', async (i: ButtonInteraction) => {
      try {
        await i.deferUpdate();
        
        const welcomeGifAttachment = await getWelcomeAttachment();

            
        const welcomeEmbed = await createWelcomeEmbed(
          interaction.user.id,
          interaction.message.embeds[0].description?.split('"')[1] || "Unknown crimes against humanity",
          interaction.user.displayAvatarURL()
        );
        
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
        
        await i.editReply({
          content: `<@${interaction.user.id}> has been processed and admitted to the Infinite Prison.`,
          embeds: [welcomeEmbed],
          ...(welcomeGifAttachment ? { files: [welcomeGifAttachment] } : {}), // Conditionally include files
          components: [buttonRow]
        });
      } catch (error) {
        console.error('Back button error:', error);
        safeReply(i, '❌ Failed to go back. Please try again.');
      }
    });
    
    collector?.on('end', async () => {
      try {
        if (interaction.message.deletable) {
          await interaction.editReply({ components: [] });
        }
      } catch (error) {
        console.error('Failed to cleanup tutorial:', error);
      }
    });
  } catch (error) {
    console.error('Tutorial function error:', error);
    throw error; 
  }
}

async function showActivities(interaction: ButtonInteraction) {
  try {
    const activitiesEmbed = new EmbedBuilder()
    .setColor(PRISON_COLORS.success as ColorResolvable)
    .setTitle('🎯 AVAILABLE ACTIVITIES')
    .setDescription('Commands and features you can use in the Infinite Prison:')
    .addFields(
      { 
        name: '📋 Basic Commands', 
        value: '`/profile view` - View your inmate profile\n`/profile customize` - Customize your profile (soon upcoming)\n`/shop` - Buy useful items'
      },
      { 
        name: '📱 Device', 
        value: '`/device` *(provided to you soon)* - Access your mysterious prison device. Use it to talk to other inmates and uncover secrets.'
      },
      { 
        name: '🕹️ Escape Games', 
        value: '`/puzzle`, `/tunnel`, `/uno`, `/matching`, `/number-game` - Play games to progress your escape attempts and survive the prison.'
      }
    )
    .setFooter({ text: 'New activities unlock as you progress and explore more of the prison.' });

    const backButton = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('activities:back')
        .setLabel('⬅️ Back')
        .setStyle(ButtonStyle.Secondary)
    );

    await safeUpdate(interaction, {
      embeds: [activitiesEmbed],
      components: [backButton]
    });
    
    const collector = interaction.channel?.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: (i) => i.user.id === interaction.user.id && i.customId === 'activities:back',
      time: 60000
    });
    
    if (!collector) {
      throw new Error('Failed to create back collector');
    }

    collector?.on('collect', async (i: ButtonInteraction) => {
      try {
        await i.deferUpdate();
        

        const welcomeGifAttachment = await getWelcomeAttachment();

            
        const welcomeEmbed = await createWelcomeEmbed(
          interaction.user.id,
          interaction.message.embeds[0].description?.split('"')[1] || "Unknown crimes against humanity",
          interaction.user.displayAvatarURL()
        );
        
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
        
        await i.editReply({
          content: `<@${interaction.user.id}> has been processed and admitted to the Infinite Prison.`,
          embeds: [welcomeEmbed],
          ...(welcomeGifAttachment ? { files: [welcomeGifAttachment] } : {}), // Conditionally include files
          components: [buttonRow]
        });
      } catch (error) {
        console.error('Back button error:', error);
        safeReply(i, '❌ Failed to go back. Please try again.');
      }
    });
    
    collector?.on('end', async () => {
      try {
        if (!interaction.message.deletable) {
          await interaction.editReply({ components: [] });
        }
      } catch (error) {
        console.error('Failed to cleanup activities:', error);
      }
    });
  } catch (error) {
    console.error('Activities function error:', error);
    throw error; 
  }
}

async function safeReply(i: ButtonInteraction, content: string, ephemeral = true) {
  try {
    if (i.replied || i.deferred) {
      await i.editReply({ content });
    } else {
      await i.reply({ content, ephemeral });
    }
  } catch (error) {
    console.error('Safe reply failed:', error);
  }
}

async function safeUpdate(i: ButtonInteraction, data: any) {
  try {
    await i.update(data);
  } catch (error) {
    console.error('Safe update failed:', error);
    try {
      await i.followUp({ content: '❌ Failed to update message. Please try again.', ephemeral: true });
    } catch (innerError) {
      console.error('Follow-up failed:', innerError);
    }
  }
}