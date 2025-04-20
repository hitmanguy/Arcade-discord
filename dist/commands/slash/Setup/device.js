"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const handler_1 = require("../../../handler");
const discord_js_1 = require("discord.js");
const Device_schema_1 = require("../../../model/Device_schema");
const node_characterai_1 = require("node_characterai");
const path_1 = require("path");
const CONTACTS = [
    { id: 'inmate', name: 'Unknown Inmate', emoji: '🧑‍🦲', character_id: '6mjczLKtizpMFcnKUmo4Vf0_LvS3lLl6xmuThQy9SQc' },
];
function getLastBotMessageContent(messages) {
    const arr = Array.isArray(messages) ? messages : Object.values(messages);
    const botMessages = arr.filter(m => m.isHuman === false && m.content);
    if (botMessages.length === 0)
        return null;
    return botMessages[botMessages.length - 1].content;
}
exports.default = new handler_1.SlashCommand({
    registerType: handler_1.RegisterType.Guild,
    data: new discord_js_1.SlashCommandBuilder()
        .setName('device')
        .setDescription('Access your mysterious prison device'),
    async execute(interaction) {
        let bot_type = true;
        const device = await Device_schema_1.Device.findOne({ discordId: interaction.user.id });
        if (!device || !device.activated) {
            await interaction.reply({
                content: 'You fumble in your pockets... but find nothing. (Register to receive your device!)',
                flags: [discord_js_1.MessageFlags.Ephemeral]
            });
            return;
        }
        const deviceGifPath = (0, path_1.join)(__dirname, '../../../Gifs/device.gif');
        const deviceGifAttachment = new discord_js_1.AttachmentBuilder(deviceGifPath, { name: 'Device.gif' });
        const selectMenu = new discord_js_1.StringSelectMenuBuilder()
            .setCustomId('device:select_contact')
            .setPlaceholder('Select a contact to message...')
            .addOptions(CONTACTS.map(c => ({
            label: c.name,
            value: c.id,
            emoji: c.emoji
        })));
        const selectRow = new discord_js_1.ActionRowBuilder().addComponents(selectMenu);
        const embed = new discord_js_1.EmbedBuilder()
            .setColor('#6f42c1')
            .setTitle('📱 Prison Device Interface')
            .setImage('attachment://Device.gif')
            .setDescription('Who do you want to contact?')
            .setFooter({ text: 'Select a contact to start chatting.' });
        await interaction.reply({
            embeds: [embed],
            components: [selectRow],
            files: [deviceGifAttachment],
            flags: [discord_js_1.MessageFlags.Ephemeral]
        });
        const selectInteraction = await interaction.channel?.awaitMessageComponent({
            componentType: discord_js_1.ComponentType.StringSelect,
            filter: i => i.user.id === interaction.user.id && i.customId === 'device:select_contact',
            time: 30000
        }).catch(() => null);
        if (!selectInteraction) {
            await interaction.editReply({
                content: '⏳ Device timed out.',
                embeds: [],
                components: []
            });
            return;
        }
        const selectedContact = CONTACTS.find(c => c.id === selectInteraction.values[0]);
        if (!selectedContact)
            return;
        const chatEmbed = new discord_js_1.EmbedBuilder()
            .setColor('#232946')
            .setTitle("💬 Chatting with ${selectedContact.emoji} ${selectedContact.name}")
            .setDescription('Type your message below. Click "End Chat" to finish.')
            .setFooter({ text: 'Your messages are encrypted... probably.' });
        const endChatButton = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId('device:end_chat')
            .setLabel('❌ End Chat')
            .setStyle(discord_js_1.ButtonStyle.Danger));
        const characterAI = new node_characterai_1.CharacterAI();
        characterAI.authenticate(process.env.CHARACTER_TOKEN).then(async () => {
            console.log("Logged in");
            const character = characterAI.fetchCharacter(selectedContact.character_id);
            let dms;
            let last;
            if (!device.conversation_id || device.conversation_id == 'null') {
                dms = (await character).createDM();
                device.conversation_id = (await dms).chatId;
                await device.save();
                last = (await character).greeting;
            }
            else {
                dms = await (await character).DM(device.conversation_id);
                dms.refreshMessages();
                console.log(dms.messages);
                last = getLastBotMessageContent(dms.messages);
                console.log(last);
            }
            if (selectInteraction.channel && 'sendTyping' in selectInteraction.channel && typeof selectInteraction.channel.sendTyping === 'function') {
                await selectInteraction.channel.sendTyping();
            }
            const lastMessage = await last;
            if (typeof lastMessage === 'object' && lastMessage !== null && 'content' in lastMessage) {
                console.log(lastMessage);
                await selectInteraction.followUp({ content: lastMessage, flags: [discord_js_1.MessageFlags.Ephemeral] });
            }
            else if (typeof lastMessage === 'string') {
                console.log(lastMessage);
                await selectInteraction.followUp({ content: lastMessage, flags: [discord_js_1.MessageFlags.Ephemeral] });
            }
            else {
                await selectInteraction.followUp({ content: "No messages yet", flags: [discord_js_1.MessageFlags.Ephemeral] });
            }
            bot_type = false;
        });
        await new Promise(resolve => setTimeout(resolve, 1000));
        await selectInteraction.update({
            embeds: [chatEmbed],
            components: [endChatButton]
        });
        const filter = (m) => m.author.id === interaction.user.id;
        const collector = interaction.channel
            ? new discord_js_1.MessageCollector(interaction.channel, { filter, time: 60000 })
            : undefined;
        collector?.on('collect', async (msg) => {
            if (bot_type) {
                msg.reply({ content: 'Cmon! give some time to you inmated to respond you. Are u getting too excited?', allowedMentions: { repliedUser: false } });
                return;
            }
            bot_type = true;
            const characterAI = new node_characterai_1.CharacterAI();
            characterAI.authenticate(process.env.CHARACTER_TOKEN).then(async () => {
                console.log("Logged in");
                const character = characterAI.fetchCharacter(selectedContact.character_id);
                console.log((await character).description);
                let dms;
                let response;
                if (!device.conversation_id || device.conversation_id == 'null') {
                    dms = (await character).createDM();
                    device.conversation_id = (await dms).chatId;
                    await device.save();
                    response = (await dms).sendMessage("${msg.author.username}-${msg.content}");
                }
                else {
                    dms = await (await character).DM(device.conversation_id);
                    response = (await dms).sendMessage("${msg.author.username}-${msg.content}");
                }
                console.log((await response).content);
                if ('sendTyping' in msg.channel && typeof msg.channel.sendTyping === 'function') {
                    await msg.channel.sendTyping();
                }
                msg.reply((await response).content);
                bot_type = false;
            });
        });
        const buttonCollector = interaction.channel?.createMessageComponentCollector({
            componentType: discord_js_1.ComponentType.Button,
            filter: i => i.user.id === interaction.user.id && i.customId === 'device:end_chat',
            time: 60000
        });
        buttonCollector?.on('collect', async (i) => {
            collector?.stop();
            await i.update({
                embeds: [
                    new discord_js_1.EmbedBuilder()
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
                    new discord_js_1.EmbedBuilder()
                        .setColor('#232946')
                        .setTitle('📱 Device Disconnected')
                        .setDescription('You put the device away. The screen fades to black.')
                ],
                components: []
            });
        });
    }
});
//# sourceMappingURL=device.js.map