import { createSlice } from '@reduxjs/toolkit';
import { loginUser, logoutUser, signUpResponse, signUpUser } from './thunkActions';

export const enum AccountType {
  INDIVIDUAL = 'individual',
  BUSINESS = 'business',
}

export interface AuthState {
  isSigningUp?: boolean;
  isLoggingIn?: boolean;
  isLoggingOut?: boolean;
  signUpData?: signUpResponse;
}

export const initialAuthState: AuthState = {
  isSigningUp: false,
  isLoggingIn: false,
  isLoggingOut: false,
  signUpData: undefined,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState: initialAuthState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(signUpUser.pending, (state) => {
        state.isSigningUp = true;
      })
      .addCase(signUpUser.fulfilled, (state, action) => {
        state.isSigningUp = false;
        state.signUpData = { data: action.payload };
      })
      .addCase(signUpUser.rejected, (state) => {
        state.isSigningUp = false;
      })
      .addCase(loginUser.pending, (state) => {
        state.isLoggingIn = true;
      })
      .addCase(loginUser.fulfilled, (state) => {
        state.isLoggingIn = false;
      })
      .addCase(loginUser.rejected, (state) => {
        state.isLoggingIn = false;
      })
      .addCase(logoutUser.pending, (state) => {
        state.isLoggingOut = true;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.isLoggingOut = false;
      })
      .addCase(logoutUser.rejected, (state) => {
        state.isLoggingOut = false;
      });
  },
});

export const {} = authSlice.actions;

export default authSlice.reducer;