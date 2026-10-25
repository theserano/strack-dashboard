import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { loginUser, logoutUser, signUpUser } from './thunkActions';

export const enum AccountType {
  INDIVIDUAL = 'individual',
  BUSINESS = 'business',
}

export interface AuthState {
  isSigningUp?: boolean;
  isLoggingIn?: boolean;
  isLoggingOut?: boolean;
  signUpData?: unknown;
  /** 'demo' uses the local data source instead of the server. */
  mode: 'live' | 'demo';
  /** True once persisted session data has been read from storage (after mount). */
  hydrated: boolean;
}

export const initialAuthState: AuthState = {
  isSigningUp: false,
  isLoggingIn: false,
  isLoggingOut: false,
  signUpData: undefined,
  mode: 'live',
  hydrated: false,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState: initialAuthState,
  reducers: {
    setMode: (state, action: PayloadAction<'live' | 'demo'>) => {
      state.mode = action.payload;
    },
    setHydrated: (state) => {
      state.hydrated = true;
    },
  },
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

export const { setMode, setHydrated } = authSlice.actions;

export default authSlice.reducer;