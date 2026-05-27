import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import GlowBackground from '../components/GlowBackground';
import { Mail, Sparkles, ArrowLeft, Key } from 'lucide-react';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [devToken, setDevToken] = useState('');

  const { forgotPassword } = useAuth();
  const { showNotification } = useNotification();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      showNotification('Email is required', 'error');
      return;
    }

    setLoading(true);
    const result = await forgotPassword(email);
    setLoading(false);

    if (result.success) {
      showNotification('Reset instructions sent to your email!', 'success');
      if (result.devToken) {
        setDevToken(result.devToken);
        showNotification(`[DEV MODE] Password reset token generated.`, 'info');
      }
    } else {
      showNotification(result.message, 'error');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <GlowBackground />

      <div className="w-full max-w-md bg-white/30 border border-white/60 backdrop-blur-xl rounded-2xl p-8 shadow-2xl animate-slide-up relative overflow-hidden">
        {/* Subtle decorative glowing corner */}
        <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-white/55 blur-3xl" />

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex glass-icon h-14 w-14 mb-4">
            <Key className="w-6 h-6 animate-pulse" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-950">Reset Password</h2>
          <p className="text-slate-600 mt-2 text-sm">Enter your email to receive recovery instructions</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="relative group">
            <div className="absolute left-3 top-3.5 text-slate-500 group-focus-within:text-slate-800 transition-colors">
              <Mail className="w-5 h-5" />
            </div>
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className=" w-full field-surface py-3.5 pl-11 pr-4 text-slate-950 placeholder:text-slate-500 focus:outline-none focus:border-white/70 focus:ring-2 focus:ring-white/45 transition-all duration-300"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-950 hover:bg-slate-800 text-slate-950 font-medium py-3.5 rounded-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-950/20 active:translate-y-0 flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Send Reset Link'
            )}
          </button>
        </form>

        {/* Dev Mode Assistant */}
        {devToken && (
          <div className="mt-6 p-4  premium-panel rounded-xl animate-fade-in text-left">
            <h4 className="text-slate-800 text-xs font-semibold uppercase tracking-wider mb-2">Developer Helper</h4>
            <p className="text-slate-700 text-xs mb-3">
              Since you are running locally, click the link below to directly open the password reset page:
            </p>
            <Link
              to={`/reset-password/${devToken}`}
              className="text-xs text-emerald-700 hover:underline font-medium break-all block"
            >
              /reset-password/{devToken}
            </Link>
          </div>
        )}

        {/* Footer Link */}
        <div className="mt-8 text-center text-sm text-slate-600">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-slate-800 hover:text-slate-950 font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
