import { Schema, model } from "mongoose";

const UserShema = new Schema({
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
        acquiredAt: Date,
      },
    ],
  
    lastGame: {
      type: String, 
      result: String, 
      playedAt: Date,
    },
  
    // Exploration and flags
    exploredRooms: [String], 
    achievements: [String], 
  
    isInIsolation: { type: Boolean, default: false },
    bannedUntil: { type: Date, default: null },
  
    deviceActivated: { type: Boolean, default: false },
    lastLogin: { type: Date, default: Date.now },
});
export const User = model("User", UserShema);
