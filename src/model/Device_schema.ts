import { Schema, model, Document } from 'mongoose';

export interface DeviceMessage {
  sender: string;
  content: string;
  sentAt: Date;
  read: boolean;
}

export interface DeviceDocument extends Document {
  discordId: string;
  activated: boolean;
  conversation_id: string | null;
  lastChecked: Date;
}

const DeviceMessageSchema = new Schema<DeviceMessage>({
  sender: String,
  content: String,
  sentAt: { type: Date, default: Date.now },
  read: { type: Boolean, default: false }
});

const DeviceSchema = new Schema<DeviceDocument>({
  discordId: { type: String, required: true, unique: true },
  activated: { type: Boolean, default: false },
  conversation_id: {type: String, default: null},
  lastChecked: { type: Date, default: Date.now }
});

export const Device = model<DeviceDocument>('Device', DeviceSchema);