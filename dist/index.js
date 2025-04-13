"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.client = void 0;
const tslib_1 = require("tslib");
require("dotenv/config");
const handler_1 = require("./handler");
const Mongoose = tslib_1.__importStar(require("mongoose"));
exports.client = new handler_1.ExtendedClient({
    intents: handler_1.AutomaticIntents,
    features: [handler_1.Features.All],
    disabledFeatures: [],
    uploadCommands: true,
});
(async () => {
    Mongoose.set('strictQuery', false);
    await Mongoose.connect(process.env.MONGO_DB);
    console.log("connected to DB.");
    await exports.client.login(process.env.CLIENT_TOKEN);
})();
//# sourceMappingURL=index.js.map