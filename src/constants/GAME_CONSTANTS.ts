import { ColorResolvable, EmbedBuilder } from 'discord.js';

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
        access: "acquire 100 merits point to unlock",
        merit: 100
    },
    matchingpairs: {
        name: "🎴 Memory Test",
        description: "Match the patterns, but be quick - your mind plays tricks in this place.",
        flavorText: "The symbols dance before your eyes. Are they changing, or is it just your imagination?",
        slash: "Use ./matching to play",
        access: "acquire 200 merits point to unlock",
        merit: 200
    },
    UNO: {
        name: "🃏 Digital Card Protocol",
        description: "A seemingly innocent card game that tests your strategic thinking.",
        flavorText: "Even a simple game of cards feels sinister in this place...",
        slash: "Use ./uno to play",
        access: "acquire 300 merits point to unlock",
        merit: 300
    },
    "numbers-game-command": {
        name: "🔢 The Numbers Protocol",
        description: "Trust no one. Choose your numbers wisely. Betrayal lurks in every corner.",
        flavorText: "The true nature of this prison begins to reveal itself...",
        slash: "Use ./number-game create/join/rule to play",
        access: "acquire 400 merits point to unlock",
        merit: 400
    }
};

export const SANITY_EFFECTS = {
  glitchMessages: [
    'T̷h̵e̴ ̷w̴a̷l̸l̵s̷ ̴w̶a̵t̸c̸h̷.̵.̶.',
    `S̵h̵a̴d̸o̵w̷s̶ ̷w̶h̵i̷s̶p̶e̸r̷.̵.̶.`,
    `T̷h̵e̷y̵'̸r̵e̸ ̴c̷o̵m̷i̵n̵g̷.̴.̷.`,
    `D̵o̶n̷'̸t̴ ̶t̵r̷u̸s̵t̴ ̷t̸h̵e̷m̵.̶.̶.`,
    `Y̶o̸u̵r̴ ̶m̸i̸n̷d̸ ̶b̸e̷t̵r̸a̸y̵s̸ ̴y̵o̷u̶.̷.̷.`,
    'R̵e̷a̸l̴i̷t̸y̶ ̷b̶e̵n̷d̸s̵.̸.̶.',
    'T̸i̸m̴e̵ ̵f̸r̸a̴c̷t̵u̷r̷e̸s̵.̶.̶.',
    `D̵o̶n̷'̸t̴ ̶l̵o̵o̶k̶ ̴b̸e̵h̸i̸n̷d̵.̵.̶.`,
    'E̶s̵c̸a̴p̸e̷ ̴i̸s̴ ̵a̸n̷ ̵i̸l̶l̷u̷s̵i̸o̸n̷.̶.̶. '
  ],
  visualDistortions: {
    mild: ['🌀', '👁️', '⚡', '💀', '🕯️', '🎭'],
    severe: ['⛧', '❌', '⚠️', '☠️', '🔪', '👻'],
    symbols: ['҉', '̷', '̵', '̴', '̶', '̸']
  },
  hallucinations: {
    messages: [
      'Did that symbol just move?',
      'The cards are watching you...',
      'Your reflection blinks...',
      'Shadows dance at the corners...',
      'Time flows backwards...',
      'Reality glitches...'
    ],
    distortCards: (text: string, sanity: number): string => {
      if (sanity > 70) return text;
      
      const intensity = (100 - sanity) / 100;
      const symbols = SANITY_EFFECTS.visualDistortions.symbols;
      
      return text.split('').map(char => {
        if (Math.random() < intensity * 0.3) {
          const symbol = symbols[Math.floor(Math.random() * symbols.length)];
          return char + symbol;
        }
        if (Math.random() < intensity * 0.2) {
          return SANITY_EFFECTS.visualDistortions[sanity < 30 ? 'severe' : 'mild'][
            Math.floor(Math.random() * SANITY_EFFECTS.visualDistortions[sanity < 30 ? 'severe' : 'mild'].length)
          ];
        }
        return char;
      }).join('');
    }
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
    success: { meritPoints: 8, sanity: 2 },
    failure: { meritPoints: -15, sanity: -8, suspicion: 10 }
  },
  medium: {
    success: { meritPoints: 15, sanity: 3 },
    failure: { meritPoints: -20, sanity: -12, suspicion: 15 }
  },
  hard: {
    success: { meritPoints: 25, sanity: 5 },
    failure: { meritPoints: -30, sanity: -15, suspicion: 20 }
  }
};

// Add global interaction error handler
export const handleInteractionError = async (error: any, interaction: any) => {
  console.error('Interaction error:', error);
  
  try {
    const errorEmbed = new EmbedBuilder()
      .setColor(PRISON_COLORS.danger)
      .setTitle('⚠️ System Malfunction')
      .setDescription('A critical error occurred in the prison systems.')
      .setFooter({ text: 'The walls remember your failure...' });

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({
        embeds: [errorEmbed],
        components: [],
        ephemeral: true
      });
    } else {
      await interaction.reply({
        embeds: [errorEmbed],
        ephemeral: true
      });
    }
  } catch (followupError) {
    console.error('Error handling interaction error:', followupError);
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