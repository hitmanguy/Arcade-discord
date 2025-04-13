"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseCommand = void 0;
class BaseCommand {
    userCooldown;
    guildCooldown;
    globalCooldown;
    allowedUsers;
    blockedUsers;
    optionalAllowedUsers;
    allowedChannels;
    blockedChannels;
    optionalAllowedChannels;
    allowedCategories;
    blockedCategories;
    optionalAllowedCategories;
    allowedGuilds;
    blockedGuilds;
    optionalAllowedGuilds;
    allowedRoles;
    blockedRoles;
    optionalAllowedRoles;
    restrictedToOwner;
    restrictedToNSFW;
    isDisabled;
    logUsage;
    constructor(args = {}) {
        Object.assign(this, args);
    }
}
exports.BaseCommand = BaseCommand;
//# sourceMappingURL=BaseCommand.js.map