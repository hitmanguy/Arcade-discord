import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  TextChannel,
  ButtonInteraction,
  Message,
} from 'discord.js';
import { RegisterType, SlashCommand } from '../../../handler';

const SECRETS = [
  "You once sabotaged a group vote.",
  "You have a hidden escape route.",
  "You know the system's shutdown code.",
  "You are immune to the first accusation.",
  "You can see who voted for you.",
  "You have a secret alliance.",
  "You know the true exit.",
  "You have a backup plan.",
  "You can swap places with another player.",
];
const FAKE_SECRET = "You are the only one who can deactivate the JUDAS Protocol.";

interface JudasGamePlayer {
  id: string;
  username: string;
  secret: string;
  isAlive: boolean;
  revealed: boolean;
  sanity: number;
  merit: number;
}

interface JudasGame {
  channelId: string;
  ownerId: string;
  players: JudasGamePlayer[];
  judasId: string | null;
  started: boolean;
}

const games = new Map<string, JudasGame>();

export default new SlashCommand({
  registerType: RegisterType.Guild,
  data: new SlashCommandBuilder()
    .setName('judas')
    .setDescription('Play The Judas Protocol')
    .addSubcommand(sub =>
      sub.setName('create').setDescription('Create a new Judas Protocol lobby')
    )
    .addSubcommand(sub =>
      sub.setName('join').setDescription('Join the current Judas Protocol lobby')
    )
    .addSubcommand(sub =>
      sub.setName('start').setDescription('Start the Judas Protocol game (host only)')
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    const channelId = interaction.channelId;

    if (sub === 'create') {
      if (games.has(channelId)) {
        await interaction.reply({ content: "A Judas Protocol game already exists in this channel.", ephemeral: true });
        return;
      }
      const game: JudasGame = {
        channelId,
        ownerId: interaction.user.id,
        players: [{
          id: interaction.user.id,
          username: interaction.user.username,
          isAlive: true,
          sanity: 100,
          merit: 0,
          revealed: false,
          secret: "",
        }],
        judasId: null,
        started: false,
      };
      games.set(channelId, game);

      // Create the "Join" button
      const joinButton = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('join')
          .setLabel('Join')
          .setStyle(ButtonStyle.Success)
      );

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("👑 The Judas Protocol Lobby")
            .setDescription("Lobby created! Others can now `/judas join`.\n**Minimum: 3 players.**\nHost: <@" + interaction.user.id + ">")
            .addFields({ name: "Players", value: `<@${interaction.user.id}>` })
            .setColor(0x9b111e)
        ],
        components: [joinButton],
      });
    }

    else if (sub === 'join') {
      const game = games.get(channelId);
      if (!game || game.started) {
        await interaction.reply({ content: "No joinable Judas Protocol lobby found.", ephemeral: true });
        return;
      }
      if (game.players.find(p => p.id === interaction.user.id)) {
        await interaction.reply({ content: "You have already joined this lobby.", ephemeral: true });
        return;
      }
      game.players.push({
        id: interaction.user.id,
        username: interaction.user.username,
        isAlive: true,
        sanity: 100,
        merit: 0,
        revealed: false,
        secret: "",
      });

      await interaction.reply({ content: "You joined the Judas Protocol lobby!", ephemeral: true });

      const channel = interaction.channel as TextChannel;
      const playerList = game.players.map(p => `<@${p.id}>`).join(', ');
      await channel.send({
        embeds: [new EmbedBuilder()
          .setTitle("👑 The Judas Protocol Lobby")
          .setDescription("Players joined: " + playerList)
          .setColor(0x9b111e)]
      });
    }

    else if (sub === 'start') {
      const game = games.get(channelId);
      await interaction.deferReply();
      if (!game || game.started) {
        await interaction.editReply({ content: "No joinable game or already started."});
        return;
      }
      if (game.ownerId !== interaction.user.id) {
        await interaction.editReply({ content: "Only the lobby creator can start the game." });
        return;
      }
      if (game.players.length < 3) {
        await interaction.editReply({ content: "At least 3 players required to start."});
        return;
      }

      // Assign Judas + secrets
      const judasIdx = Math.floor(Math.random() * game.players.length);
      game.judasId = game.players[judasIdx].id;
      const shuffledSecrets = [...SECRETS].sort(() => Math.random() - 0.5);
      game.players.forEach((p, i) => {
        p.secret = i === judasIdx ? FAKE_SECRET : shuffledSecrets.pop()!;
      });
      game.started = true;

      // DM secrets
      for (const p of game.players) {
        const user = await interaction.client.users.fetch(p.id);
        await user.send(`**JUDAS PROTOCOL — Your secret:**\n${p.secret}`);
      }

      // Game guide
      const rulesEmbed = new EmbedBuilder()
        .setTitle("👑 The Judas Protocol — Game Guide")
        .setDescription("“Trust is currency. Lies are weapons.” One of you is Judas. But even they don’t know it — yet.\n\n3 Phases. Survive. Unmask the traitor.")
        .addFields(
          { name: "🩸 Phase 1: Data Leak", value: "Each player gets a secret. One is fake. Reveal or hide it. The system may lie." },
          { name: "🕵️ Phase 2: Inquisition", value: "Ask public questions. Observe. The system may falsely accuse." },
          { name: "⚖️ Phase 3: Verdict", value: "Privately vote for Judas. Get it wrong? Judas kills two." },
          { name: "🎭 Twist", value: "Judas learns their role only if the group fails." }
        )
        .setColor(0x9b111e);

      const phase1Embed = new EmbedBuilder()
        .setTitle("🩸 Phase 1: Data Leak")
        .setDescription("Each player will take turns deciding to reveal or hide their secret.")
        .addFields({ name: "Players", value: game.players.map(p => `<@${p.id}>`).join(', ') })
        .setColor(0x9b111e);

      await interaction.editReply({ embeds: [rulesEmbed, phase1Embed] });

      await runPhase1(interaction, game);
    }
  }
});

