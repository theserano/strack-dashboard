import { configureStore } from '@reduxjs/toolkit';
import auth from './features/auth/slice';

export const makeStore = () => {
  return configureStore({
    reducer: {
      auth,
    },
  });
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
