import { configureStore } from '@reduxjs/toolkit';
import auth from './features/auth/slice';
import user from './features/user/slice';

export const makeStore = () => {
  return configureStore({
    reducer: {
      auth,
      user,
    },
  });
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
