import { Schema, model, Document, Types } from 'mongoose';

// Mirrors the client PaymentLink type (strack-client/src/lib/data/types.ts).
export const PAYMENT_LINK_STATUSES = ['active', 'disabled'] as const;

export interface IPaymentLink extends Document {
  owner: Types.ObjectId;
  title: string;
  /** Integer kobo. Omitted for an open-amount link. */
  amount?: number;
  description?: string;
  status: (typeof PAYMENT_LINK_STATUSES)[number];
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

const paymentLinkSchema = new Schema<IPaymentLink>(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    amount: {
      type: Number,
      min: 1,
      validate: { validator: Number.isInteger, message: 'amount must be an integer number of kobo' },
    },
    description: { type: String },
    status: { type: String, enum: PAYMENT_LINK_STATUSES, required: true, default: 'active' },
    slug: { type: String, required: true },
  },
  { timestamps: true }
);

paymentLinkSchema.index({ owner: 1, createdAt: -1 });
// Slugs are unique per owner.
paymentLinkSchema.index({ owner: 1, slug: 1 }, { unique: true });

export const PaymentLinkModel = model<IPaymentLink>('PaymentLink', paymentLinkSchema);
