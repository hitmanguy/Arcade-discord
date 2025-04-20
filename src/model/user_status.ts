// src/models/User.ts
import { Schema, model, Document } from "mongoose";

export interface InventoryItem {
  itemId: string;
  name: string;
  quantity: number;
  acquiredAt: Date;
}

export interface GameRecord {
  type: string;
  result: string;
  playedAt: Date;
}

interface PuzzleProgress {
  puzzleId: string;
  completed: boolean;
  completionCount: number;
  lastPlayed: Date;
}

export interface UserDocument extends Document {
  discordId: string;
  username: string;
  joinedAt: Date;
  
  // Core stats
  survivalDays: number;
  sanity: number;
  meritPoints: number;
  suspiciousLevel: number;
  
  // Progress
  totalGamesPlayed: number;
  totalGamesWon: number;
  currentStreak: number;
  
  inventory: InventoryItem[];
  lastGame: GameRecord;
  
  // Exploration and flags
  exploredRooms: string[];
  achievements: string[];
  
  isInIsolation: boolean;
  bannedUntil: Date | null;
  
  deviceActivated: boolean;
  lastLogin: Date;

  puzzleProgress: PuzzleProgress[];
  currentPuzzle: string;
  completedAllPuzzles: boolean;
}

const UserSchema = new Schema<UserDocument>({
  discordId: { type: String, required: true, unique: true },
  username: { type: String },
  joinedAt: { type: Date, default: Date.now },
  
  // Core stats
  survivalDays: { type: Number, default: 3 },
  sanity: { type: Number, default: 100 },
  meritPoints: { type: Number, default: 0 },
  suspiciousLevel: { type: Number, default: 0 },
  
  // Progress
  totalGamesPlayed: { type: Number, default: 0 },
  totalGamesWon: { type: Number, default: 0 },
  currentStreak: { type: Number, default: 0 },
  
  inventory: [
    {
      itemId: String,
      name: String,
      quantity: Number,
      acquiredAt: { type: Date, default: Date.now }
    }
  ],
  
  lastGame: {
    type: String,
    result: String,
    playedAt: { type: Date }
  },
  
  // Exploration and flags
  exploredRooms: [String],
  achievements: [String],
  
  isInIsolation: { type: Boolean, default: false },
  bannedUntil: { type: Date, default: null },
  
  deviceActivated: { type: Boolean, default: false },
  lastLogin: { type: Date, default: Date.now },

  puzzleProgress: [{
    puzzleId: String,
    completed: { type: Boolean, default: false },
    completionCount: { type: Number, default: 0 },
    lastPlayed: { type: Date }
  }],
  currentPuzzle: { type: String, default: 'puzzles1' },
  completedAllPuzzles: { type: Boolean, default: false },
});

export const User = model<UserDocument>("User", UserSchema);