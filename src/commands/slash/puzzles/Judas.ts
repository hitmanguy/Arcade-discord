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
import { sleep } from 'bun';
  
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
        sub.setName('create')
          .setDescription('Create a new Judas Protocol lobby')
      )
      .addSubcommand(sub =>
        sub.setName('join')
          .setDescription('Join the current Judas Protocol lobby')
      )
      .addSubcommand(sub =>
        sub.setName('start')
          .setDescription('Start the Judas Protocol game (host only)')
      )as SlashCommandBuilder,
    async execute(interaction: ChatInputCommandInteraction) {
      const sub = interaction.options.getSubcommand();
      const channelId = interaction.channelId;
  
      if (sub === 'create') {
        if (games.has(channelId)) {
          await interaction.reply({ content: "A Judas Protocol game is already in progress or lobby exists in this channel.", ephemeral: true });
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
        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("👑 The Judas Protocol Lobby")
              .setDescription("Lobby created! Others can now `/judas join`.\n\n**Minimum: 3 players.**\nHost: <@" + interaction.user.id + ">")
              .addFields({ name: "Players", value: `<@${interaction.user.id}>` })
              .setColor(0x9b111e)
          ]
        });
      }
  
      else if (sub === 'join') {
        const game = games.get(channelId);
        if (!game || game.started) {
          await interaction.reply({ content: "No joinable Judas Protocol lobby in this channel.", ephemeral: true });
          return;
        }
        if (game.players.some(p => p.id === interaction.user.id)) {
          await interaction.reply({ content: "You have already joined the lobby.", ephemeral: true });
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
        // Update lobby message
        const playerList = game.players.map(p => `<@${p.id}>`).join(', ');
        const channel = interaction.channel as TextChannel;
        await channel.send({
          embeds: [
            new EmbedBuilder()
              .setTitle("👑 The Judas Protocol Lobby")
              .setDescription("Players joined: " + playerList)
              .setColor(0x9b111e)
          ]
        });
      }


else if (sub === 'start') {
    const game = games.get(channelId);
    await interaction.deferReply();
    if (!game || game.started) {
      await interaction.reply({ content: "No joinable Judas Protocol lobby in this channel.", ephemeral: true });
      return;
    }
    if (game.ownerId !== interaction.user.id) {
      await interaction.reply({ content: "Only the lobby creator can start the game.", ephemeral: true });
      return;
    }
    if (game.players.length < 3) {
      await interaction.reply({ content: "You need at least 3 players to start.", ephemeral: true });
      return;
    }
    // Assign Judas and secrets
    const judasIdx = Math.floor(Math.random() * game.players.length);
    game.judasId = game.players[judasIdx].id;
    const shuffledSecrets = [...SECRETS].sort(() => Math.random() - 0.5);
    let secretIdx = 0;
    for (let i = 0; i < game.players.length; i++) {
      if (i === judasIdx) {
        game.players[i].secret = FAKE_SECRET;
      } else {
        game.players[i].secret = shuffledSecrets[secretIdx++];
      }
    }
    game.started = true;
  
    // DM secrets
    for (const p of game.players) {
      const user = await interaction.client.users.fetch(p.id);
      await user.send(`**JUDAS PROTOCOL: Your secret:**\n${p.secret}`);
    }
  
    // --- GAME GUIDE EMBED ---
    const rulesEmbed = new EmbedBuilder()
      .setTitle("👑 The Judas Protocol — Game Guide")
      .setDescription(
        "“Trust is currency. Lies are weapons. And someone must pay the price.”\n\n" +
        "Welcome to **The Judas Protocol**. You are all locked in a digital prison. One of you is a traitor — but even they don't know it yet.\n\n" +
        "The game runs for **3 Phases**. If you fail to identify Judas, two will die. If you succeed, you all survive (except Judas)."
      )
      .addFields(
        {
          name: "🩸 **Phase 1: Data Leak**",
          value:
            "• Each player receives a secret in DM. One is fake (sent to Judas).\n" +
            "• Players take turns to **reveal** or **hide** their secret.\n" +
            "• Contradictory info? Tension rises. The system may inject random lies."
        },
        {
          name: "🕵️ **Phase 2: Inquisition**",
          value:
            "• Each player may ask **one public question** to anyone.\n" +
            "• The system may randomly accuse or lie about players."
        },
        {
          name: "⚖️ **Phase 3: The Verdict**",
          value:
            "• Each player privately votes (via DM) for who they think is Judas.\n" +
            "• If the group is correct, Judas is eliminated. If not, Judas gets to eliminate two players."
        },
        {
          name: "🎭 **The Twist**",
          value:
            "• Judas does **not** know they are Judas until the end.\n" +
            "• If the group fails, Judas is told their role and chooses two to eliminate."
        }
      )
      .setFooter({ text: "Type /judas join to join the next game. Good luck." })
      .setColor(0x9b111e);
  
    // --- PHASE 1 EMBED ---
    const phase1Embed = new EmbedBuilder()
      .setTitle("👑 The Judas Protocol")
      .setDescription("Trust is currency. Lies are weapons. And someone must pay the price.\n\n_Phase 1: Data Leak begins!_")
      .addFields({ name: "Players", value: game.players.map(p => `<@${p.id}>`).join(', ') })
      .setColor(0x9b111e);
  
    await interaction.editReply({ embeds: [rulesEmbed, phase1Embed] });
    setTimeout(async () => {
        // Start Phase 1
        await runPhase1(interaction, game);
      }, 15000);
  }
    }
  });
  
  function getRandomSystemLie(players: JudasGamePlayer[]): string {
    const SYSTEM_LIES = [
      "System Alert: {player} has lied.",
      "Suspicion detected: {player} shows stress response.",
      "AI recommends isolating {player}.",
      "System Alert: {player} is hiding information.",
      "Warning: {player} attempted to access restricted data.",
      "System Alert: {player} is not who they claim to be.",
      "Suspicion: {player} is acting erratically.",
    ];
    const player = players[Math.floor(Math.random() * players.length)];
    const phrase = SYSTEM_LIES[Math.floor(Math.random() * SYSTEM_LIES.length)];
    return phrase.replace('{player}', `<@${player.id}>`);
  }
  
  async function runPhase1(interaction: ChatInputCommandInteraction, game: JudasGame) {
    const channel = interaction.channel as TextChannel;
    const players = game.players.filter(p => p.isAlive);
  
    for (const p of players) {
      const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder().setCustomId('reveal').setLabel('Reveal Secret').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId('hide').setLabel('Hide Secret').setStyle(ButtonStyle.Secondary)
        );
      await channel.send({ content: `<@${p.id}>, it's your turn.`, components: [row] });
  
      const filter = (i: ButtonInteraction) => i.user.id === p.id && (i.customId === 'reveal' || i.customId === 'hide');
      const collected = await channel.awaitMessageComponent({ filter, componentType: ComponentType.Button, time: 30000 }).catch(() => null);
  
      if (collected) {
        await collected.deferUpdate();
        if (collected.customId === 'reveal') {
          p.revealed = true;
          await channel.send({ content: `🔓 <@${p.id}> reveals: **${p.secret}**` });
        } else {
          p.revealed = false;
          await channel.send({ content: `🔒 <@${p.id}> chooses to keep their secret hidden.` });
        }
      } else {
        await channel.send({ content: `<@${p.id}> did not respond in time. Secret remains hidden.` });
      }
  
      // Randomly inject a system lie
      if (Math.random() < 0.4) {
        await channel.send({ content: getRandomSystemLie(players) });
      }
    }
  
    await runPhase2(interaction, game);
  }
  
  async function runPhase2(interaction: ChatInputCommandInteraction, game: JudasGame) {
    const channel = interaction.channel as TextChannel;
    await channel.send("**Phase 2: Inquisition**\nEach player may ask one public question to anyone. Type your question in chat. (Bot will inject random lies during this phase.)");
  
    let asked = new Set<string>();
    const filter = (m: Message) =>
      game.players.some((p) => p.id === m.author.id) && !asked.has(m.author.id);
    const collector = channel.createMessageCollector({ filter, time: 60000 });
  
    collector.on('collect', async (msg: Message) => {
      asked.add(msg.author.id);
      await channel.send(`Question from <@${msg.author.id}>: ${msg.content}`);
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
    await channel.send("**Phase 3: The Verdict**\nEach player, DM me the user you believe is Judas (by @mention or ID).");
  
    const votes: Record<string, string> = {};
    const filter = (m: Message) => game.players.some(p => p.id === m.author.id);
    const client = interaction.client;
  
    // Message handler for DMs
    const dmHandler = async (msg: Message) => {
      if (!msg.guild && filter(msg) && !votes[msg.author.id]) {
        const match = msg.content.match(/<@!?(\d+)>|(\d{17,})/);
        if (match) {
          const votedId = match[1] || match[2];
          if (game.players.some(p => p.id === votedId)) {
            votes[msg.author.id] = votedId;
            await msg.reply("Vote received.");
          }
        }
      }
      if (Object.keys(votes).length === game.players.length) {
        client.off('messageCreate', dmHandler);
        await resolveVerdict(interaction, game, votes);
      }
    };
    client.on('messageCreate', dmHandler);
  
    // Failsafe: after 90s, resolve with whatever votes are in
    setTimeout(async () => {
      client.off('messageCreate', dmHandler);
      await resolveVerdict(interaction, game, votes);
    }, 90000);
  }
  
  async function resolveVerdict(interaction: ChatInputCommandInteraction, game: JudasGame, votes: Record<string, string>) {
    const channel = interaction.channel as TextChannel;
    const tally: Record<string, number> = {};
    for (const v of Object.values(votes)) tally[v] = (tally[v] || 0) + 1;
    const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]);
    const [topId, topVotes] = sorted[0] || [null, 0];
  
    const judasId = game.judasId!;
    if (topId && topId === judasId && topVotes > game.players.length / 2) {
      await channel.send(`✅ The group identified Judas (<@${judasId}>)! Judas is eliminated. Everyone else survives.`);
      games.delete(game.channelId);
    } else {
      // Judas wins, gets to choose two to eliminate
      const user = await interaction.client.users.fetch(judasId);
      await user.send("🔥 You are the Judas. The group failed to identify you. Choose two players to eliminate. Reply with their @mentions or IDs, separated by space.");
      const eliminated: string[] = [];
      const client = interaction.client;
  
      const judasHandler = async (msg: Message) => {
        if (!msg.guild && msg.author.id === judasId) {
          const ids = msg.content.match(/<@!?(\d+)>|(\d{17,})/g)?.map((s: string) => s.replace(/\D/g, ''));
          if (ids && ids.length === 2 && ids.every(id => game.players.some(p => p.id === id && p.id !== judasId))) {
            eliminated.push(...ids);
            await msg.reply("Your choices have been recorded.");
            client.off('messageCreate', judasHandler);
            await channel.send(`☠️ Judas (<@${judasId}>) has chosen to eliminate <@${ids[0]}> and <@${ids[1]}>. Only Judas survives.`);
            games.delete(game.channelId);
          }
        }
      };
      client.on('messageCreate', judasHandler);
  
      // Failsafe: after 60s, pick random
      setTimeout(async () => {
        if (eliminated.length < 2) {
          client.off('messageCreate', judasHandler);
          const others = game.players.filter(p => p.id !== judasId).map(p => p.id);
          const shuffled = others.sort(() => Math.random() - 0.5);
          await channel.send(`☠️ Judas (<@${judasId}>) did not choose in time. <@${shuffled[0]}> and <@${shuffled[1]}> are eliminated.`);
          games.delete(game.channelId);
        }
      }, 60000);
    }
  }
