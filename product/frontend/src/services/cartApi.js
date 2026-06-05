import axios from 'axios';
import { authApi, clearAccessToken, getAccessToken, storeAccessToken } from './authSession';

export const CART_API_BASE_URL = import.meta.env.VITE_CART_API_URL || '/api/cart';

export const cartApi = axios.create({
  baseURL: CART_API_BASE_URL,
  withCredentials: true,
  timeout: 9000,
});

cartApi.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise = null;

cartApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        refreshPromise = refreshPromise || authApi.post('/api/auth/refresh');
        const refreshResponse = await refreshPromise;
        refreshPromise = null;
        storeAccessToken(refreshResponse.data?.accessToken || refreshResponse.data?.token);
        return cartApi(originalRequest);
      } catch (refreshError) {
        refreshPromise = null;
        clearAccessToken();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);
