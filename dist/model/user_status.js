"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const mongoose_1 = require("mongoose");
const UserSchema = new mongoose_1.Schema({
    discordId: { type: String, required: true, unique: true },
    username: { type: String },
    joinedAt: { type: Date, default: Date.now },
    survivalDays: { type: Number, default: 3 },
    sanity: { type: Number, default: 100 },
    meritPoints: { type: Number, default: 0 },
    suspiciousLevel: { type: Number, default: 0 },
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
exports.User = (0, mongoose_1.model)("User", UserSchema);
//# sourceMappingURL=user_status.js.map