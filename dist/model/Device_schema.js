"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Device = void 0;
const mongoose_1 = require("mongoose");
const DeviceMessageSchema = new mongoose_1.Schema({
    sender: String,
    content: String,
    sentAt: { type: Date, default: Date.now },
    read: { type: Boolean, default: false }
});
const DeviceSchema = new mongoose_1.Schema({
    discordId: { type: String, required: true, unique: true },
    activated: { type: Boolean, default: false },
    conversation_id: { type: String, default: null },
    lastChecked: { type: Date, default: Date.now }
});
exports.Device = (0, mongoose_1.model)('Device', DeviceSchema);
//# sourceMappingURL=Device_schema.js.map