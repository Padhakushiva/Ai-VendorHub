import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const ACCESS_TOKEN_KEY = 'vendorhub_access_token';

const getStoredAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY);
const storeAccessToken = (token) => {
  if (token) {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  }
};
const clearStoredAccessToken = () => localStorage.removeItem(ACCESS_TOKEN_KEY);

// Create axios instance with credentials. In Vite dev, /api is proxied to the Auth service.
export const api = axios.create({
  baseURL: import.meta.env.VITE_AUTH_API_URL || '',
  withCredentials: true,
  timeout: 8000,
});

api.interceptors.request.use((config) => {
  const token = getStoredAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isRefreshRequest = originalRequest?.url?.includes('/api/auth/refresh');

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isRefreshRequest) {
      originalRequest._retry = true;
      try {
        refreshPromise = refreshPromise || api.post('/api/auth/refresh');
        const refreshResponse = await refreshPromise;
        refreshPromise = null;
        storeAccessToken(refreshResponse.data?.accessToken || refreshResponse.data?.token);
        return api(originalRequest);
      } catch (refreshError) {
        refreshPromise = null;
        clearStoredAccessToken();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load user on mount
  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/auth/me');
      if (response.data.success) {
        const userData = response.data.user || response.data.seller;
        storeAccessToken(response.data.accessToken || response.data.token);
        setUser(userData);
        setIsAuthenticated(true);
        return { success: true, user: userData };
      } else {
        setUser(null);
        setIsAuthenticated(false);
        return { success: false, message: response.data.message || 'Current user not found' };
      }
    } catch (err) {
      // If unauthorized, do not throw error, just set authenticated to false
      setUser(null);
      setIsAuthenticated(false);
      return { success: false, message: err.response?.data?.message || 'Current user fetch failed' };
    } finally {
      setLoading(false);
    }
  };

  // Login handler
  const login = async (emailOrUsername, password, accountType = 'user') => {
    setError(null);
    try {
      const type = typeof accountType === 'boolean' ? (accountType ? 'seller' : 'user') : accountType;
      const endpoint = type === 'admin'
        ? '/api/auth/login/admin'
        : type === 'seller'
          ? '/api/auth/login/seller'
          : '/api/auth/login';
      const payload = emailOrUsername.includes('@') 
        ? { email: emailOrUsername, password } 
        : { username: emailOrUsername, password };

      const response = await api.post(endpoint, payload);
      if (response.data.success) {
        const userData = response.data.user || response.data.seller;
        const accessToken = response.data.accessToken || response.data.token;
        storeAccessToken(accessToken);
        setUser(userData);
        setIsAuthenticated(true);
        return { success: true, user: userData, accessToken };
      }
      return { success: false, message: response.data.message || 'Login failed' };
    } catch (err) {
      const message = err.response?.data?.message || 'Invalid credentials';
      setError(message);
      return { success: false, message };
    }
  };

  // Register user handler
  const registerUser = async (formData) => {
    setError(null);
    try {
      const response = await api.post('/api/auth/register', formData);
      if (response.data.success) {
        const userData = response.data.user;
        const accessToken = response.data.accessToken || response.data.token;
        storeAccessToken(accessToken);
        setUser(userData);
        setIsAuthenticated(true);
        return { success: true, user: userData, accessToken, devToken: response.data.emailVerificationToken };
      }
      return { success: false, message: response.data.message || 'Registration failed' };
    } catch (err) {
      const message = err.response?.data?.message || 'Registration failed';
      setError(message);
      return { success: false, message };
    }
  };

  // Register seller handler
  const registerSeller = async (formData) => {
    setError(null);
    try {
      const response = await api.post('/api/auth/register/seller', formData);
      if (response.data.success) {
        const userData = response.data.seller;
        const accessToken = response.data.accessToken || response.data.token;
        storeAccessToken(accessToken);
        setUser(userData);
        setIsAuthenticated(true);
        return { success: true, user: userData, accessToken, devToken: response.data.emailVerificationToken };
      }
      return { success: false, message: response.data.message || 'Registration failed' };
    } catch (err) {
      const message = err.response?.data?.message || 'Registration failed';
      setError(message);
      return { success: false, message };
    }
  };

  // Logout handler
  const logout = async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (err) {
      console.error('Logout error', err);
    } finally {
      clearStoredAccessToken();
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  // Logout all devices
  const logoutAll = async () => {
    try {
      await api.post('/api/auth/logout-all');
      clearStoredAccessToken();
      setUser(null);
      setIsAuthenticated(false);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to logout all devices';
      return { success: false, message };
    }
  };

  // Request email verification
  const requestVerification = async () => {
    try {
      const response = await api.post('/api/auth/verify-email/request');
      return { 
        success: true, 
        message: response.data.message,
        devToken: response.data.emailVerificationToken 
      };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Verification request failed' };
    }
  };

  // Verify email by token
  const verifyEmail = async (token) => {
    try {
      const response = await api.post(`/api/auth/verify-email/${token}`);
      if (response.data.success) {
        const userData = response.data.user || response.data.seller;
        storeAccessToken(response.data.accessToken || response.data.token);
        setUser(userData);
        return { success: true, message: response.data.message };
      }
      return { success: false, message: response.data.message };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Email verification failed' };
    }
  };

  // Forgot password
  const forgotPassword = async (email) => {
    try {
      const response = await api.post('/api/auth/password/forgot', { email });
      return { 
        success: true, 
        message: response.data.message,
        devToken: response.data.passwordResetToken 
      };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Request failed' };
    }
  };

  // Reset password
  const resetPassword = async (token, newPassword) => {
    try {
      const response = await api.post(`/api/auth/password/reset/${token}`, { password: newPassword });
      return { success: true, message: response.data.message };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Reset failed' };
    }
  };

  // Update profile
  const updateProfile = async (profileData) => {
    try {
      const response = await api.patch('/api/auth/users/me', profileData);
      if (response.data.success) {
        const userData = response.data.user || response.data.seller;
        storeAccessToken(response.data.accessToken || response.data.token);
        setUser(userData);
        return { success: true, user: userData };
      }
      return { success: false, message: response.data.message };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Update failed' };
    }
  };

  // Refresh current auth session manually
  const refreshSession = async () => {
    try {
      const response = await api.post('/api/auth/refresh');
      if (response.data.success) {
        const userData = response.data.user || response.data.seller;
        storeAccessToken(response.data.accessToken || response.data.token);
        setUser(userData);
        setIsAuthenticated(true);
        return { success: true, user: userData, message: response.data.message };
      }
      return { success: false, message: response.data.message || 'Refresh failed' };
    } catch (err) {
      clearStoredAccessToken();
      setUser(null);
      setIsAuthenticated(false);
      return { success: false, message: err.response?.data?.message || 'Refresh session failed' };
    }
  };

  // Add address (User only)
  const addAddress = async (addressData) => {
    try {
      const response = await api.post('/api/auth/users/me/addresses', addressData);
      if (response.data.success) {
        setUser((prev) => ({
          ...prev,
          addresses: response.data.addresses,
        }));
        return { success: true, addresses: response.data.addresses };
      }
      return { success: false, message: response.data.message };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Failed to add address' };
    }
  };

  // Delete address (User only)
  const deleteAddress = async (addressId) => {
    try {
      const response = await api.delete(`/api/auth/users/me/addresses/${addressId}`);
      if (response.data.success) {
        setUser((prev) => ({
          ...prev,
          addresses: prev.addresses.filter((addr) => addr._id !== addressId),
        }));
        return { success: true };
      }
      return { success: false, message: response.data.message };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Failed to delete address' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        loading,
        error,
        login,
        registerUser,
        registerSeller,
        logout,
        logoutAll,
        requestVerification,
        verifyEmail,
        forgotPassword,
        resetPassword,
        updateProfile,
        addAddress,
        deleteAddress,
        refreshSession,
        refreshUser: fetchCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
