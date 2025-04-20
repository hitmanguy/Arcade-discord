import { ColorResolvable } from 'discord.js';

// src/constants/GameConstants.ts

export const PRISON_COLORS = {
    primary: '#1a1a2e' as ColorResolvable,
    secondary: '#16213e' as ColorResolvable,
    accent: '#0f3460' as ColorResolvable,
    danger: '#e94560' as ColorResolvable,
    warning: '#f6b93b' as ColorResolvable,
    success: '#26de81' as ColorResolvable,
    info: '#4b7bec' as ColorResolvable,
    neutral: '#4f5868' as ColorResolvable
};

export const PRISON_AREAS = [
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

export const PRISON_SKILLS = [
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

export const STARTER_ITEMS = [
    { itemId: 'prison_uniform', name: 'Prison Uniform', quantity: 1 },
    { itemId: 'plastic_spoon', name: 'Plastic Spoon', quantity: 1 }
];

export const STORYLINE = {
    intro: "You wake up in a mysterious digital prison, your memories fragmented. The only way out? Complete a series of increasingly challenging trials that test your wit, trust, and sanity.",
    puzzles1: {
        name: "🔓 Basic Training",
        description: "Simple riddles and puzzles to test your mental acuity. The guards are watching...",
        flavorText: "The first test seems simple enough, but something feels off about this place..."
    },
    tunnel1: {
        name: "🚇 The Tunnel",
        description: "Navigate through a digital maze of patterns and sequences.",
        flavorText: "The deeper you go, the more the walls seem to shift and change..."
    },
    matchingpairs: {
        name: "🎴 Memory Test",
        description: "Match the patterns, but be quick - your mind plays tricks in this place.",
        flavorText: "The symbols dance before your eyes. Are they changing, or is it just your imagination?"
    },
    UNO: {
        name: "🃏 Digital Card Protocol",
        description: "A seemingly innocent card game that tests your strategic thinking.",
        flavorText: "Even a simple game of cards feels sinister in this place..."
    },
    "numbers-game-command": {
        name: "🔢 The Numbers Protocol",
        description: "Trust no one. Choose your numbers wisely. Betrayal lurks in every corner.",
        flavorText: "The true nature of this prison begins to reveal itself..."
    },
    Judas: {
        name: "👥 The Judas Protocol",
        description: "The final test. Unmask the traitor - or become one yourself.",
        flavorText: "Everything has led to this moment. But can you trust even yourself?"
    }
};

export const SANITY_EFFECTS = {
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

export const RANKS = {
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

export const PUZZLE_REWARDS = {
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

// Utility function for progress bars
export function createProgressBar(value: number, max: number, options: { length?: number; chars?: { empty: string; filled: string; } } = {}): string {
    // Default options
    const length = options.length || 10;
    const chars = options.chars || { empty: '▱', filled: '▰' };
    
    // Handle edge cases
    if (max <= 0) return chars.empty.repeat(length);
    if (value <= 0) return chars.empty.repeat(length);
    
    // Calculate percentage and number of filled blocks
    const percentage = Math.min(Math.max(value / max, 0), 1);
    const filledBlocks = Math.round(percentage * length);
    
    // Generate progress bar
    return `${chars.filled.repeat(filledBlocks)}${chars.empty.repeat(length - filledBlocks)}`;
}