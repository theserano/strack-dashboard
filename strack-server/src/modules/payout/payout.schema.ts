import { Schema, model, Document, Types } from 'mongoose';

// Mirrors the client Payout type (strack-client/src/lib/data/types.ts).
export const PAYOUT_STATUSES = ['successful', 'pending', 'failed'] as const;

export interface IPayout extends Document {
  owner: Types.ObjectId;
  /** Integer kobo, excluding the fee. */
  amount: number;
  /** Integer kobo. */
  fee: number;
  status: (typeof PAYOUT_STATUSES)[number];
  reference: string;
  bankAccountId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const payoutSchema = new Schema<IPayout>(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 1, validate: { validator: Number.isInteger, message: 'amount must be an integer number of kobo' } },
    fee: { type: Number, required: true, min: 0, validate: { validator: Number.isInteger, message: 'fee must be an integer number of kobo' } },
    status: { type: String, enum: PAYOUT_STATUSES, required: true },
    reference: { type: String, required: true },
    bankAccountId: { type: Schema.Types.ObjectId, ref: 'BankAccount', required: true },
  },
  { timestamps: true }
);

payoutSchema.index({ owner: 1, createdAt: -1 });
payoutSchema.index({ owner: 1, bankAccountId: 1 });

export const PayoutModel = model<IPayout>('Payout', payoutSchema);
