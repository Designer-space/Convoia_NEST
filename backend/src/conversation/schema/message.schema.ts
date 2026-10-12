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

@Schema({ timestamps: true, collection: 'messages' })
export class Message extends Document {
  @Prop({ required: true, index: true })
  conversationId: number;

  @Prop({ required: true, index: true })
  senderId: number;

  /** Monotonic, per-conversation ordering key. */
  @Prop({ required: true })
  seq: number;

  /** Client-generated idempotency key so retries don't duplicate messages. */
  @Prop({ type: String, default: null })
  clientMsgId: string | null;

  @Prop({ required: true, default: 'TEXT' })
  type: MessageType;

  @Prop({ type: String, default: null })
  content: string | null;

  /** Future: media/file URLs (e.g. Cloudinary) */
  @Prop({ type: [Object], default: [] })
  attachments: IMessageAttachment[];

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

// Primary pagination index: newest-first within a conversation by seq.
MessageSchema.index({ conversationId: 1, seq: -1 });
// Idempotency: a sender cannot store two messages with the same client id.
MessageSchema.index(
  { conversationId: 1, senderId: 1, clientMsgId: 1 },
  {
    unique: true,
    partialFilterExpression: { clientMsgId: { $type: 'string' } },
  },
);
