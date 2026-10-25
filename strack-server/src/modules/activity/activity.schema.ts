import { Schema, model, Document, Types } from 'mongoose';

// Mirrors the client ActivityEvent (strack-client/src/lib/data/types.ts); createdAt is exposed as `date`.
export interface IActivity extends Document {
  owner: Types.ObjectId;
  action: string;
  entity: string;
  entityId: string;
  description: string;
  createdAt: Date;
}

const activitySchema = new Schema<IActivity>(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true },
    entity: { type: String, required: true },
    entityId: { type: String, required: true },
    description: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

activitySchema.index({ owner: 1, createdAt: -1 });

export const ActivityModel = model<IActivity>('Activity', activitySchema);
