"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const user_status_1 = require("../model/user_status");
class UserService {
    static async getUserData(discordId, member) {
        try {
            let userData = await user_status_1.User.findOne({ discordId });
            return userData;
        }
        catch (error) {
            console.error("Error accessing user data:", error);
            return null;
        }
    }
    static async createNewUser(discordId, username) {
        try {
            const newUser = new user_status_1.User({
                discordId,
                username,
                joinedAt: new Date(),
                survivalDays: 1,
                sanity: 100,
                meritPoints: 0,
                suspiciousLevel: 0,
                inventory: [],
                exploredRooms: [],
                achievements: []
            });
            await newUser.save();
            return newUser;
        }
        catch (error) {
            console.error("Error creating new user:", error);
            return null;
        }
    }
    static async addToInventory(userId, itemId, name, quantity = 1) {
        try {
            const user = await user_status_1.User.findOne({ discordId: userId });
            if (!user)
                return false;
            const existingItemIndex = user.inventory.findIndex(item => item.itemId === itemId);
            if (existingItemIndex >= 0) {
                user.inventory[existingItemIndex].quantity += quantity;
            }
            else {
                user.inventory.push({
                    itemId,
                    name,
                    quantity,
                    acquiredAt: new Date()
                });
            }
            await user.save();
            return true;
        }
        catch (error) {
            console.error("Error adding item to inventory:", error);
            return false;
        }
    }
    static getFormattedInventory(userData) {
        return userData.inventory.map(item => `${item.name} (${item.quantity})`);
    }
    static async updateUserStats(userId, updates) {
        try {
            const user = await user_status_1.User.findOneAndUpdate({ discordId: userId }, { $set: updates }, { new: true });
            return user;
        }
        catch (error) {
            console.error("Error updating user stats:", error);
            return null;
        }
    }
    static async recordDailyLogin(userId) {
        try {
            const user = await user_status_1.User.findOneAndUpdate({ discordId: userId }, {
                lastLogin: new Date(),
                $inc: { survivalDays: 1 }
            }, { new: true });
            return user;
        }
        catch (error) {
            console.error("Error updating daily login:", error);
            return null;
        }
    }
    static async addAchievement(userId, achievement) {
        try {
            const user = await user_status_1.User.findOne({ discordId: userId });
            if (!user)
                return false;
            if (!user.achievements.includes(achievement)) {
                user.achievements.push(achievement);
                await user.save();
            }
            return true;
        }
        catch (error) {
            console.error("Error adding achievement:", error);
            return false;
        }
    }
    static async updatePuzzleProgress(userId, puzzleId, completed) {
        try {
            const user = await user_status_1.User.findOne({ discordId: userId });
            if (!user)
                return null;
            const puzzleProgress = user.puzzleProgress.find(p => p.puzzleId === puzzleId);
            if (puzzleProgress) {
                if (completed) {
                    puzzleProgress.completed = true;
                    puzzleProgress.completionCount += 1;
                }
                puzzleProgress.lastPlayed = new Date();
            }
            else {
                user.puzzleProgress.push({
                    puzzleId,
                    completed,
                    completionCount: completed ? 1 : 0,
                    lastPlayed: new Date()
                });
            }
            await user.save();
            return user;
        }
        catch (error) {
            console.error("Error updating puzzle progress:", error);
            return null;
        }
    }
}
exports.UserService = UserService;
//# sourceMappingURL=user_services.js.map