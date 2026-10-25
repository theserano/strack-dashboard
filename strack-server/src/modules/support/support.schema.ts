import { Schema, model, Document, Types } from 'mongoose';
import { TICKET_CATEGORIES, TICKET_STATUSES } from './support.constants';

// Mirrors the client SupportTicket (strack-client/src/lib/data/types.ts); reply.date is exposed as `date`.
export interface ITicketReply {
  _id: Types.ObjectId;
  message: string;
  from: 'user' | 'support';
  date: Date;
}

export interface ITicket extends Document {
  owner: Types.ObjectId;
  subject: string;
  category: (typeof TICKET_CATEGORIES)[number];
  message: string;
  status: (typeof TICKET_STATUSES)[number];
  replies: ITicketReply[];
  createdAt: Date;
  updatedAt: Date;
}

const replySchema = new Schema<ITicketReply>({
  message: { type: String, required: true },
  from: { type: String, enum: ['user', 'support'], required: true },
  date: { type: Date, default: () => new Date() },
});

const ticketSchema = new Schema<ITicket>(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    subject: { type: String, required: true, trim: true },
    category: { type: String, enum: TICKET_CATEGORIES, required: true },
    message: { type: String, required: true },
    status: { type: String, enum: TICKET_STATUSES, default: 'open' },
    replies: { type: [replySchema], default: [] },
  },
  { timestamps: true }
);

ticketSchema.index({ owner: 1, createdAt: -1 });

export const TicketModel = model<ITicket>('SupportTicket', ticketSchema);
