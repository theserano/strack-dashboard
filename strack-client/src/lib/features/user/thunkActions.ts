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
}

export interface UserArgs extends ReduxAction {
  userId: string;
}

export const getUser = createAsyncThunk(
  'auth/getUser',
  async ({ userId, onFailure, onSuccess }: UserArgs, { rejectWithValue }) => {
    try {
      const response = await api.get(`/user`, {
        params: {
          userId,
        },
      });
      if (onSuccess) onSuccess(response.data.data);
      return response.data.data;
    } catch (error) {
      if (onFailure) onFailure(error);
      return rejectWithValue(error);
    }
  }
);
