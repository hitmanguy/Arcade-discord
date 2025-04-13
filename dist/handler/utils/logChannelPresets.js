"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLogChannelPresetEmbed = getLogChannelPresetEmbed;
const discord_js_1 = require("discord.js");
function getLogChannelPresetEmbed(context, commandName, commandType) {
    const authorId = context instanceof discord_js_1.Message ? context.author.id : context.user.id;
    const authorIconURL = context instanceof discord_js_1.Message ? context.author.displayAvatarURL() : context.user.displayAvatarURL();
    const messageURL = context.guild && context.channel
        ? `https://discord.com/channels/${context.guild.id}/${context.channel.id}/${context.id}`
        : undefined;
    const logEmbed = new discord_js_1.EmbedBuilder()
        .setTitle(`${commandType} triggered`)
        .setColor('Blurple')
        .setDescription(`**${commandType}**: \`${commandName}\`\n**User**: <@${authorId}>\n**Channel**: <#${context.channel?.id}>`)
        .setThumbnail(authorIconURL)
        .setTimestamp();
    const isEphemeralInteraction = !(context instanceof discord_js_1.Message) &&
        'flags' in context &&
        typeof context.flags === 'number' &&
        (context.flags & discord_js_1.MessageFlags.Ephemeral) === discord_js_1.MessageFlags.Ephemeral;
    if (messageURL && !isEphemeralInteraction) {
        logEmbed.setURL(messageURL);
    }
    return logEmbed;
}
//# sourceMappingURL=logChannelPresets.js.map