function getRandomSystemLie(players: JudasGamePlayer[]): string {
  const SYSTEM_LIES = [
    "System Alert: {player} has lied.",
    "Suspicion detected: {player} shows stress.",
    "AI recommends isolating {player}.",
    "Alert: {player} attempted unauthorized access.",
    "Suspicion: {player} is not who they say they are.",
  ];
  const player = players[Math.floor(Math.random() * players.length)];
  const phrase = SYSTEM_LIES[Math.floor(Math.random() * SYSTEM_LIES.length)];
  return phrase.replace('{player}', `<@${player.id}>`);
}

// Phase functions remain unchanged
async function runPhase1(interaction: ChatInputCommandInteraction, game: JudasGame) {
  const channel = interaction.channel as TextChannel;

  for (const p of game.players) {
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId('reveal').setLabel('Reveal Secret').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('hide').setLabel('Hide Secret').setStyle(ButtonStyle.Secondary)
    );

    const promptMessage = await channel.send({
      content: `<@${p.id}>, it's your turn.`,
      components: [row],
    });

    const filter = (i: ButtonInteraction) => i.user.id === p.id;
    const collector = promptMessage.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter,
      max: 1,
      time: 30000,
    });

    const collected = await new Promise<ButtonInteraction | null>((resolve) => {
      collector.on('collect', (i) => resolve(i));
      collector.on('end', (collected) => {
        if (collected.size === 0) resolve(null);
      });
    });

    if (collected) {
      await collected.deferUpdate();
      p.revealed = collected.customId === 'reveal';
      await channel.send({
        content: p.revealed ? `🔓 <@${p.id}> reveals: **${p.secret}**` : `🔒 <@${p.id}> keeps their secret hidden.`,
      });
    } else {
      await channel.send({ content: `<@${p.id}> didn't respond. Secret hidden.` });
    }

    if (Math.random() < 0.4) {
      await channel.send(getRandomSystemLie(game.players));
    }
  }

  await runPhase2(interaction, game);
}


async function runPhase2(interaction: ChatInputCommandInteraction, game: JudasGame) {
  const channel = interaction.channel as TextChannel;
  await channel.send("🕵️ **Phase 2: Inquisition**\nEach player may ask a public question. Type it in the chat.");

  const asked = new Set<string>();
  const filter = (m: Message) => game.players.some(p => p.id === m.author.id) && !asked.has(m.author.id);
  const collector = channel.createMessageCollector({ filter, time: 60000 });

  collector.on('collect', async msg => {
    asked.add(msg.author.id);
    await channel.send(`❓ <@${msg.author.id}> asks: ${msg.content}`);
    if (Math.random() < 0.5) {
      await channel.send(getRandomSystemLie(game.players));
    }
    if (asked.size === game.players.length) collector.stop();
  });

  collector.on('end', async () => {
    await runPhase3(interaction, game);
  });
}

async function runPhase3(interaction: ChatInputCommandInteraction, game: JudasGame) {
  const channel = interaction.channel as TextChannel;
  await channel.send("⚖️ **Phase 3: Verdict**\nDM me who you believe is Judas (mention or ID).");

  const votes: Record<string, string> = {};
  const client = interaction.client;

  const dmHandler = async (msg: Message) => {
    if (!msg.guild && game.players.some(p => p.id === msg.author.id) && !votes[msg.author.id]) {
      const match = msg.content.match(/<@!?(\d+)>|(\d{17,})/);
      if (match) {
        const votedId = match[1] || match[2];
        if (game.players.some(p => p.id === votedId)) {
          votes[msg.author.id] = votedId;
          await msg.reply("✅ Vote received.");
        }
      }
    }
    if (Object.keys(votes).length === game.players.length) {
      client.off('messageCreate', dmHandler);
      await resolveVerdict(interaction, game, votes);
    }
  };
  client.on('messageCreate', dmHandler);

  setTimeout(async () => {
    client.off('messageCreate', dmHandler);
    await resolveVerdict(interaction, game, votes);
  }, 90000);
}

async function resolveVerdict(interaction: ChatInputCommandInteraction, game: JudasGame, votes: Record<string, string>) {
  const channel = interaction.channel as TextChannel;
  const tally: Record<string, number> = {};
  for (const v of Object.values(votes)) tally[v] = (tally[v] || 0) + 1;
  const [topId, topVotes] = Object.entries(tally).sort((a, b) => b[1] - a[1])[0] || [null, 0];

  const judasId = game.judasId!;
  if (topId === judasId && topVotes > game.players.length / 2) {
    await channel.send(`✅ The group correctly identified Judas: <@${judasId}>. They are eliminated. Well played.`);
  } else {
    const user = await interaction.client.users.fetch(judasId);
    await user.send("🔥 You are Judas. Choose two players to eliminate. Send their IDs or @mentions separated by space.");
    const eliminated: string[] = [];

    const handler = async (msg: Message) => {
      if (!msg.guild && msg.author.id === judasId) {
        const ids = msg.content.match(/<@!?(\d+)>|(\d{17,})/g)?.map(s => s.replace(/\D/g, ''));
        if (ids && ids.length === 2 && ids.every(id => game.players.some(p => p.id === id))) {
          eliminated.push(...ids);
          game.players.forEach(p => {
            if (eliminated.includes(p.id)) p.isAlive = false;
          });
          await msg.reply("☠️ Targets marked. The system executes them.");
          await channel.send(`❌ Judas escaped. <@${eliminated[0]}> and <@${eliminated[1]}> have been eliminated.`);
          games.delete(game.channelId);
          interaction.client.off('messageCreate', handler);
        }
      }
    };
    interaction.client.on('messageCreate', handler);

    setTimeout(() => {
      interaction.client.off('messageCreate', handler);
      channel.send("⏱️ Judas failed to respond in time. Game ends.");
      games.delete(game.channelId);
    }, 60000);
  }
}
