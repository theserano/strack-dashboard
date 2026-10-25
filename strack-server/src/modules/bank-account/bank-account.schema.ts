import { Schema, model, Document, Types } from 'mongoose';

// Mirrors the client BankAccount type (strack-client/src/lib/data/types.ts).
export interface IBankAccount extends Document {
  owner: Types.ObjectId;
  bankName: string;
  accountNumber: string;
  accountName: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const bankAccountSchema = new Schema<IBankAccount>(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    bankName: { type: String, required: true },
    accountNumber: { type: String, required: true },
    accountName: { type: String, required: true, trim: true },
    isDefault: { type: Boolean, required: true, default: false },
  },
  { timestamps: true }
);

bankAccountSchema.index({ owner: 1, createdAt: -1 });
bankAccountSchema.index({ owner: 1, accountNumber: 1, bankName: 1 }, { unique: true });
// Backstop: at most one default account per owner.
bankAccountSchema.index({ owner: 1 }, { unique: true, partialFilterExpression: { isDefault: true } });

export const BankAccountModel = model<IBankAccount>('BankAccount', bankAccountSchema);
