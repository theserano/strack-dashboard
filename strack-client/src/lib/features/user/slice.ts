import { createSlice } from '@reduxjs/toolkit';
import { getUser, submitCompliance, updateUser, uploadDocuments, User } from './thunkActions';

export interface UserState {
  user: User | null;
  loading: boolean;
  saving: boolean;
}

export const initialUserState: UserState = {
  user: null,
  loading: false,
  saving: false,
};

export const userSlice = createSlice({
  name: 'user',
  initialState: initialUserState,
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
    },
    clearUser: (state) => {
      state.user = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(getUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
      })
      .addCase(getUser.rejected, (state) => {
        state.loading = false;
      });

    // Every compliance save returns the updated user.
    for (const thunk of [updateUser, uploadDocuments, submitCompliance]) {
      builder
        .addCase(thunk.pending, (state) => {
          state.saving = true;
        })
        .addCase(thunk.fulfilled, (state, action) => {
          state.saving = false;
          state.user = action.payload;
        })
        .addCase(thunk.rejected, (state) => {
          state.saving = false;
        });
    }
  },
});

export const { setUser, clearUser } = userSlice.actions;
export default userSlice.reducer;
