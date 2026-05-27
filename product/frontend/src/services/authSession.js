import axios from 'axios';

export const ACCESS_TOKEN_KEY = 'vendorhub_access_token';
export const AUTH_APP_URL = import.meta.env.VITE_AUTH_APP_URL || 'http://localhost:5173';

export const getAccessToken = () => window.localStorage.getItem(ACCESS_TOKEN_KEY);

export const storeAccessToken = (token) => {
  if (token) {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
  }
};

export const clearAccessToken = () => {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
};

export const consumeAccessTokenFromUrl = () => {
  const url = new URL(window.location.href);
  const token = url.searchParams.get('accessToken');

  if (!token) {
    return '';
  }

  storeAccessToken(token);
  url.searchParams.delete('accessToken');
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  return token;
};

export const authApi = axios.create({
  baseURL: import.meta.env.VITE_AUTH_API_URL || '',
  withCredentials: true,
  timeout: 9000,
});

authApi.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getCurrentReturnUrl = () => `${window.location.origin}${window.location.pathname}${window.location.search}`;

export const getLoginUrl = (returnUrl = getCurrentReturnUrl()) => (
  `${AUTH_APP_URL}/login?redirect=${encodeURIComponent(returnUrl)}`
);

export const getSellerLoginUrl = (returnUrl = `${window.location.origin}/seller-dashboard`) => (
  `${AUTH_APP_URL}/login?redirect=${encodeURIComponent(returnUrl)}`
);

export const getProfileUrl = () => `${AUTH_APP_URL}/profile`;

export const redirectToLogin = () => {
  window.location.href = getLoginUrl();
};
