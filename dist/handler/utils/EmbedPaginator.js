"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmbedPaginator = void 0;
const Paginator_1 = require("../types/Paginator");
const discord_js_1 = require("discord.js");
class EmbedPaginator {
    settings;
    currentPageIndex;
    maxPageIndex;
    constructor(settings) {
        this.settings = settings;
        this.currentPageIndex = 0;
        this.maxPageIndex = settings.pages.length;
        this.settings.restrictToAuthor = settings.restrictToAuthor ?? true;
    }
    async send(options) {
        const { context, ephemeral, followUp, content } = options;
        if (context instanceof discord_js_1.AutocompleteInteraction)
            return;
        const isInteraction = context instanceof discord_js_1.CommandInteraction || context instanceof discord_js_1.MessageComponentInteraction;
        let messageOptions = {
            content,
            flags: ephemeral ? [discord_js_1.MessageFlags.Ephemeral] : [],
            embeds: [this.getPageEmbed()],
            components: this.getPageComponents(),
            withResponse: true,
        };
        if (!messageOptions.content) {
            delete messageOptions.content;
        }
        let sentMessage;
        if (isInteraction) {
            const interaction = context;
            const sendMethod = followUp ? 'followUp' : 'reply';
            sentMessage = (await interaction[sendMethod](messageOptions));
        }
        else {
            const message = context;
            sentMessage = await message.reply({
                content: messageOptions.content,
                embeds: messageOptions.embeds,
                components: messageOptions.components,
            });
        }
        await this.collectButtonInteractions(sentMessage);
    }
    getPageEmbed() {
        const page = this.settings.pages[this.currentPageIndex];
        const embed = page?.embed ?? page;
        if (this.settings.autoPageDisplay) {
            embed.setFooter({ text: `Page ${this.currentPageIndex + 1}/${this.maxPageIndex}` });
        }
        return embed;
    }
    getPageComponents() {
        const page = this.settings.pages[this.currentPageIndex];
        const components = [];
        components.push(this.createButtonRow());
        if (!(page instanceof discord_js_1.EmbedBuilder) && page.components) {
            const customComponents = page.components;
            components.push(...customComponents);
        }
        return components;
    }
    createButtonRow() {
        const row = new discord_js_1.ActionRowBuilder();
        const defaultButtons = {
            [Paginator_1.PaginatorButtonType.First]: { customId: 'paginator:first', style: discord_js_1.ButtonStyle.Primary, emoji: '⏮' },
            [Paginator_1.PaginatorButtonType.Previous]: { customId: 'paginator:previous', style: discord_js_1.ButtonStyle.Primary, emoji: '◀' },
            [Paginator_1.PaginatorButtonType.Next]: { customId: 'paginator:next', style: discord_js_1.ButtonStyle.Primary, emoji: '▶' },
            [Paginator_1.PaginatorButtonType.Last]: { customId: 'paginator:last', style: discord_js_1.ButtonStyle.Primary, emoji: '⏭' },
        };
        const isFirstPage = this.currentPageIndex === 0;
        const isLastPage = this.currentPageIndex === this.maxPageIndex - 1;
        Object.entries(defaultButtons).forEach(([type, config]) => {
            const customConfig = this.settings.buttons?.find((btn) => btn.type === +type) || null;
            const button = new discord_js_1.ButtonBuilder()
                .setCustomId(config.customId)
                .setStyle(customConfig?.style ?? config.style)
                .setEmoji(customConfig?.emoji ?? config.emoji)
                .setDisabled(!this.settings.loopPages &&
                (((+type === Paginator_1.PaginatorButtonType.First || +type === Paginator_1.PaginatorButtonType.Previous) && isFirstPage) ||
                    ((+type === Paginator_1.PaginatorButtonType.Next || +type === Paginator_1.PaginatorButtonType.Last) && isLastPage)));
            if (customConfig?.label) {
                button.setLabel(customConfig.label);
            }
            if (!this.settings.hideFirstLastButtons ||
                (+type !== Paginator_1.PaginatorButtonType.First && +type !== Paginator_1.PaginatorButtonType.Last)) {
                row.addComponents(button);
            }
        });
        return row;
    }
    async collectButtonInteractions(context) {
        const message = context instanceof discord_js_1.InteractionCallbackResponse && context.resource?.message
            ? context.resource.message
            : context;
        const authorId = message.author.id;
        const filter = (interaction) => interaction.isButton() &&
            interaction.message.id === message.id &&
            (!this.settings.restrictToAuthor || interaction.user.id !== authorId);
        const collector = message.createMessageComponentCollector({
            filter,
            time: this.settings.timeout * 1000,
        });
        collector.on('collect', async (interaction) => {
            try {
                switch (interaction.customId) {
                    case 'paginator:first':
                        this.currentPageIndex = 0;
                        break;
                    case 'paginator:previous':
                        this.currentPageIndex = Math.max(0, this.currentPageIndex - 1);
                        break;
                    case 'paginator:next':
                        this.currentPageIndex = Math.min(this.maxPageIndex - 1, this.currentPageIndex + 1);
                        break;
                    case 'paginator:last':
                        this.currentPageIndex = this.maxPageIndex - 1;
                        break;
                    default:
                        return;
                }
                await interaction.deferUpdate();
                await interaction.editReply({
                    embeds: [this.getPageEmbed()],
                    components: this.getPageComponents(),
                });
            }
            catch (error) {
                console.error('Error handling interaction:', error);
            }
        });
        collector.on('end', async () => {
            try {
                if (!this.settings.showButtonsAfterTimeout) {
                    await message.edit({
                        components: [],
                    });
                }
            }
            catch (error) {
                console.error('Error ending collector:', error);
            }
        });
    }
}
exports.EmbedPaginator = EmbedPaginator;
//# sourceMappingURL=EmbedPaginator.js.map