import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi, clearAccessToken, consumeAccessTokenFromUrl, getLoginUrl, getProfileUrl, getSellerLoginUrl, redirectToLogin, storeAccessToken } from '../services/authSession';

const AuthBridgeContext = createContext(null);

const normalizeAccount = (payload = {}) => {
  const account = payload.user || payload.seller || payload.data || payload;
  if (!account || typeof account !== 'object') return null;

  return {
    ...account,
    id: account.id || account._id,
    username: account.username || account.email?.split('@')[0] || 'user',
    email: account.email || '',
    role: account.role || (payload.seller ? 'seller' : 'user'),
    fullName: account.fullName || {},
  };
};

export const AuthBridgeProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      setLoading(true);
      let response;
      try {
        response = await authApi.get('/api/auth/me');
      } catch (error) {
        if (error.response?.status !== 401) throw error;
        const refreshResponse = await authApi.post('/api/auth/refresh');
        storeAccessToken(refreshResponse.data?.accessToken || refreshResponse.data?.token);
        response = await authApi.get('/api/auth/me');
      }
      const account = normalizeAccount(response.data);
      if (account) {
        storeAccessToken(response.data?.accessToken || response.data?.token);
        setUser(account);
        return { success: true, user: account };
      }
      setUser(null);
      return { success: false, message: response.data?.message || 'Auth session not found' };
    } catch (error) {
      setUser(null);
      return { success: false, message: error.response?.data?.message || 'Not logged in' };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.post('/api/auth/logout');
    } catch {
      // Local logout should still clear product-side session state.
    } finally {
      clearAccessToken();
      setUser(null);
    }
  }, []);

  const requireAuth = useCallback((message = 'Please login to continue') => {
    if (user) return true;
    window.sessionStorage.setItem('vendorhub_auth_notice', message);
    redirectToLogin();
    return false;
  }, [user]);

  useEffect(() => {
    consumeAccessTokenFromUrl();
    refreshUser();
  }, [refreshUser]);

  const value = useMemo(() => ({
    user,
    loading,
    isAuthenticated: Boolean(user),
    loginUrl: getLoginUrl(),
    sellerLoginUrl: getSellerLoginUrl(),
    profileUrl: getProfileUrl(),
    refreshUser,
    logout,
    requireAuth,
  }), [loading, logout, refreshUser, requireAuth, user]);

  return (
    <AuthBridgeContext.Provider value={value}>
      {children}
    </AuthBridgeContext.Provider>
  );
};

export const useAuthBridge = () => {
  const context = useContext(AuthBridgeContext);
  if (!context) {
    throw new Error('useAuthBridge must be used within AuthBridgeProvider');
  }
  return context;
};
