import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import AuthShell from '../components/AuthShell';
import { Lock, ArrowLeft, Eye, EyeOff, CheckCircle2, ShieldCheck, Check } from 'lucide-react';

const ResetPassword = () => {
  const { token } = useParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isResetSuccess, setIsResetSuccess] = useState(false);

  const { resetPassword } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();

  // Interactive Password Strength Calculation
  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: '', color: 'bg-stone-200' };
    let score = 0;
    if (password.length >= 6) score += 1;
    if (password.length >= 10) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    if (score <= 2) return { score: 33, label: 'Weak', color: 'bg-amber-500' };
    if (score <= 4) return { score: 66, label: 'Good', color: 'bg-teal-500' };
    return { score: 100, label: 'Strong', color: 'bg-emerald-600' };
  }, [password]);

  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

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
      setIsResetSuccess(true);
      showNotification('Password reset successfully! Log in with your new password.', 'success');
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } else {
      showNotification(result.message || 'Password reset failed', 'error');
    }
  };

  return (
    <AuthShell>
      <div className="premium-panel relative w-full overflow-hidden rounded-[2rem] p-6 shadow-2xl animate-slide-up">
        {/* Subtle decorative glowing corner */}
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl" />

        {isResetSuccess ? (
          <div className="py-12 flex items-center justify-center gap-3 text-emerald-600 animate-fade-in">
            <Check className="h-8 w-8 stroke-[3]" />
            <span className="text-3xl font-black tracking-tight">Success</span>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-stone-300 bg-white text-stone-900 shadow-sm">
                <ShieldCheck className="h-7 w-7 text-emerald-600" />
              </div>
              <h2 className="text-3xl font-black leading-none tracking-tight text-stone-950 text-center">Set New Password</h2>
              <p className="mt-2 text-xs font-semibold leading-relaxed text-stone-600 text-center">
                Please enter a secure new password for your account.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* New Password */}
              <div>
                <div className="relative group">
                  <div className="absolute left-3.5 top-3.5 text-stone-400 group-focus-within:text-emerald-700 transition-colors">
                    <Lock className="h-5 w-5" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="New Password (min 6 characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full field-surface py-3.5 pl-11 pr-11"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-stone-400 hover:text-stone-700 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>

                {/* Password Strength Meter */}
                {password.length > 0 && (
                  <div className="mt-2 space-y-1 animate-fade-in">
                    <div className="h-1.5 w-full bg-stone-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${passwordStrength.color} transition-all duration-300`}
                        style={{ width: `${passwordStrength.score}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] font-black text-stone-500 uppercase tracking-wider">
                      <span>Strength</span>
                      <span className="font-extrabold text-stone-900">{passwordStrength.label}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <div className="relative group">
                  <div className="absolute left-3.5 top-3.5 text-stone-400 group-focus-within:text-emerald-700 transition-colors">
                    <Lock className="h-5 w-5" />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm New Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full field-surface py-3.5 pl-11 pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-3.5 text-stone-400 hover:text-stone-700 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>

                {confirmPassword.length > 0 && (
                  <p className={`mt-1.5 text-xs font-extrabold flex items-center gap-1 ${passwordsMatch ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {passwordsMatch ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" /> Passwords match
                      </>
                    ) : (
                      '⚠️ Passwords do not match'
                    )}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !password || !confirmPassword || !passwordsMatch}
                className="liquid-button flex w-full items-center justify-center gap-2 py-3.5 mt-2"
              >
                {loading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  'Reset Password & Sign In'
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

export default ResetPassword;
