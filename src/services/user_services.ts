import { User, UserDocument, InventoryItem } from '../model/user_status';
import { GuildMember } from 'discord.js';

export class UserService {
  static async getUserData(discordId: string, member?: GuildMember | null): Promise<UserDocument | null> {
    try {
      let userData = await User.findOne({ discordId });
      
      return userData;
    } catch (error) {
      console.error("Error accessing user data:", error);
      return null;
    }
  }

  static async createNewUser(discordId: string, username: string): Promise<UserDocument | null> {
    try {
      // Create a new user
      const newUser = new User({
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
    } catch (error) {
      console.error("Error creating new user:", error);
      return null;
    }
  }

  static async addToInventory(
    userId: string, 
    itemId: string, 
    name: string, 
    quantity: number = 1
  ): Promise<boolean> {
    try {
      const user = await User.findOne({ discordId: userId });
      if (!user) return false;

      const existingItemIndex = user.inventory.findIndex(item => item.itemId === itemId);
      
      if (existingItemIndex >= 0) {
        user.inventory[existingItemIndex].quantity += quantity;
      } else {
        user.inventory.push({
          itemId,
          name,
          quantity,
          acquiredAt: new Date()
        });
      }
      
      await user.save();
      return true;
    } catch (error) {
      console.error("Error adding item to inventory:", error);
      return false;
    }
  }

  static getFormattedInventory(userData: UserDocument): string[] {
    return userData.inventory.map(item => `${item.name} (${item.quantity})`);
  }

  static async updateUserStats(
    userId: string,
    updates: Partial<UserDocument>
  ): Promise<UserDocument | null> {
    try {
      const user = await User.findOneAndUpdate(
        { discordId: userId },
        { $set: updates },
        { new: true }
      );
      
      return user;
    } catch (error) {
      console.error("Error updating user stats:", error);
      return null;
    }
  }


  static async recordDailyLogin(userId: string): Promise<UserDocument | null> {
    try {
      const user = await User.findOneAndUpdate(
        { discordId: userId },
        { 
          lastLogin: new Date(),
          $inc: { survivalDays: 1 }
        },
        { new: true }
      );
      
      return user;
    } catch (error) {
      console.error("Error updating daily login:", error);
      return null;
    }
  }

  static async addAchievement(
    userId: string,
    achievement: string
  ): Promise<boolean> {
    try {
      const user = await User.findOne({ discordId: userId });
      if (!user) return false;
      
      // Only add if not already present
      if (!user.achievements.includes(achievement)) {
        user.achievements.push(achievement);
        await user.save();
      }
      
      return true;
    } catch (error) {
      console.error("Error adding achievement:", error);
      return false;
    }
  }

  static async updatePuzzleProgress(
    userId: string,
    puzzleId: string,
    completed: boolean
  ): Promise<UserDocument | null> {
    try {
      const user = await User.findOne({ discordId: userId });
      if (!user) return null;

      const puzzleProgress = user.puzzleProgress.find(p => p.puzzleId === puzzleId);
      
      if (puzzleProgress) {
        // Update existing puzzle progress
        if (completed) {
          puzzleProgress.completed = true;
          puzzleProgress.completionCount += 1;
        }
        puzzleProgress.lastPlayed = new Date();
      } else {
        // Add new puzzle progress
        user.puzzleProgress.push({
          puzzleId,
          completed,
          completionCount: completed ? 1 : 0,
          lastPlayed: new Date()
        });
      }

      await user.save();
      return user;
    } catch (error) {
      console.error("Error updating puzzle progress:", error);
      return null;
    }
  }
}