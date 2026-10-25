import { getDataSource, type SessionMode } from '@/lib/data';
import { ReduxAction } from '@/lib/utils/types';
import { createAsyncThunk } from '@reduxjs/toolkit';

export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  accountType: 'individual' | 'business';
  businessName?: string;
  businessEmail?: string;

  // Compliance
  dob?: string; // ISO date from the server
  bvn?: string;
  rcNumber?: string;
  businessType?: string;
  industry?: string;
  businessAddress?: string;
  documents?: Partial<Record<DocumentType, StoredDocument>>;
  verified?: boolean;
  complianceStatus?: 'not_started' | 'in_progress' | 'pending_review' | 'approved' | 'rejected';
  complianceProgress?: {
    personalInformation: boolean;
    businessDetails: boolean;
    businessDocuments: boolean;
  };
}

export type DocumentType = 'cac' | 'memorandum' | 'utility' | 'validId';

export interface StoredDocument {
  fileId: string;
  filename: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

export type UpdateUserData = Partial<
  Pick<
    User,
    | 'firstName'
    | 'lastName'
    | 'email'
    | 'phone'
    | 'bvn'
    | 'businessName'
    | 'businessEmail'
    | 'rcNumber'
    | 'businessType'
    | 'industry'
    | 'businessAddress'
  > & { dob: string; currentPassword: string } // dob: YYYY-MM-DD; currentPassword: required by the server when email changes
>;

/** Pulls the server's message out of an axios error. */
export const getErrorMessage = (error: unknown, fallback = 'Something went wrong. Please try again.') =>
  (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;

const sourceFor = (getState: () => unknown) => getDataSource((getState() as { auth: { mode: SessionMode } }).auth.mode);

export interface UserArgs extends ReduxAction {
  userId: string;
}

export const getUser = createAsyncThunk(
  'auth/getUser',
  async ({ userId, onFailure, onSuccess }: UserArgs, { rejectWithValue, getState }) => {
    try {
      const user = await sourceFor(getState).user.get(userId);
      if (onSuccess) onSuccess(user);
      return user;
    } catch (error) {
      if (onFailure) onFailure(error);
      return rejectWithValue(error);
    }
  }
);

export const updateUser = createAsyncThunk(
  'user/updateUser',
  async (
    { userId, data, onFailure, onSuccess }: UserArgs & { data: UpdateUserData },
    { rejectWithValue, getState }
  ) => {
    try {
      const user = await sourceFor(getState).user.update(data, userId);
      if (onSuccess) onSuccess(user);
      return user;
    } catch (error) {
      if (onFailure) onFailure(error);
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const uploadDocuments = createAsyncThunk(
  'user/uploadDocuments',
  async (
    { userId, files, onFailure, onSuccess }: UserArgs & { files: Partial<Record<DocumentType, File>> },
    { rejectWithValue, getState }
  ) => {
    try {
      const user = await sourceFor(getState).user.uploadDocuments(files, userId);
      if (onSuccess) onSuccess(user);
      return user;
    } catch (error) {
      if (onFailure) onFailure(error);
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const submitCompliance = createAsyncThunk(
  'user/submitCompliance',
  async ({ userId, onFailure, onSuccess }: UserArgs, { rejectWithValue, getState }) => {
    try {
      const user = await sourceFor(getState).user.submitCompliance(userId);
      if (onSuccess) onSuccess(user);
      return user;
    } catch (error) {
      if (onFailure) onFailure(error);
      return rejectWithValue(getErrorMessage(error));
    }
  }
);
