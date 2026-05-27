import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import GlowBackground from '../components/GlowBackground';
import { Lock, Sparkles, ArrowLeft } from 'lucide-react';

const ResetPassword = () => {
  const { token } = useParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const { resetPassword } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password || !confirmPassword) {
      showNotification('Please fill in all fields', 'error');
      return;
    }
    if (password.length < 6) {
      showNotification('Password must be at least 6 characters long', 'error');
      return;
    }
    if (password !== confirmPassword) {
      showNotification('Passwords do not match', 'error');
      return;
    }

    setLoading(true);
    const result = await resetPassword(token, password);
    setLoading(false);

    if (result.success) {
      showNotification('Password reset successfully! Log in with your new password.', 'success');
      navigate('/login');
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
            <Lock className="w-6 h-6 animate-pulse" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-950">Create New Password</h2>
          <p className="text-slate-600 mt-2 text-sm">Please set your new marketplace password below</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="relative group">
            <div className="absolute left-3 top-3.5 text-slate-500 group-focus-within:text-slate-800 transition-colors">
              <Lock className="w-5 h-5" />
            </div>
            <input
              type="password"
              placeholder="New Password (min 6 chars)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className=" w-full field-surface py-3.5 pl-11 pr-4 text-slate-950 placeholder:text-slate-500 focus:outline-none focus:border-white/70 focus:ring-2 focus:ring-white/45 transition-all duration-300"
            />
          </div>

          <div className="relative group">
            <div className="absolute left-3 top-3.5 text-slate-500 group-focus-within:text-slate-800 transition-colors">
              <Lock className="w-5 h-5" />
            </div>
            <input
              type="password"
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
              'Reset Password'
            )}
          </button>
        </form>

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

export default ResetPassword;
