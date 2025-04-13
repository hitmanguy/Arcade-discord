"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrefixCommand = void 0;
const BaseCommand_1 = require("../base/BaseCommand");
class PrefixCommand extends BaseCommand_1.BaseCommand {
    name;
    aliases;
    execute;
    constructor(options) {
        super(options);
        this.name = options.name;
        this.aliases = options.aliases;
        this.execute = options.execute;
    }
}
exports.PrefixCommand = PrefixCommand;
//# sourceMappingURL=PrefixCommand.js.map