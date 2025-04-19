// src/constants/GameConstants.ts

export const PRISON_COLORS = {
    primary: '#1a1a2e',
    secondary: '#16213e',
    accent: '#0f3460',
    danger: '#e94560',
    warning: '#f6b93b',
    success: '#26de81',
    info: '#4b7bec',
    neutral: '#4f5868'
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
  
  // Utility function for progress bars
  export function createProgressBar(value: number, max: number): string {
    const percentage = Math.min(Math.max(value / max, 0), 1);
    const filledBlocks = Math.round(percentage * 10);
    
    return `${'█'.repeat(filledBlocks)}${'░'.repeat(10 - filledBlocks)}`;
  }