import api from '@/lib/utils/axios';
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
  > & { dob: string } // YYYY-MM-DD
>;

/** Pulls the server's message out of an axios error. */
export const getErrorMessage = (error: unknown, fallback = 'Something went wrong. Please try again.') =>
  (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;

export interface UserArgs extends ReduxAction {
  userId: string;
}

export const getUser = createAsyncThunk(
  'auth/getUser',
  async ({ userId, onFailure, onSuccess }: UserArgs, { rejectWithValue }) => {
    try {
      const response = await api.get(`/user`, { params: { userId } });
      if (onSuccess) onSuccess(response.data.data);
      return response.data.data;
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
    { rejectWithValue }
  ) => {
    try {
      const response = await api.patch(`/user`, data, { params: { userId } });
      if (onSuccess) onSuccess(response.data.data);
      return response.data.data as User;
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
    { rejectWithValue }
  ) => {
    try {
      const formData = new FormData();
      Object.entries(files).forEach(([type, file]) => file && formData.append(type, file));
      // The axios instance defaults to JSON, which would turn FormData into JSON.
      const response = await api.post(`/user/documents`, formData, {
        params: { userId },
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
      });
      if (onSuccess) onSuccess(response.data.data);
      return response.data.data as User;
    } catch (error) {
      if (onFailure) onFailure(error);
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const submitCompliance = createAsyncThunk(
  'user/submitCompliance',
  async ({ userId, onFailure, onSuccess }: UserArgs, { rejectWithValue }) => {
    try {
      const response = await api.post(`/user/compliance/submit`, {}, { params: { userId } });
      if (onSuccess) onSuccess(response.data.data);
      return response.data.data as User;
    } catch (error) {
      if (onFailure) onFailure(error);
      return rejectWithValue(getErrorMessage(error));
    }
  }
);
