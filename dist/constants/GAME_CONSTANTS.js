"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PUZZLE_REWARDS = exports.RANKS = exports.SANITY_EFFECTS = exports.STORYLINE = exports.STARTER_ITEMS = exports.PRISON_SKILLS = exports.PRISON_AREAS = exports.PRISON_COLORS = void 0;
exports.createProgressBar = createProgressBar;
exports.PRISON_COLORS = {
    primary: '#1a1a2e',
    secondary: '#16213e',
    accent: '#0f3460',
    danger: '#e94560',
    warning: '#f6b93b',
    success: '#26de81',
    info: '#4b7bec',
    neutral: '#4f5868'
};
exports.PRISON_AREAS = [
    'Cell Block A',
    'Cell Block B',
    'Maximum Security Wing',
    'Cafeteria',
    'Yard',
    'Library',
    'Workshop',
    'Medical Bay',
    'Visitation Area',
    'Solitary Confinement'
];
exports.PRISON_SKILLS = [
    'Lockpicking',
    'Bartering',
    'Stealth',
    'Fighting',
    'First Aid',
    'Crafting',
    'Cooking',
    'Scavenging',
    'Electronics',
    'Persuasion'
];
exports.STARTER_ITEMS = [
    { itemId: 'prison_uniform', name: 'Prison Uniform', quantity: 1 },
    { itemId: 'plastic_spoon', name: 'Plastic Spoon', quantity: 1 }
];
exports.STORYLINE = {
    intro: "You wake up in a mysterious digital prison, your memories fragmented. The only way out? Complete a series of increasingly challenging trials that test your wit, trust, and sanity.",
    puzzles1: {
        name: "🔓 Basic Training",
        description: "Simple riddles and puzzles to test your mental acuity. The guards are watching...",
        flavorText: "The first test seems simple enough, but something feels off about this place...",
        slash: "Use ./puzzle to play",
        access: "unlocked",
        merit: 0
    },
    tunnel1: {
        name: "🚇 The Tunnel",
        description: "Navigate through a digital maze of patterns and sequences.",
        flavorText: "The deeper you go, the more the walls seem to shift and change...",
        slash: "Use ./tunnel to play",
        access: "acquire 50 merits point to unlock",
        merit: 50
    },
    matchingpairs: {
        name: "🎴 Memory Test",
        description: "Match the patterns, but be quick - your mind plays tricks in this place.",
        flavorText: "The symbols dance before your eyes. Are they changing, or is it just your imagination?",
        slash: "Use ./matching to play",
        access: "acquire 100 merits point to unlock",
        merit: 100
    },
    UNO: {
        name: "🃏 Digital Card Protocol",
        description: "A seemingly innocent card game that tests your strategic thinking.",
        flavorText: "Even a simple game of cards feels sinister in this place...",
        slash: "Use ./uno to play",
        access: "acquire 150 merits point to unlock",
        merit: 150
    },
    "numbers-game-command": {
        name: "🔢 The Numbers Protocol",
        description: "Trust no one. Choose your numbers wisely. Betrayal lurks in every corner.",
        flavorText: "The true nature of this prison begins to reveal itself...",
        slash: "Use ./number-game create/join/rule to play",
        access: "acquire 200 merits point to unlock",
        merit: 200
    }
};
exports.SANITY_EFFECTS = {
    glitchMessages: [
        "T̷̢̨̝͉̖̦̩̙̤͕̰͈͛̎̃̿̋̓̒͂̓̌͛̄̈́̍͑͂͗͒̔͋̌̒̂̈́͜͝͝h̵̞̺̪̳̱̭̠̫̜̰̉͛̓̆̏̐̒͘͝ȅ̷̙͚͔̗͓̪̟̂̓͗̃̾͋̽̿͂̉̾̈́̐̌̾͗̊̈́̀͒̅͜͝͝ ̷̧̛̛̛̭̣͚̯͈̥̰̫̼͔̪̤̯̪̬͓̜̹̎́̉͗̆̓̏͂̃͋̍̅͒̌̔͂̈́̑̾̈́̚͜͝͝w̷̢̧̛̠̟͖̺̲͎̜̳̯̩̻̖̘͚̥̻̥̗̺̦̪͙̞̓̉̔͑͆̊̆̃̈́̃̉̈́̑̓̃̓̈́͊͜͠ą̴̧̡̧̢̨̛̛̻̮̮̝͉̲̲̥̯͕͈͈̝̥̹͓̞͚̹̠̬̯̠̰̖̫̥̱̣͒̂̅̋̈́͛̚͜ͅl̶̡̢̻̪̲̠̤̹̟͉̱͖͙͎̱̠̯̣͚̜̈́͜ͅl̸̨̧̛̛̦̣̟̮̯̮̜͎̩̭̤̩̭͍̱̫͎̘̯͍͈͚̠̩̯̩̱̦̹͉̺̈́̃̈́͗̍͒̓̈́̑̋̍͌̑̒̐͒͌̎͘͜͜͝͠ͅs̶̨̡̧̻̗̼͓̯͓̘̼̤͖̘͔͎̳̤̮͚͔̥͖̻̄͌̎̏͂̈́̌́̊̄̈́̑͛̍̋̎̄̀͑̉̓̓̔͗̅̎̕̚̚̚͜͠͠͝ ̶̲̤͇̋̋̄̔̉̓͆̐̉͆̽̈́̆̌̈͘̕̕͝͝͝͝a̴̧̛̪̞̝̩̰͖̖͖͍͚̮̞̫̰͉̭̥̝̹̗͗̍͑̌͗̾̽̇̄̎̓̋̐͝͝͝ͅr̷̛̬̳̈́̽̃̈́̽̃̆̊̎̃̈́͗̄͆̓͋̎̓̄̉̑̓͛̿̌̾̒̚͝͝ḙ̵̢̡̛͖̝̦͓̠̯̳͚̰̩̫͚̳̘̱̳̝̝̪̪̝͚̰͖̺͈͈̤̺͈̘̈́̅̄͐̃̒͋̂̒̉͗̃͂́̀̍̑͐̈́̌̈̋̂̈́̚̕͜͝͠͝͠ͅ ̸̨̢̨̡̛̛͚̹̺̦͔͉͔̪̗̭͖̲̗͔̘̗̦̱̖̪͖̯͍̣̤͙̺̟̗͖͑̉̉̈́͂̎̾̅̿̍̈́̃͊̿̃̉̊͘͞͝͝ͅͅç̵̧̩͇̪̱̰̙͓̜͖̜̼͍̥͕̰͓̤͔̙ͱ̹̩̫̮̞̹̝̣̬̽̌͐͆̄̇̓̃͊̐͝ļ̷̟̦͍̘͖̣̳̲͕͔̝̪̮͕̲̣̬̱̟̥̯̲̭̪̤̰̥͗̇̚͜͜ͅō̵̢̜̦̙̰̟̟̺̜͙̲̮̗̤̜̺͖͓̎̎̄̑̾̿̓̾̂͌̎̈͌͑͂̄͜͠͝ṡ̸̨̨̢̛̹̘͇͇̮͔̥͍̯̳̘̥̤̗̖̘̟̩̭͎̥̖̝͍̣̭̺̍̔̓̆̈̑̄̈́̈̊̔̆̈̎̾̕͜͝ͅͅỉ̵̡̧̧̲̘͕̰͖̦̩̱̣̣̩̜̝̫̄̿̑̈́͒̓̐̔̉̎̏͜͠ͅn̵̡̢̢̢̨̨̧̯̰̦̰̪̙̫̻̱͓̦̬̼̬̼̫̘̗͔̭̣̫̙̲̼̭̝̉̌͑̓͑̿̏̔̒̀̏̈̿͗̑͛͊͗̈̓͗͐́̿̓͊͌̕͘̕͝͝ģ̸̢̥͙͇̻̭̼̣͐̿̇͂̓̏̋͌̒͗̅̍̍͐̒̕̚͝ ̶̛̬͙̝̣̩̺̹͚̻̐̊̾̍̾̈́̊̈́̌̈́̃͛̑̈̎̎̒̈́͘̕͘͘̚͝į̶̢̛̛̘͙̱̯̺͈̠͗́͂̋͗̈́͋̏̈́̅͑͋̏̾̆͌̓̃̈́̒̎̋̊̚͜͝͝͠͝n̷̛̤̖̰̝̣̹͛̊͆̊͑̿̓̊̍̊̾̿̈́͋̊̂̾̆͆̆͒̍̒̂͝͝...",
        "Do you see them too? The shadows that move when you're not looking?",
        "W̷̧̛h̴͎̓y̷̢̛ ̶͈̈́d̶͕̏ȍ̷͜ ̶͎͝t̵̰̾h̷͍̆e̶͇͝ỳ̷̟ ̶͍̈́k̴͕̾ȇ̶̲e̷̲̓p̷̣̈́ ̴̲̆w̶͖̆a̷͔͑t̵̥͆c̵̮̈́h̷̳͌i̵̭̓n̴͕̈́g̷̣̈?̸̦̇",
        "The numbers... they're speaking to me...",
        "ERROR: Reality breach detected"
    ],
    visualEffects: {
        low: "subtle-distortion",
        medium: "screen-glitch",
        critical: "severe-corruption"
    }
};
exports.RANKS = {
    novice: {
        title: "🔰 Novice Escapist",
        requirement: { meritPoints: 0, sanity: 0 }
    },
    survivor: {
        title: "⚔️ Prison Survivor",
        requirement: { meritPoints: 100, sanity: 60 }
    },
    strategist: {
        title: "🎯 Master Strategist",
        requirement: { meritPoints: 250, sanity: 70 }
    },
    veteran: {
        title: "🛡️ Escape Veteran",
        requirement: { meritPoints: 500, sanity: 80 }
    },
    mastermind: {
        title: "👑 Prison Mastermind",
        requirement: { meritPoints: 1000, sanity: 90 }
    }
};
exports.PUZZLE_REWARDS = {
    easy: {
        success: { meritPoints: 10, sanity: 5 },
        failure: { meritPoints: -5, sanity: -3 }
    },
    medium: {
        success: { meritPoints: 20, sanity: 8 },
        failure: { meritPoints: -10, sanity: -5 }
    },
    hard: {
        success: { meritPoints: 30, sanity: 12 },
        failure: { meritPoints: -15, sanity: -8 }
    },
    judas: {
        traitor: {
            success: { meritPoints: 50, sanity: 15, suspicion: 25 },
            failure: { meritPoints: -50, sanity: -20, suspicion: 25 }
        },
        innocent: {
            success: { meritPoints: 30, sanity: 10 },
            failure: { meritPoints: -30, sanity: -15, suspicion: 20 }
        }
    }
};
function createProgressBar(value, max, options = {}) {
    const length = options.length || 10;
    const chars = options.chars || { empty: '▱', filled: '▰' };
    if (max <= 0)
        return chars.empty.repeat(length);
    if (value <= 0)
        return chars.empty.repeat(length);
    const percentage = Math.min(Math.max(value / max, 0), 1);
    const filledBlocks = Math.round(percentage * length);
    return `${chars.filled.repeat(filledBlocks)}${chars.empty.repeat(length - filledBlocks)}`;
}
//# sourceMappingURL=GAME_CONSTANTS.js.map