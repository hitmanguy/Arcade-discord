import { Events } from 'discord.js';
import { Event } from '../handler';
import { User } from '../model/user_status';

export default new Event({
    name: Events.ClientReady,
    once: true,
    async execute() {
        // Set up interval to run every 2 minutes (120000 ms)
        setInterval(async () => {
            try {
                // Find all users with suspicion > 0
                const users = await User.find({ suspiciousLevel: { $gt: 0 } });
                
                // Decrease suspicion for each user
                for (const user of users) {
                    // Decrease by 1, but don't go below 0
                    user.suspiciousLevel = Math.max(0, user.suspiciousLevel - 1);
                    await user.save();
                
                }
            } catch (error) {
                console.error('Error updating suspicion levels:', error);
            }
        },300000); // 2 minutes

        console.log('Suspicion decay system initialized');
    }
});