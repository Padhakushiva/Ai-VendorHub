import React, { useEffect, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import AuthShell from '../components/AuthShell';
import { ArrowRight, Bot, Lock, ShoppingBag, Store, User } from 'lucide-react';
import { getRedirectFromSearch, goAfterAuth, rememberRedirect } from '../utils/redirect';

const Login = () => {
  const [isSeller, setIsSeller] = useState(false);
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const redirectUrl = getRedirectFromSearch(location.search);
    rememberRedirect(redirectUrl);
    if (params.has('role')) {
      setIsSeller(params.get('role') === 'seller' || params.get('role') === 'merchant');
    }

    if (params.get('google') === 'failed') {
      showNotification('Google login failed. Please try again with a valid Google account.', 'error');
      navigate('/login', { replace: true });
    }
  }, [location.search, navigate, showNotification]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!emailOrUsername || !password) {
      showNotification('Please fill in all fields', 'error');
      return;
    }

    setLoading(true);
    const result = await login(emailOrUsername, password, isSeller);
    setLoading(false);

    if (result.success) {
      showNotification(`Welcome back, ${result.user.username}!`, 'success');
      goAfterAuth(navigate, {
        ...(result.user || {}),
        role: isSeller ? 'seller' : (result.user?.role || 'user'),
      }, result.accessToken || result.token);
    } else {
      showNotification(result.message, 'error');
    }
  };

  const handleGoogleLogin = () => {
    rememberRedirect(getRedirectFromSearch(location.search));
    const backendUrl = import.meta.env.VITE_AUTH_API_URL || 'http://localhost:3001';
    window.location.href = `${backendUrl}/api/auth/google?role=${isSeller ? 'seller' : 'user'}`;
  };

  const registerSearch = (() => {
    const params = new URLSearchParams(location.search);
    params.set('role', isSeller ? 'seller' : 'user');
    return `?${params.toString()}`;
  })();

  return (
    <AuthShell
      title="Launch Your AI Storefront"
      subtitle="Securely enter the marketplace where buyers discover AI products and sellers manage intelligent commerce."
    >
      <div className="w-full premium-panel rounded-[2rem] p-6 shadow-2xl animate-slide-up relative overflow-hidden">
        {/* Subtle decorative glowing corner */}
        <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-cyan-300/15 blur-3xl" />

        {/* Header */}
        <div className="mb-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="glass-icon h-11 w-11">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-white/42">Secure access</p>
              <p className="text-sm font-bold text-white">Ai-VendorHub</p>
            </div>
          </div>
          <h2 className="text-3xl font-black leading-none tracking-tight text-white sm:text-4xl">Welcome back</h2>
          <p className="text-white/52 mt-3 text-sm">Choose your account type and continue securely.</p>
        </div>

        {/* Role Toggle Switch */}
        <p className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-white/40">Account type</p>
        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/12 bg-white/6 p-1.5 shadow-inner shadow-white/5 mb-6">
          <button
            type="button"
            onClick={() => setIsSeller(false)}
            className={`relative flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold transition-all duration-300 ${
              !isSeller
                ? 'bg-white text-slate-950 shadow-lg shadow-black/25'
                : 'text-white/45 hover:bg-white/8 hover:text-white'
            }`}
          >
            <ShoppingBag className="h-4 w-4" />
            Buyer Account
            {!isSeller && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.9)]" />}
          </button>
          <button
            type="button"
            onClick={() => setIsSeller(true)}
            className={`relative flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold transition-all duration-300 ${
              isSeller
                ? 'bg-white text-slate-950 shadow-lg shadow-black/25'
                : 'text-white/45 hover:bg-white/8 hover:text-white'
            }`}
          >
            <Store className="h-4 w-4" />
            Merchant Account
            {isSeller && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.9)]" />}
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email / Username Input */}
          <div className="relative group">
            <div className="absolute left-3 top-3.5 text-white/38 group-focus-within:text-white transition-colors">
              <User className="w-5 h-5" />
            </div>
            <input
              type="text"
              placeholder="Username or Email"
              value={emailOrUsername}
              onChange={(e) => setEmailOrUsername(e.target.value)}
              className="w-full field-surface py-3.5 pl-11 pr-4"
            />
          </div>

          {/* Password Input */}
          <div className="relative group">
            <div className="absolute left-3 top-3.5 text-white/38 group-focus-within:text-white transition-colors">
              <Lock className="w-5 h-5" />
            </div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full field-surface py-3.5 pl-11 pr-4"
            />
          </div>

          {/* Forgot Password Link */}
          <div className="flex justify-end">
            <Link
              to="/forgot-password"
              className="text-xs text-white/55 hover:text-white transition-colors"
            >
              Forgot password?
            </Link>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full liquid-button py-3.5 flex items-center justify-center gap-2 group"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                Sign In as {isSeller ? 'Merchant' : 'Buyer'}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/12" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[#17191e]/80 px-3 text-white/38 backdrop-blur-xl">Or continue with</span>
          </div>
        </div>

        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          className="w-full glass-button py-3 flex items-center justify-center gap-3 group"
        >
          <svg className="w-5 h-5 transition-transform group-hover:scale-110" viewBox="0 0 24 24" width="24" height="24">
            <g transform="matrix(1, 0, 0, 1, 0, 0)">
              <path
                d="M21.35,11.1H12v2.7h5.38c-0.24,1.28 -0.96,2.37 -2.04,3.1v2.58h3.3c1.93,-1.78 3.04,-4.4 3.04,-7.48C21.68,11.83 21.56,11.4 21.35,11.1z"
                fill="#4285F4"
              />
              <path
                d="M12,20.76c2.37,0 4.35,-0.78 5.8,-2.13l-3.3,-2.58c-0.91,0.61 -2.08,0.97 -3.3,0.97 -2.28,0 -4.22,-1.54 -4.91,-3.61H2.88v2.66C4.33,18.94 7.94,20.76 12,20.76z"
                fill="#34A853"
              />
              <path
                d="M7.09,13.41c-0.17,-0.52 -0.27,-1.08 -0.27,-1.66s0.1,-1.14 0.27,-1.66V7.43H2.88c-0.57,1.14 -0.88,2.42 -0.88,3.77s0.31,2.63 0.88,3.77L7.09,13.41z"
                fill="#FBBC05"
              />
              <path
                d="M12,6.86c1.28,0 2.44,0.44 3.35,1.31l2.51,-2.51C16.34,4.24 14.35,3.48 12,3.48c-4.06,0 -7.67,1.82 -9.12,4.8L7.09,9.8c0.69,-2.07 2.63,-3.61 4.91,-3.61z"
                fill="#EA4335"
              />
            </g>
          </svg>
          Continue with Google
        </button>

        {/* Footer Link */}
        <div className="mt-6 text-center text-sm text-white/50">
          Don't have an account?{' '}
          <Link
            to={`/register${registerSearch}`}
            className="text-white hover:text-cyan-100 font-semibold transition-colors"
          >
            Sign up now
          </Link>
        </div>
      </div>
    </AuthShell>
  );
};

export default Login;
