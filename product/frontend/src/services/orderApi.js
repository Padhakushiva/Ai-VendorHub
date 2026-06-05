import axios from 'axios';
import { authApi, clearAccessToken, getAccessToken, storeAccessToken } from './authSession';

export const ORDER_API_BASE_URL = import.meta.env.VITE_ORDER_API_URL || '/api/orders';

export const orderApi = axios.create({
  baseURL: ORDER_API_BASE_URL,
  withCredentials: true,
  timeout: 12000,
});

orderApi.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise = null;

orderApi.interceptors.response.use(
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
        return orderApi(originalRequest);
      } catch (refreshError) {
        refreshPromise = null;
        clearAccessToken();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);
