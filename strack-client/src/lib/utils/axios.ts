'use client';

import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { env } from '../env';
import { tokenManager } from './auth';

export const SESSION_EXPIRED_EVENT = 'strack:session-expired';

interface RetryableRequestConfig extends AxiosRequestConfig {
  _retry?: boolean;
}

const api = axios.create({
  baseURL: env.API_BASE_URL,
  withCredentials: true,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/* ------------------------------------------
   TOKEN REFRESH
   The access token only lives in memory, so it's gone after a page reload.
   The refresh token cookie gets a new one. Concurrent callers share one request.
------------------------------------------- */

let refreshPromise: Promise<string> | null = null;

export const refreshAccessToken = () => {
  if (!refreshPromise) {
    // Plain axios (not `api`) so this call never goes through the interceptors below.
    refreshPromise = axios
      .post(`${env.API_BASE_URL}/auth/refresh`, null, { withCredentials: true })
      .then((res) => {
        const token = (res.data.data as { accessToken: string }).accessToken;
        tokenManager.set(token);
        return token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

// Login, signup, refresh and logout don't need an access token.
const isAuthRequest = (url?: string) => !!url && url.startsWith('/auth/');

/* ------------------------------------------
   REQUEST INTERCEPTOR
------------------------------------------- */

api.interceptors.request.use(async (config) => {
  let token = tokenManager.get();

  // After a reload: get a token first instead of sending the request without one.
  if (!token && !isAuthRequest(config.url)) {
    try {
      token = await refreshAccessToken();
    } catch {
      // Not logged in; let the request go out and fail with 401.
    }
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/* ------------------------------------------
   RESPONSE INTERCEPTOR
   Access token expired mid-session: refresh once and retry.
------------------------------------------- */

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthRequest(originalRequest.url)
    ) {
      originalRequest._retry = true;
      try {
        const token = await refreshAccessToken();
        originalRequest.headers = { ...originalRequest.headers, Authorization: `Bearer ${token}` };
        return api(originalRequest);
      } catch (refreshError) {
        tokenManager.clear();
        // The session is gone: tell the store to drop the saved user (StoreProvider listens).
        if (typeof window !== 'undefined') window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
        // Optional: hard redirect on auth failure
        // window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
