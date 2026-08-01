import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import Profile from './pages/Profile';
import Home from './pages/Home';
import ProductDetail from './pages/ProductDetail';
import { Loader, CheckCircle2 } from 'lucide-react';
import { getRedirectFromSearch, goAfterAuth, rememberRedirect } from './utils/redirect';

const PostAuthRedirect = ({ account }) => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const redirectTimer = setTimeout(() => {
      rememberRedirect(getRedirectFromSearch(location.search));
      goAfterAuth(navigate, account);
    }, 700);

    return () => clearTimeout(redirectTimer);
  }, [account, location.search, navigate]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="flex items-center gap-2 text-emerald-600">
        <CheckCircle2 className="h-5 w-5 stroke-[2.5]" />
        <p className="text-base font-semibold">Login successful</p>
      </div>
    </div>
  );
};

// Protected Route Wrapper
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-indigo-500/25 border-t-indigo-500 rounded-full animate-spin" />
        <p className="text-slate-400 text-sm animate-pulse font-medium">Securing connection...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Public Route Wrapper (prevents logged in users from seeing login/signup)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-indigo-500/25 border-t-indigo-500 rounded-full animate-spin" />
        <p className="text-slate-400 text-sm animate-pulse font-medium font-sans">Connecting to service...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return <PostAuthRedirect account={user} />;
  }

  return children;
};

const AuthSuccess = () => {
  const { refreshUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const redirectTimer = setTimeout(() => {
      goAfterAuth(navigate);
    }, 5000);

    const finishGoogleLogin = async () => {
      // Read token from URL query param (set by backend to bypass cross-origin cookie blocking)
      const params = new URLSearchParams(window.location.search);
      const urlToken = params.get('token');

      if (urlToken) {
        // Store in localStorage so axios interceptor picks it up
        localStorage.setItem('vendorhub_access_token', urlToken);
        // Clean the token from the URL bar without page reload
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      const result = await Promise.race([
        refreshUser(),
        new Promise((resolve) => setTimeout(() => resolve({ success: false, timedOut: true }), 4500)),
      ]);

      clearTimeout(redirectTimer);
      goAfterAuth(navigate, result?.success && result?.user ? result.user : 'user', urlToken || '');
    };

    finishGoogleLogin();

    return () => clearTimeout(redirectTimer);
  }, [navigate, refreshUser]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="flex items-center gap-2 text-emerald-600">
        <CheckCircle2 className="h-5 w-5 stroke-[2.5]" />
        <p className="text-base font-semibold">Login successful</p>
      </div>
    </div>
  );
};


function App() {
  return (
    <BrowserRouter>
      <NotificationProvider>
        <AuthProvider>
          <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
            <Routes>
              {/* Public Routes */}
              <Route 
                path="/login" 
                element={
                  <PublicRoute>
                    <Login />
                  </PublicRoute>
                } 
              />
              <Route 
                path="/register" 
                element={
                  <PublicRoute>
                    <Register />
                  </PublicRoute>
                } 
              />
              <Route 
                path="/forgot-password" 
                element={
                  <PublicRoute>
                    <ForgotPassword />
                  </PublicRoute>
                } 
              />
              <Route 
                path="/reset-password/:token" 
                element={
                  <PublicRoute>
                    <ResetPassword />
                  </PublicRoute>
                } 
              />

              {/* Email Verification (Can be accessed by anyone with token) */}
              <Route path="/verify-email/:token" element={<VerifyEmail />} />
              <Route path="/auth/success" element={<AuthSuccess />} />

              {/* Home & Product Routes */}
              <Route 
                path="/" 
                element={
                  <ProtectedRoute>
                    <Home />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/product/:id" 
                element={
                  <ProtectedRoute>
                    <ProductDetail />
                  </ProtectedRoute>
                } 
              />

              {/* Protected Routes */}
              <Route 
                path="/profile" 
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                } 
              />

              {/* Default Redirect */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </AuthProvider>
      </NotificationProvider>
    </BrowserRouter>
  );
}

export default App;
