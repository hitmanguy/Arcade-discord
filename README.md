# 🧠 Infiniox: Prison Escape Puzzle Bot

Infiniox is an immersive **multiplayer puzzle and strategy Discord bot** set in a high-security prison. Players must solve brain-teasing challenges, maintain sanity, gain merit points, and avoid rising suspicion to escape. With modes like co-op, sabotage, and competitive gameplay, every decision has consequences—testing your logic, memory, and social strategy.



---

## 🚀 Features

- 🎮 **Multiplayer Game System**: Co-op, sabotage, and competitive puzzle-solving modes.
- 🧩 **Puzzle Variety**: Riddles, trivia, memory, math, and logic games.
- 📈 **Progression System**: Earn merit points to unlock increasingly difficult levels.
- 🧠 **Sanity & Suspicion**: A dynamic risk-reward system that reacts to player behavior.
- 🏆 **Ranking System**: Tier-based leaderboard based on merit points and performance.
- 🧙 **Tool Shop**: Buy syringes, timers, and skip-a-day tools with merit points.
- 🎭 **Alliances, Bounties, and Black Market**: Strategic social deception mechanics.
- 💬 **Slash Command Based**: Clean and modern interface using Discord's interactions.
- 🔄 **Replayability**: Unlimited attempts and branching game modes for each session.

---

## 🎮 Game Descriptions

### 🧠 Basic Training (Level 1)

Welcome to **Orientation Block A** — the first step on your path to freedom. Here, the prison tests your raw intellect with a series of classic brain teasers. It’s calm… but deceptive. Don’t let the simplicity fool you — every answer builds your reputation and every mistake chips away at your sanity.

This level introduces you to the core mechanics: **merit, sanity, and suspicion**. It’s your trial by mind — clear it, and you earn your first ticket toward escape.

- 🧩 **Content:** Riddles, trivia, and beginner-level logic puzzles  
- 💡 **Goal:** Earn 50+ merit points  
- 🔓 **Unlocks:** Level 2 – The Tunnel

---

### 🚇 The Tunnel (Level 2)

Deep beneath the prison lies a dark, narrow tunnel—your first real step toward escape. This claustrophobic level tests both your **memory and logic under pressure**. The walls whisper secrets, and the lights flicker as you race against time to complete challenges that grow more complex with each attempt.

Players must solve **memory-based matching puzzles** and **timed logic sequences**. Every mistake tightens security, increasing your suspicion level. Only the sharpest minds make it out with their merit intact—others risk being dragged back to solitary.

- 🧠 **Focus:** Memory recall, matching pairs, fast pattern recognition  
- ⏱️ **Pressure:** Shorter time limits and rising difficulty  
- 🎯 **Goal:** Reach a total of 100 merit points to unlock Level 3

---

### 🎴 Memory Test (Level 3)

Welcome to **The Surveillance Block**—a space flooded with endless flashing monitors and echoing alarms. Here, your **short-term memory is your only ally**. The system throws rapid sequences of colors, symbols, and numbers that you must memorize and repeat flawlessly.

Each round gets faster. Each failure chips away at your **sanity** and raises your **suspicion**. Success, however, earns you valuable merit points and gets you closer to the elusive escape route.

- 🧠 **Focus:** Sequence recall, visual memory, and reaction speed  
- 🔄 **Replayability:** Patterns change every session  
- 🎯 **Goal:** Reach a total of 150 merit points to unlock the next stage

---

### 🃏 Digital Card Protocol (Level 4)

You’ve entered the **Data Core**, a virtual zone where nothing is real—but every decision carries real consequences. This level is a strategic mind maze modeled after a chaotic, UNO-style logic game. Wild cards, reverses, skips—each move can be salvation or sabotage.

Outwit not just the game, but other players. Choose when to strike, when to defend, and when to deceive. Make one wrong play, and you’ll lose **merit** and raise **suspicion**. But play it right, and you'll rise above the rest.

- 🎴 **Focus:** Card logic, strategy, and timing  
- 🔁 **Mechanics:** Wild cards, chain effects, surprise reveals  
- 🎯 **Goal:** Achieve 200 total merit points to unlock the next protocol

---

### 🔢 The Numbers Protocol (Level 5)

Welcome to the **Cipher Chamber**, where every number hides a secret and every second counts. This level pushes your **logic and pattern recognition** to the edge. Equations twist into riddles, sequences defy expectations, and only the sharpest minds make it through.

You’re racing against time. Crack numeric codes, predict patterns, and solve complex logic puzzles before suspicion catches up. This level is less about luck—and all about **focus and speed**.

- 🧠 **Focus:** Number logic, calculations, and sequences  
- ⏱️ **Challenge:** Timed pressure with rising difficulty  
- 🎯 **Goal:** Reach a total of 250 merit points to successfully breach the prison and be set free


---

## 🕹️ How to Play

1. Run `/puzzle` to begin Level 1 — get 5 random puzzles.
2. **Correct answers** grant +10 merit.
3. **Wrong answers** reduce sanity and increase suspicion.
4. Track progress anytime with `/progress`.
5. Unlock levels as follows:
   - Tunnel: 50+ merit
   - Memory Test: 100+ merit
   - Digital Card Protocol: 150+ merit
   - Numbers Protocol: 200+ merit
6. Choose game mode:
   - 🧑‍🤝‍🧑 **Co-Op**: Team up, solve together, share rewards.
   - 🧨 **Sabotage**: Deceive teammates and steal merit — fail, and pay a price.
   - ⚔️ **Competitive**: Speed-based head-to-head puzzle duels.
7. Use `/shop` to buy tools:
   - 🧪 Syringe (+20 Sanity) — 50 merit
   - 🕒 Skip a Day (-25 Suspicion) — 75 merit
   - ⏱️ Suspicion Timer — 100 merit

---

## 📉 Sanity & Suspicion Mechanics

- Low sanity affects decision-making; very low sanity results in hallucination puzzles.
- High suspicion triggers:
  - Random tool confiscation
  - Surprise inspections
  - Temporary bans from certain levels

Stay sharp and play smart!

---

## 🛠️ Installation Guide

```bash
# 1. Clone the repository
$ git clone https://github.com/your-repo/prison-escape-bot.git

# 2. Navigate to the project folder
$ cd prison-escape-bot

# 3. Install dependencies
$ npm install

# 4. Create environment file
$ touch .env

# 5. Add the required variables in .env (see below)

# 6. Start the bot
$ npm run dev
```

---

## 🔧 Environment Variables

```
DISCORD_TOKEN=your_discord_bot_token
CLIENT_ID=your_bot_client_id
GUILD_ID=your_test_guild_id (for local testing)
```

---
## 👨‍💻 Contributors

- **Sahil Chauhan** — IMT2024090
- **Saarthak Singh** — IMT2024082
- **Shashank Pai** — BT2024250

---

> Built with 💡 by puzzle lovers, for puzzle solvers.
