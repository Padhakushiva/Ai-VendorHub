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
import { Loader, ShieldCheck } from 'lucide-react';
import GlowBackground from './components/GlowBackground';
import { getRedirectFromSearch, goAfterAuth, rememberRedirect } from './utils/redirect';

const PostAuthRedirect = ({ account }) => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    rememberRedirect(getRedirectFromSearch(location.search));
    goAfterAuth(navigate, account);
  }, [account, location.search, navigate]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
      <div className="w-12 h-12 border-4 border-indigo-500/25 border-t-indigo-500 rounded-full animate-spin" />
      <p className="text-slate-400 text-sm animate-pulse font-medium font-sans">Opening marketplace...</p>
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
      const result = await Promise.race([
        refreshUser(),
        new Promise((resolve) => setTimeout(() => resolve({ success: false, timedOut: true }), 4500)),
      ]);

      clearTimeout(redirectTimer);
      goAfterAuth(navigate, result?.success && result?.user ? result.user : 'user');
    };

    finishGoogleLogin();

    return () => clearTimeout(redirectTimer);
  }, [navigate, refreshUser]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <GlowBackground />
      <div className="bg-slate-900/70 border border-emerald-500/25 backdrop-blur-xl rounded-2xl p-8 shadow-2xl text-center animate-scale-in">
        <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
          <ShieldCheck className="w-7 h-7 text-emerald-400" />
        </div>
        <h1 className="text-2xl font-bold text-white">Google Login Connected</h1>
        <p className="text-slate-400 text-sm mt-2">Marketplace open ho raha hai...</p>
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
