import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/** Future: image, video, file, voice, etc. */
export type MessageType = 'TEXT' | 'IMAGE' | 'FILE' | 'VIDEO' | 'VOICE';

/** Attachment for future media/files */
export interface IMessageAttachment {
  type: MessageType;
  url: string;
  filename?: string;
  mimeType?: string;
  size?: number;
}

/** Read receipt entry - future ready */
export interface IReadReceipt {
  userId: number;
  readAt: Date;
}

@Schema({ timestamps: true, collection: 'messages' })
export class Message extends Document {
  @Prop({ required: true, index: true })
  conversationId: number;

  @Prop({ required: true, index: true })
  senderId: number;

  @Prop({ required: true, default: 'TEXT' })
  type: MessageType;

  @Prop({ type: String, default: null })
  content: string | null;

  /** Future: media/file URLs (e.g. Cloudinary) */
  @Prop({ type: [Object], default: [] })
  attachments: IMessageAttachment[];

  /** Future: read receipts - who read and when */
  @Prop({ type: [Object], default: [] })
  readBy: IReadReceipt[];

  /** Optional: reply reference */
  @Prop({ type: String, default: null })
  replyToMessageId: string | null;

  @Prop({ default: false })
  deleted: boolean;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

MessageSchema.index({ conversationId: 1, createdAt: -1 });
