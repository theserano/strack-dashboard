import { signUpRequest } from  "../auth/auth.types";
import { Schema, model, Document } from "mongoose";

export interface BaseUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  accountType: "individual" | "business";
}

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