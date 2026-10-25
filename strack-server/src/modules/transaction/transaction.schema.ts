import { Schema, model, Document, Types } from 'mongoose';

// Mirrors the client Transaction type (strack-client/src/lib/data/types.ts). Schema only for now.
export const TRANSACTION_TYPES = ['credit', 'debit'] as const;
export const TRANSACTION_STATUSES = ['successful', 'pending', 'failed'] as const;

export interface ITransaction extends Document {
  owner: Types.ObjectId;
  type: (typeof TRANSACTION_TYPES)[number];
  /** Integer kobo. */
  amount: number;
  status: (typeof TRANSACTION_STATUSES)[number];
  reference: string;
  channel?: string;
  description?: string;
  customerId?: Types.ObjectId;
  paymentLinkId?: Types.ObjectId;
  payoutId?: Types.ObjectId;
  note?: string;
  refundOf?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: TRANSACTION_TYPES, required: true },
    amount: {
      type: Number,
      required: true,
      min: 1,
      validate: { validator: Number.isInteger, message: 'amount must be an integer number of kobo' },
    },
    status: { type: String, enum: TRANSACTION_STATUSES, required: true },
    reference: { type: String, required: true },
    channel: { type: String },
    description: { type: String },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer' },
    paymentLinkId: { type: Schema.Types.ObjectId },
    payoutId: { type: Schema.Types.ObjectId },
    note: { type: String },
    refundOf: { type: Schema.Types.ObjectId, ref: 'Transaction' },
  },
  { timestamps: true }
);

transactionSchema.index({ owner: 1, createdAt: -1 });
transactionSchema.index({ owner: 1, reference: 1 }, { unique: true });
// Backstop for double refunds: at most one refund per original transaction.
transactionSchema.index(
  { owner: 1, refundOf: 1 },
  { unique: true, partialFilterExpression: { refundOf: { $type: 'objectId' } } }
);

export const TransactionModel = model<ITransaction>('Transaction', transactionSchema);
