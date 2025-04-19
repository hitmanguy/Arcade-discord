// src/services/UserService.ts
import { User, UserDocument, InventoryItem } from '../model/user_status';
import { GuildMember } from 'discord.js';

export class UserService {
  /**
   * Get user data from the database
   */
  static async getUserData(discordId: string, member?: GuildMember | null): Promise<UserDocument | null> {
    try {
      // Find existing user or create new one
      let userData = await User.findOne({ discordId });
      
      // if (!userData && member) {
      //   userData = new User({
      //     discordId,
      //     username: member.user.username,
      //     joinedAt: new Date()
      //   });
      //   await userData.save();
      // }
      
      return userData;
    } catch (error) {
      console.error("Error accessing user data:", error);
      return null;
    }
  }

  /**
   * Create a new user in the database
   */
  static async createNewUser(discordId: string, username: string): Promise<UserDocument | null> {
    try {
      // Create a new user
      const newUser = new User({
        discordId,
        username,
        joinedAt: new Date(),
        // Default values for new inmates
        survivalDays: 1,
        sanity: 100,
        meritPoints: 0,
        suspiciousLevel: 0,
        // Empty arrays
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

  /**
   * Add items to user inventory
   */
  static async addToInventory(
    userId: string, 
    itemId: string, 
    name: string, 
    quantity: number = 1
  ): Promise<boolean> {
    try {
      const user = await User.findOne({ discordId: userId });
      if (!user) return false;

      // Check if item already exists in inventory
      const existingItemIndex = user.inventory.findIndex(item => item.itemId === itemId);
      
      if (existingItemIndex >= 0) {
        // Update existing item quantity
        user.inventory[existingItemIndex].quantity += quantity;
      } else {
        // Add new item
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

  /**
   * Get formatted inventory for display
   */
  static getFormattedInventory(userData: UserDocument): string[] {
    return userData.inventory.map(item => `${item.name} (${item.quantity})`);
  }

  /**
   * Update user stats
   */
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

  /**
   * Update daily login and increment survival days
   */
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

  /**
   * Add achievement to user profile
   */
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
}