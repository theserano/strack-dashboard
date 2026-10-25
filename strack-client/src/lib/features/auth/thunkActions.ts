import { ReduxAction } from '@/lib/utils/types';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { User } from '../user/thunkActions';
import api, { setNetworkBlocked } from '@/lib/utils/axios';
import { AccountType } from '@/lib/states/accounts/accounts';
import { clearUser, setUser } from '../user/slice';
import { tokenManager } from '@/lib/utils/auth';

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

export interface AuthResponseData {
  user: User;
  accessToken: string;
}

/** A real login or signup ends any demo session first, otherwise the demo network guard blocks it. */
const leaveDemo = (state: unknown, dispatch: (a: ReturnType<typeof clearUser>) => unknown) => {
  if ((state as { auth: { mode: string } }).auth.mode !== 'demo') return;
  dispatch(clearUser()); // also sets mode back to live
  setNetworkBlocked(false);
};

export const signUpUser = createAsyncThunk(
  'auth/signUpUser',
  async ({ values, onFailure, onSuccess }: signUpDataArgs, { dispatch, getState, rejectWithValue }) => {
    leaveDemo(getState(), dispatch);
    try {
      const response = await api.post('/auth/signup', values);
      const { user, accessToken } = response.data.data as AuthResponseData;
      tokenManager.set(accessToken);
      dispatch(setUser(user));
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

export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async ({ values, onFailure, onSuccess }: loginDataArgs, { dispatch, getState, rejectWithValue }) => {
    leaveDemo(getState(), dispatch);
    try {
      const response = await api.post('/auth/login', values);
      const { user, accessToken } = response.data.data as AuthResponseData;
      tokenManager.set(accessToken);
      dispatch(setUser(user));
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
  async ({ onFailure, onSuccess }: ReduxAction, { dispatch, getState, rejectWithValue }) => {
    try {
      // Demo has no server session to end.
      if ((getState() as { auth: { mode: string } }).auth.mode !== 'demo') await api.post('/auth/logout');
      tokenManager.clear();
      dispatch(clearUser());
      if (onSuccess) onSuccess(null);
      return;
    } catch (error) {
      if (onFailure) onFailure(error);
      return rejectWithValue(error);
    }
  }
);
