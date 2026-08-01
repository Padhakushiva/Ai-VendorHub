import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import AuthShell from '../components/AuthShell';
import { Mail, ArrowLeft, KeyRound, Check, RefreshCw } from 'lucide-react';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const { forgotPassword } = useAuth();
  const { showNotification } = useNotification();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      showNotification('Please enter a valid email address', 'error');
      return;
    }

    setLoading(true);
    const result = await forgotPassword(email);
    setLoading(false);

    if (result.success) {
      setIsSubmitted(true);
      showNotification('Reset instructions sent to your email!', 'success');
    } else {
      showNotification(result.message || 'Request failed', 'error');
    }
  };

  return (
    <AuthShell>
      <div className="premium-panel relative w-full overflow-hidden rounded-[2rem] p-6 shadow-2xl animate-slide-up">
        {/* Subtle decorative glowing corner */}
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl" />

        {isSubmitted ? (
          <div className="py-6 text-center animate-fade-in space-y-5">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 shadow-sm">
              <Check className="h-8 w-8 stroke-[3]" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-stone-950">Check Your Email</h3>
              <p className="mt-2 text-xs font-semibold text-stone-600 leading-relaxed max-w-sm mx-auto">
                We sent a password recovery link to <span className="font-extrabold text-emerald-700">{email}</span>. Click the link in the email to reset your password.
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setIsSubmitted(false)}
                className="inline-flex items-center justify-center gap-2 text-xs font-black text-stone-600 hover:text-stone-950 transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Re-enter email address
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-stone-300 bg-white text-stone-900 shadow-sm">
                <KeyRound className="h-7 w-7 text-emerald-600" />
              </div>
              <h2 className="text-3xl font-black leading-none tracking-tight text-stone-950 text-center">Forgot Password?</h2>
              <p className="mt-2 text-xs font-semibold leading-relaxed text-stone-600 text-center">
                No worries! Enter your account email below and we will send you a recovery link.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="relative group">
                <div className="absolute left-3.5 top-3.5 text-stone-400 group-focus-within:text-emerald-700 transition-colors">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  type="email"
                  placeholder="Enter your registered email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full field-surface py-3.5 pl-11 pr-4"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={loading || !email}
                className="liquid-button flex w-full items-center justify-center gap-2 py-3.5"
              >
                {loading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </form>
          </div>
        )}

        <div className="mt-6 text-center text-xs font-bold text-stone-600 border-t border-stone-200/80 pt-4">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-stone-700 hover:text-stone-950 font-extrabold transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Sign In
          </Link>
        </div>
      </div>
    </AuthShell>
  );
};

export default ForgotPassword;
