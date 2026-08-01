import axios from 'axios';
import { authApi, clearAccessToken, getAccessToken, storeAccessToken } from './authSession';

export const AI_API_BASE_URL = import.meta.env.VITE_AI_API_URL || '/ai';

export const aiApi = axios.create({
  baseURL: AI_API_BASE_URL,
  withCredentials: true,
  timeout: 30000,
});

aiApi.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise = null;

aiApi.interceptors.response.use(
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
        return aiApi(originalRequest);
      } catch (refreshError) {
        refreshPromise = null;
        clearAccessToken();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

const aiErrorMessage = (err, fallback) => (
  err.response?.data?.message || err.response?.data?.error || err.message || fallback
);

export const generateListingDescription = async ({ title, category, basicDescription, price }) => {
  try {
    const response = await aiApi.post('/generate-description', {
      title,
      category,
      basicDescription,
      price,
    });
    return response.data;
  } catch (err) {
    return {
      success: false,
      message: aiErrorMessage(err, 'AI description generation failed'),
    };
  }
};

export const suggestListingCategoryTags = async ({ title, description }) => {
  try {
    const response = await aiApi.post('/suggest-category-tags', {
      title,
      description,
    });
    return response.data;
  } catch (err) {
    return {
      success: false,
      message: aiErrorMessage(err, 'AI category and tag suggestion failed'),
    };
  }
};

export const fetchAIStatus = async () => {
  try {
    const response = await aiApi.get('/scope');
    return { success: true, data: response.data };
  } catch (err) {
    return {
      success: false,
      message: aiErrorMessage(err, 'AI service is not reachable'),
    };
  }
};
