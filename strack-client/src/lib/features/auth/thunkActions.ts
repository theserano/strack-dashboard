import { ReduxAction } from '@/lib/utils/types';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { User } from '../user/thunkActions';
import api from '@/lib/utils/axios';
import { AccountType } from '@/lib/states/accounts/accounts';

interface signUpDataArgs extends ReduxAction {
  values: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
    accountType: AccountType;
    businessName?: string;
    businessEmail?: string;
  };
}

export interface signUpResponse {
  data: {
    user: User;
    accessToken: string;
  };
}

export const signUpUser = createAsyncThunk(
  'auth/signUpUser',
  async ({ values, onFailure, onSuccess }: signUpDataArgs, { rejectWithValue }) => {
    try {
      const response: signUpResponse = await api.post('/auth/signup', values);
      if (onSuccess) onSuccess(response.data);
      return response.data;
    } catch (error) {
      if (onFailure) onFailure(error);
      return rejectWithValue(error);
    }
  }
);

interface loginDataArgs extends ReduxAction {
  values: {
    email: string;
    password: string;
  };
}

export interface loginResponse {
  data: {
    user: User;
    accessToken: string;
  };
}

export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async ({ values, onFailure, onSuccess }: loginDataArgs, { rejectWithValue }) => {
      try {
      const response: loginResponse = await api.post('/auth/login', values);
      if (onSuccess) onSuccess(response.data);
      return response.data;
    } catch (error) {
      if (onFailure) onFailure(error);
      return rejectWithValue(error);
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async ({ onFailure, onSuccess }: ReduxAction, { rejectWithValue }) => {
    try {
      await api.post('/auth/logout');
      if (onSuccess) onSuccess(null);
      return;
    } catch (error) {
      if (onFailure) onFailure(error);
      return rejectWithValue(error);
    }
  }
);