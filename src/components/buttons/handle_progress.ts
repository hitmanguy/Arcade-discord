import { Button } from '../../handler';
import { ButtonInteraction, MessageFlags } from 'discord.js';
import { handleProgressStats } from 'src/commands/slash/Progress/progress';

export default new Button({
  customId: 'progress-stats',

  async execute(interaction: ButtonInteraction, uniqueId: string | null): Promise<void> {
    await handleProgressStats(interaction);
  },
});