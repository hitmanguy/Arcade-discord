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
  MessageCollector,
  MessageFlags
} from 'discord.js';
import { Device} from '../../../model/Device_schema';
import { User } from '../../../model/user_status';
export default new SlashCommand({
    registerType: RegisterType.Global,
    data: new SlashCommandBuilder()
        .setName('restart')
        .setDescription('restart your progress and reset your device'),
    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        const device = await Device.findOne({ discordId: interaction.user.id });
        const user = await User.findOne({ discordId: interaction.user.id });
        await interaction.deferReply({
            flags: [MessageFlags.Ephemeral]
        });
        if(user){
            await user.deleteOne();
            await interaction.editReply({
                content: 'Your progress has been reset. You can now register again.',
            });
        }
        if(device){
            await device.deleteOne();
            await interaction.editReply({
                content: 'Your device has been reset. You can now register again.',
            });
        }
        if(!user && !device){
            await interaction.editReply({
                content: 'You have not registered yet. Please register first.',
            });
        }
    }
})