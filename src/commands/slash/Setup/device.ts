import { RegisterType, SlashCommand } from '../../../handler';
import {
  SlashCommandBuilder,
  EmbedBuilder,
  ChatInputCommandInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  ComponentType,
  ButtonInteraction,
  MessageCollector
} from 'discord.js';
import { Device } from '../../../model/Device_schema';
import { CharacterAI } from "node_characterai";

const CONTACTS = [
 // { id: 'warden', name: 'Mysterious Warden', emoji: '🕴️' },
  { id: 'inmate', name: 'Unknown Inmate', emoji: '🧑‍🦲',character_id: '6mjczLKtizpMFcnKUmo4Vf0_LvS3lLl6xmuThQy9SQc' },
 // { id: 'soul', name: 'AI of yourself', emoji: '🤖' }
];

export default new SlashCommand({
  registerType: RegisterType.Guild,

  data: new SlashCommandBuilder()
    .setName('device')
    .setDescription('Access your mysterious prison device'),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const device = await Device.findOne({ discordId: interaction.user.id });

    if (!device || !device.activated) {
      await interaction.reply({
        content: 'You fumble in your pockets... but find nothing. (Register to receive your device!)',
        ephemeral: true
      });
      return;
    }

    // 1. Show contact selection menu
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('device:select_contact')
      .setPlaceholder('Select a contact to message...')
      .addOptions(
        CONTACTS.map(c => ({
          label: c.name,
          value: c.id,
          emoji: c.emoji
        }))
      );

    const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

    const embed = new EmbedBuilder()
      .setColor('#6f42c1')
      .setTitle('📱 Prison Device Interface')
      .setDescription('Who do you want to contact?')
      .setFooter({ text: 'Select a contact to start chatting.' });

    await interaction.reply({
      embeds: [embed],
      components: [selectRow],
      ephemeral: true
    });

    // 2. Wait for contact selection
    const selectInteraction = await interaction.channel?.awaitMessageComponent({
      componentType: ComponentType.StringSelect,
      filter: i => i.user.id === interaction.user.id && i.customId === 'device:select_contact',
      time: 30000
    }).catch(() => null) as StringSelectMenuInteraction | null;

    if (!selectInteraction) {
      await interaction.editReply({
        content: '⏳ Device timed out.',
        embeds: [],
        components: []
      });
      return;
    }

    const selectedContact = CONTACTS.find(c => c.id === selectInteraction.values[0]);
    if (!selectedContact) return;

    // 3. Enter chat mode
    const chatEmbed = new EmbedBuilder()
      .setColor('#232946')
      .setTitle(`💬 Chatting with ${selectedContact.emoji} ${selectedContact.name}`)
      .setDescription('Type your message below. Click "End Chat" to finish.')
      .setFooter({ text: 'Your messages are encrypted... probably.' });

    const endChatButton = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('device:end_chat')
        .setLabel('❌ End Chat')
        .setStyle(ButtonStyle.Danger)
    );

    await selectInteraction.update({
      embeds: [chatEmbed],
      components: [endChatButton]
    });

    // 4. Collect messages from user
    const filter = (m: any) => m.author.id === interaction.user.id;
    const collector = interaction.channel
      ? new MessageCollector(interaction.channel, { filter, time: 60000 })
      : undefined;

    collector?.on('collect', async (msg) => {
      // Echo message in chat (simulate reply)
      const characterAI = new CharacterAI();
      characterAI.authenticate(process.env.CHARACTER_TOKEN!).then(async() => {
        console.log("Logged in");
        const character = characterAI.fetchCharacter(selectedContact.character_id);
        console.log((await character).description);
        let dms;
        let response;
        if (!device.conversation_id||device.conversation_id=='null') {
          dms = (await character).createDM();
          device.conversation_id = (await dms).chatId;
          await device.save();
          response = (await dms).sendMessage(`${msg.author.username}-${msg.content}`);
        }else{
          dms = await (await character).DM(device.conversation_id);
          const last = dms.getLastMessage();
          if (last) {
            msg.reply((await last).content);
            console.log((await last).content);
          }
          console.log(dms.messages.values());
          response = (await dms).sendMessage(`${msg.author.username}-${msg.content}`);
        }
        console.log((await response).content);
        if ('sendTyping' in msg.channel && typeof msg.channel.sendTyping === 'function') {
          await msg.channel.sendTyping();
        }
        msg.reply((await response).content);
      })
      // await msg.reply({
      //   content: `*${selectedContact.name} is typing...*`,
      //   allowedMentions: { repliedUser: false }
      // });
    });

    // 5. End chat on button press
    const buttonCollector = interaction.channel?.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: i => i.user.id === interaction.user.id && i.customId === 'device:end_chat',
      time: 60000
    });

    buttonCollector?.on('collect', async (i: ButtonInteraction) => {
      collector?.stop();
      await i.update({
        embeds: [
          new EmbedBuilder()
            .setColor('#232946')
            .setTitle('📱 Device Disconnected')
            .setDescription('You put the device away. The screen fades to black.')
        ],
        components: []
      });
    });

    collector?.on('end', async () => {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor('#232946')
            .setTitle('📱 Device Disconnected')
            .setDescription('You put the device away. The screen fades to black.')
        ],
        components: []
      });
    });
  }
});