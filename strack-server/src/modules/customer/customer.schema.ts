import { Schema, model, Document, Types } from 'mongoose';

// Mirrors the client Customer type (strack-client/src/lib/data/types.ts). Schema only for now.
export interface ICustomer extends Document {
  owner: Types.ObjectId;
  name: string;
  email: string;
  phone?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const customerSchema = new Schema<ICustomer>(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);

customerSchema.index({ owner: 1, createdAt: -1 });
// One customer per email per owner (emails are stored lowercase).
customerSchema.index({ owner: 1, email: 1 }, { unique: true });

export const CustomerModel = model<ICustomer>('Customer', customerSchema);
