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
                const users = await User.find();
                
                // Decrease suspicion for each user
                for (const user of users) {
                    // Decrease by 1, but don't go below 0

                    user.suspiciousLevel = Math.max(0, user.suspiciousLevel - 5);
                    user.sanity = Math.min(100, user.sanity + 2);
                    if(user.suspiciousLevel > 50){
                        user.isInIsolation = true;
                    }else{
                        user.isInIsolation = false;
                    }
                    await user.save();
                
                }
            } catch (error) {
                console.error('Error updating suspicion levels:', error);
            }
        },60000); // 2 minutes

        console.log('Suspicion decay system initialized');
    }
});