import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import AuthShell from '../components/AuthShell';
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Lock,
  ShieldCheck,
  ShoppingBag,
  Store,
  User,
} from 'lucide-react';
import { getRedirectFromSearch, goAfterAuth, rememberRedirect } from '../utils/redirect';

const roleOptions = [
  {
    value: 'user',
    label: 'User',
    title: 'User',
    icon: ShoppingBag,
    accent: 'from-emerald-50 via-white to-amber-50',
    ring: 'ring-emerald-700/10',
    cta: 'Login as User',
  },
  {
    value: 'seller',
    label: 'Seller',
    title: 'Seller',
    icon: Store,
    accent: 'from-amber-50 via-white to-stone-50',
    ring: 'ring-amber-700/10',
    cta: 'Login as Seller',
  },
  {
    value: 'admin',
    label: 'Admin',
    title: 'Admin',
    icon: ShieldCheck,
    accent: 'from-stone-100 via-white to-emerald-50',
    ring: 'ring-stone-900/10',
    cta: 'Login as Admin',
  },
];

const googleIcon = (
  <svg className="h-5 w-5 transition-transform group-hover:scale-110" viewBox="0 0 24 24" width="24" height="24">
    <path d="M21.35,11.1H12v2.7h5.38c-0.24,1.28 -0.96,2.37 -2.04,3.1v2.58h3.3c1.93,-1.78 3.04,-4.4 3.04,-7.48C21.68,11.83 21.56,11.4 21.35,11.1z" fill="#4285F4" />
    <path d="M12,20.76c2.37,0 4.35,-0.78 5.8,-2.13l-3.3,-2.58c-0.91,0.61 -2.08,0.97 -3.3,0.97 -2.28,0 -4.22,-1.54 -4.91,-3.61H2.88v2.66C4.33,18.94 7.94,20.76 12,20.76z" fill="#34A853" />
    <path d="M7.09,13.41c-0.17,-0.52 -0.27,-1.08 -0.27,-1.66s0.1,-1.14 0.27,-1.66V7.43H2.88c-0.57,1.14 -0.88,2.42 -0.88,3.77s0.31,2.63 0.88,3.77L7.09,13.41z" fill="#FBBC05" />
    <path d="M12,6.86c1.28,0 2.44,0.44 3.35,1.31l2.51,-2.51C16.34,4.24 14.35,3.48 12,3.48c-4.06,0 -7.67,1.82 -9.12,4.8L7.09,9.8c0.69,-2.07 2.63,-3.61 4.91,-3.61z" fill="#EA4335" />
  </svg>
);

const Login = () => {
  const [accountType, setAccountType] = useState('user');
  const [step, setStep] = useState('choose');
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLoginSuccess, setIsLoginSuccess] = useState(false);

  const { login } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();

  const activeRole = useMemo(
    () => roleOptions.find((option) => option.value === accountType) || roleOptions[0],
    [accountType],
  );

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const redirectUrl = getRedirectFromSearch(location.search);
    rememberRedirect(redirectUrl);

    if (params.has('role')) {
      const role = String(params.get('role') || '').toLowerCase();
      setAccountType(role === 'admin' ? 'admin' : (role === 'seller' || role === 'merchant') ? 'seller' : 'user');
      setStep('login');
    }

    if (params.get('google') === 'failed') {
      showNotification('Google login failed. Please try again with a valid Google account.', 'error');
      navigate('/login', { replace: true });
    }
  }, [location.search, navigate, showNotification]);

  const selectRole = (value) => {
    setAccountType(value);
    setStep('login');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!emailOrUsername || !password) {
      showNotification('Please fill in all fields', 'error');
      return;
    }

    setLoading(true);
    const result = await login(emailOrUsername, password, accountType);
    setLoading(false);

    if (result.success) {
      setIsLoginSuccess(true);
      showNotification(`Welcome back, ${result.user?.username || 'user'}!`, 'success');
      setTimeout(() => {
        goAfterAuth(navigate, {
          ...(result.user || {}),
          role: accountType === 'admin' ? 'admin' : accountType === 'seller' ? 'seller' : (result.user?.role || 'user'),
        }, result.accessToken || result.token);
      }, 1500);
    } else {
      showNotification(result.message, 'error');
    }
  };

  const handleGoogleLogin = () => {
    rememberRedirect(getRedirectFromSearch(location.search));
    const backendUrl = import.meta.env.VITE_AUTH_API_URL || 'http://localhost:3001';
    window.location.href = `${backendUrl}/api/auth/google?role=${accountType}`;
  };

  const registerSearch = (() => {
    const params = new URLSearchParams(location.search);
    params.set('role', accountType === 'seller' ? 'seller' : 'user');
    return `?${params.toString()}`;
  })();

  return (
    <AuthShell>
      <div className="premium-panel relative w-full overflow-hidden rounded-[2rem] p-5 animate-slide-up sm:p-6">
        <div className={`absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-to-br ${activeRole.accent} opacity-70 blur-3xl`} />

        {isLoginSuccess ? (
          <div className="py-12 flex items-center justify-center gap-3 text-emerald-600 animate-fade-in">
            <Check className="h-8 w-8 stroke-[3]" />
            <span className="text-3xl font-black tracking-tight">Success</span>
          </div>
        ) : (
          <div>
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-2xl border border-stone-900 bg-stone-950 px-3.5 py-2 text-white shadow-md">
                  <Bot className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm font-black text-white">Ai-VendorHub</span>
                </div>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-700">
                  {step === 'choose' ? 'Choose access' : 'Secure sign in'}
                </p>
                <h2 className="mt-2 text-3xl font-black leading-none tracking-tight text-stone-950 sm:text-4xl">
                  {step === 'choose' ? 'Choose account' : `${activeRole.title} Login`}
                </h2>
                <p className="mt-3 text-sm font-semibold leading-6 text-stone-600">
                  {step === 'choose' ? 'Select User, Seller, or Admin.' : `Sign in as ${activeRole.title}.`}
                </p>
              </div>

              {step === 'login' && (
                <button
                  type="button"
                  onClick={() => setStep('choose')}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-stone-300 bg-white text-stone-700 shadow-sm transition hover:bg-stone-100 hover:text-stone-950"
                  aria-label="Choose another account type"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              )}
            </div>

            <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl border border-stone-300/80 bg-stone-200/70 p-1.5 text-xs font-black uppercase tracking-[0.14em]">
              <span className={`rounded-xl px-3 py-2 text-center transition ${step === 'choose' ? 'bg-white text-stone-950 shadow-sm font-black' : 'text-stone-600 font-bold'}`}>1. Role</span>
              <span className={`rounded-xl px-3 py-2 text-center transition ${step === 'login' ? 'bg-white text-stone-950 shadow-sm font-black' : 'text-stone-600 font-bold'}`}>2. Login</span>
            </div>

            {step === 'choose' ? (
              <div className="grid gap-3">
                {roleOptions.map((role) => (
                  <RoleCard key={role.value} role={role} active={accountType === role.value} onClick={() => selectRole(role.value)} />
                ))}
              </div>
            ) : (
              <div className="space-y-5">
                <div className={`rounded-[1.5rem] border border-stone-200 bg-white p-4 shadow-sm ring-1 ${activeRole.ring}`}>
                  <div className="flex items-center gap-3">
                    <div className="glass-icon h-12 w-12 text-emerald-700">
                      <activeRole.icon className="h-5 w-5 text-emerald-700" />
                    </div>
                    <div>
                      <p className="text-lg font-black text-stone-950">{activeRole.title}</p>
                      <p className="text-xs font-semibold text-stone-600">Selected login type</p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="relative group">
                    <div className="absolute left-3 top-3.5 text-stone-500 transition-colors group-focus-within:text-emerald-700">
                      <User className="h-5 w-5" />
                    </div>
                    <input
                      type="text"
                      placeholder={accountType === 'admin' ? 'Admin email or username' : 'Username or email'}
                      value={emailOrUsername}
                      onChange={(event) => setEmailOrUsername(event.target.value)}
                      className="field-surface w-full py-3.5 pl-11 pr-4"
                    />
                  </div>

                  <div className="relative group">
                    <div className="absolute left-3 top-3.5 text-stone-500 transition-colors group-focus-within:text-emerald-700">
                      <Lock className="h-5 w-5" />
                    </div>
                    <input
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="field-surface w-full py-3.5 pl-11 pr-4"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <RoleMiniSwitch accountType={accountType} setAccountType={setAccountType} />
                    <Link to="/forgot-password" className="shrink-0 text-xs font-bold text-stone-600 transition-colors hover:text-emerald-700">
                      Forgot password?
                    </Link>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="liquid-button flex w-full items-center justify-center gap-2 py-3.5 group"
                  >
                    {loading ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <>
                        {activeRole.cta}
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-stone-300" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white/90 px-3 font-semibold text-stone-500">Or continue with</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="glass-button group flex w-full items-center justify-center gap-3 py-3"
                >
                  {googleIcon}
                  Google as {activeRole.label}
                </button>

                <div className="text-center text-sm font-semibold text-stone-600">
                  {accountType === 'admin' ? (
                    <span>Admin accounts are issued by the platform owner.</span>
                  ) : (
                    <>
                      New here?{' '}
                      <Link to={`/register${registerSearch}`} className="font-extrabold text-stone-950 transition-colors hover:text-emerald-700">
                        Create {accountType === 'seller' ? 'seller' : 'user'} account
                      </Link>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AuthShell>
  );
};

const RoleCard = ({ role, active, onClick }) => {
  const Icon = role.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative overflow-hidden rounded-[1.5rem] border p-4 text-left transition-all duration-300 hover:-translate-y-1 ${
        active ? 'border-stone-900 bg-white shadow-[0_12px_28px_rgba(28,25,23,0.12)] ring-2 ring-emerald-700/20' : 'border-stone-200 bg-white/80 hover:bg-white hover:border-stone-400 shadow-sm'
      }`}
    >
      <div className="relative flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-stone-200 bg-white text-emerald-700 shadow-sm">
            <Icon className="h-5 w-5 text-emerald-700" />
          </div>
          <div>
            <h3 className="text-xl font-black text-stone-950">{role.title}</h3>
            <p className="text-xs font-semibold text-stone-600">Access {role.title} Portal</p>
          </div>
        </div>
        <div className="grid h-9 w-9 place-items-center rounded-full border border-stone-200 bg-stone-100 text-stone-700 transition group-hover:translate-x-1 group-hover:bg-stone-950 group-hover:text-white">
          <ArrowRight className="h-4 w-4" />
        </div>
      </div>
    </button>
  );
};

const RoleMiniSwitch = ({ accountType, setAccountType }) => (
  <div className="flex min-w-0 rounded-full border border-stone-300 bg-stone-100 p-1">
    {roleOptions.map((role) => (
      <button
        key={role.value}
        type="button"
        onClick={() => setAccountType(role.value)}
        className={`rounded-full px-3 py-1.5 text-[11px] font-black transition ${
          accountType === role.value ? 'bg-stone-950 text-white shadow-sm' : 'text-stone-600 hover:text-stone-950'
        }`}
      >
        {role.label}
      </button>
    ))}
  </div>
);

export default Login;
