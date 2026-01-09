import { ReduxAction } from "@/lib/utils/types";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { User } from "../user/thunkActions";
import api from "@/lib/utils/axios";

interface signUpDataArgs extends ReduxAction {
    values: {
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
        password: string;
        accountType: 'individual' | 'business';
        businessName?: string;
        businessEmail?: string;
    }
}

export interface signUpResponse {
    data: {
        user: User,
        accessToken: string,
    }
}

export const signUpUser = createAsyncThunk('auth/signUpUser', async ({ values, onFailure, onSuccess }: signUpDataArgs, { rejectWithValue }) => {
    try {
        const response: signUpResponse = await api.post('/auth/signup', values);
        if (onSuccess) onSuccess(response.data);
        return response.data;
    } catch (error) {
        if (onFailure) onFailure(error);
        return rejectWithValue(error);
    }
 });