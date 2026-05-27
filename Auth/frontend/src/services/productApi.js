import axios from 'axios';

const ACCESS_TOKEN_KEY = 'vendorhub_access_token';

export const productApi = axios.create({
  baseURL: import.meta.env.VITE_PRODUCT_API_URL || 'http://localhost:3000',
  withCredentials: true,
  timeout: 9000,
});

productApi.interceptors.request.use((config) => {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

