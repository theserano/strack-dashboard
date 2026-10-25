import { Schema, model, Document, Types } from "mongoose";

export interface BaseUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  accountType: "individual" | "business";
  dob?: Date;
  bvn?: string;
  businessName?: string;
  businessEmail?: string;
  rcNumber?: string;
  businessType?: string;
  industry?: string;
  businessAddress?: string;
  documents?: Partial<Record<DocumentType, StoredDocument>>;
  complianceStatus: ComplianceStatus;
  verified: boolean;
  /** Bumped on password change; tokens carrying an older value are rejected. */
  tokenVersion?: number;
  settings?: {
    notifications?: { emailOnPayment?: boolean; emailOnPayout?: boolean; weeklySummary?: boolean };
    theme?: 'light' | 'dark' | 'system';
  };
}

export const DEFAULT_SETTINGS = {
  notifications: { emailOnPayment: true, emailOnPayout: true, weeklySummary: false },
  theme: 'light' as 'light' | 'dark' | 'system',
};

export const DOCUMENT_TYPES = ["cac", "memorandum", "utility", "validId"] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const COMPLIANCE_STATUSES = ["not_started", "in_progress", "pending_review", "approved", "rejected"] as const;
export type ComplianceStatus = (typeof COMPLIANCE_STATUSES)[number];

export interface StoredDocument {
  fileId: Types.ObjectId; // GridFS file in the "documents" bucket
  filename: string;
  mimeType: string;
  size: number;
  uploadedAt: Date;
}

const storedDocumentSchema = new Schema<StoredDocument>(
  {
    fileId: { type: Schema.Types.ObjectId, required: true },
    filename: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedAt: { type: Date, required: true },
  },
  { _id: false }
);

const baseUserSchema = new Schema<BaseUser>(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: { type: String, required: true, unique: true },
    password: { type: String, required: true },

    accountType: {
      type: String,
      enum: ["individual", "business"],
      required: true,
    },

    // Compliance (KYC) details
    dob: { type: Date },
    bvn: { type: String },
    // Business details step (every account type fills these in)
    businessName: { type: String },
    businessEmail: { type: String, lowercase: true },
    rcNumber: { type: String },
    businessType: { type: String },
    industry: { type: String },
    businessAddress: { type: String },
    documents: {
      type: new Schema(
        Object.fromEntries(DOCUMENT_TYPES.map((t) => [t, { type: storedDocumentSchema }])),
        { _id: false }
      ),
      default: {},
    },
    complianceStatus: {
      type: String,
      enum: COMPLIANCE_STATUSES,
      default: "not_started",
    },
    verified: { type: Boolean, default: false },
    tokenVersion: { type: Number, default: 0 },
    // Currency is fixed to NGN and not stored. Missing on older accounts: the settings service fills defaults.
    settings: {
      type: new Schema(
        {
          notifications: {
            emailOnPayment: { type: Boolean, default: DEFAULT_SETTINGS.notifications.emailOnPayment },
            emailOnPayout: { type: Boolean, default: DEFAULT_SETTINGS.notifications.emailOnPayout },
            weeklySummary: { type: Boolean, default: DEFAULT_SETTINGS.notifications.weeklySummary },
          },
          theme: { type: String, enum: ['light', 'dark', 'system'], default: DEFAULT_SETTINGS.theme },
        },
        { _id: false }
      ),
      default: () => ({}),
    },
  },
  {
    timestamps: true,
    discriminatorKey: "accountType",
  }
);

export const UserModel = model<BaseUser>("User", baseUserSchema);

export interface IndividualUser extends BaseUser {
  accountType: "individual";
}

export const IndividualUserModel =
  UserModel.discriminator<IndividualUser>(
    "individual",
    new Schema({})
  );

  export interface BusinessUser extends BaseUser {
    accountType: "business";
    businessName: string;
    businessEmail: string;
  }
  
  export const BusinessUserModel = UserModel.discriminator<BusinessUser>(
    "business",
    new Schema({
      businessName: { type: String, required: true },
      businessEmail: { type: String, required: true, lowercase: true },
    })
  );