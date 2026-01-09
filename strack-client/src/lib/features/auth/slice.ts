import { createSlice } from "@reduxjs/toolkit";
import { signUpResponse, signUpUser } from "./thunkActions";

export const enum AccountType {
    INDIVIDUAL = "individual",
    BUSINESS = "business",
}

export interface AuthState {
    isSigningUp?: boolean;
    isLoggingIn?: boolean;
    signUpData?: signUpResponse;
}

export const initialAuthState: AuthState = {
    isSigningUp: false,
    isLoggingIn: false,
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
        });
    }
});

export const {  } = authSlice.actions;

export default authSlice.reducer;