"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SlashCommand = void 0;
const BaseCommand_1 = require("../base/BaseCommand");
const RegisterType_1 = require("../../types/RegisterType");
class SlashCommand extends BaseCommand_1.BaseCommand {
    registerType;
    data;
    execute;
    autocomplete;
    constructor(options) {
        super(options);
        this.data = options.data;
        this.registerType = options.registerType ?? RegisterType_1.RegisterType.Guild;
        this.execute = options.execute;
        this.autocomplete = options.autocomplete;
    }
}
exports.SlashCommand = SlashCommand;
//# sourceMappingURL=SlashCommand.js.map