# 🧠 Prison Escape Puzzle Bot

An immersive multiplayer Discord bot where players must solve puzzles, outwit others, and escape from a mysterious high-security prison. Designed for both solo and team play, this game blends logical puzzles with psychological strategy in a thrilling escape experience.

---

## 🚀 Features

- 🎮 **Multiplayer Game System**: Co-op, sabotage, and competitive puzzle-solving.
- 🧩 **Puzzle Variety**: Riddles, trivia, memory games, UNO-style logic, and more.
- 📈 **Progress Tracking**: Track merit, sanity, suspicion, and unlock new levels.
- 🏆 **Ranking System**: Tier-based leaderboards based on merit points.
- ⚡ **Suspicion Meter**: Reacts dynamically to failures and suspicious behavior.
- 🔄 **Replayability**: Retry puzzles or advance to new levels anytime.
- 💬 **Fully Slash Command Based**: Easy to use with Discord’s modern interface.

---

## 🧩 Game Descriptions

### 1. **Basic Training**
- Introduction level.
- Simple riddles, trivia, and math puzzles.
- Earn points to unlock the next levels.

### 2. **🚇 Tunnel (Level 2)**
- Requires 50 merit points to unlock.
- Dark and claustrophobic setting.
- Includes logic puzzles and high-stakes timed challenges.

### 3. **🎴 Memory Test**
- Match pairs of hidden cards.
- Tests memory and pattern recognition under pressure.

### 4. **🃏 Digital Card Protocol (UNO Style)**
- Card game simulation with puzzle mechanics.
- Strategic use of skips, reverses, and wild cards.

### 5. **🔢 The Numbers Protocol**
- Solve number-based puzzles and patterns.
- Precision and calculation-focused.

### 6. **👥 The Judas Protocol**
- Sabotage-based logic deduction game.
- Includes betrayal mechanics and high risk/reward.

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

## 🎮 How to Play

1. **Start with `/puzzle`** — get 5 random puzzles from Level 1.
2. Answer correctly to earn **Merit Points**; wrong answers affect **Sanity**.
3. Once 50 merit is reached, unlock the **Tunnel** using `/tunnel`.
4. Track your stats anytime using `/progress`.
5. Choose your gameplay mode:
   - Co-Op: Team up for safe but slow progress.
   - Sabotage: Trick your teammate and steal all the merit.
   - Competitive: Time-based race to solve puzzles.
6. Advance through levels and avoid raising your **Suspicion Meter**.

---

## 🗺️ Roadmap

- [x] Basic puzzle system with interactive buttons
- [x] Level progression and merit system
- [x] Tunnel and Memory mini-games
- [x] Sabotage and Co-Op modes
- [ ] Web-based leaderboard
- [ ] Inventory system for hints/tools
- [ ] Voice-integrated puzzles
- [ ] Mobile-friendly dashboard

---

## 👨‍💻 Contributors

- **Sahil Chauhan** — Core Developer, Puzzle Systems
- **Saarthak Singh** — Multiplayer & Game Mechanics
- **Shashank Pai** — Prediction AI & Risk Systems

---

> Built with 💡 by puzzle lovers, for puzzle solvers.

