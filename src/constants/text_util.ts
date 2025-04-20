// src/utils/textUtils.ts

/**
 * Creates a glitchy text effect for players with low sanity
 */
export function glitchText(text: string): string {
    // Characters that will be substituted randomly to create glitch effect
    const glitchChars = ['̷', '̸', '̵', '̶', '̴', '̢', '̛', '̤', '̩', '̳', '̺'];
    
    // Zalgo-like effect to simulate glitchy text
    let result = '';
    for (const char of text) {
      result += char;
      
      // Add random glitch characters with a certain probability
      if (Math.random() < 0.3) {
        const numGlitches = Math.floor(Math.random() * 3) + 1;
        for (let i = 0; i < numGlitches; i++) {
          const glitchChar = glitchChars[Math.floor(Math.random() * glitchChars.length)];
          result += glitchChar;
        }
      }
      
      // Randomly add spaces or repeat characters
      if (Math.random() < 0.1) {
        result += char.repeat(Math.floor(Math.random() * 2) + 1);
      }
    }
    
    // Add random block characters at the end
    if (Math.random() < 0.5) {
      result += ' ▓▒░▒▓';
    }
    
    return result;
  }
  
  /**
   * Formats time in seconds to MM:SS format
   */
  export function formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }