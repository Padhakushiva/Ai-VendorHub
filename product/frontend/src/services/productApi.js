import axios from 'axios';
import { authApi, clearAccessToken, getAccessToken, storeAccessToken } from './authSession';

export const PRODUCT_API_BASE_URL = import.meta.env.VITE_PRODUCT_API_URL || '/api/product';

export const productApi = axios.create({
  baseURL: PRODUCT_API_BASE_URL,
  withCredentials: true,
  timeout: 9000,
});

productApi.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise = null;

productApi.interceptors.response.use(
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
        return productApi(originalRequest);
      } catch (refreshError) {
        refreshPromise = null;
        clearAccessToken();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);
