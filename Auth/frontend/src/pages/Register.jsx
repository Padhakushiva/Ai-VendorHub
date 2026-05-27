import React, { useEffect, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import AuthShell from '../components/AuthShell';
import { User, Mail, Lock, FileText, MapPin, Phone, ArrowRight, ArrowLeft, Store, ShoppingBag } from 'lucide-react';
import { getRedirectFromSearch, goAfterAuth, rememberRedirect } from '../utils/redirect';

const Register = () => {
  const [isSeller, setIsSeller] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form Fields
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  // Address Fields (User only)
  const [addressLine, setAddressLine] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [phone, setPhone] = useState('');

  const { registerUser, registerSeller } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.has('role')) {
      setIsSeller(params.get('role') === 'seller' || params.get('role') === 'merchant');
      setStep(1);
    }
    rememberRedirect(getRedirectFromSearch(location.search));
  }, [location.search]);

  const validateStep = () => {
    if (step === 1) {
      if (!username || !email || !password) {
        showNotification('Please fill in all credentials', 'error');
        return false;
      }
      if (username.length < 3) {
        showNotification('Username must be at least 3 characters long', 'error');
        return false;
      }
      if (!email.includes('@')) {
        showNotification('Please enter a valid email address', 'error');
        return false;
      }
      if (password.length < 6) {
        showNotification('Password must be at least 6 characters long', 'error');
        return false;
      }
    } else if (step === 2) {
      if (!firstName || !lastName) {
        showNotification('Please enter your first and last name', 'error');
        return false;
      }
    } else if (step === 3 && !isSeller) {
      if (!addressLine || !city || !state || !pincode || !phone) {
        showNotification('Please fill in all address details', 'error');
        return false;
      }
      if (!/^\d{6}$/.test(pincode)) {
        showNotification('Pincode must be exactly 6 digits', 'error');
        return false;
      }
      if (!/^\d{10}$/.test(phone)) {
        showNotification('Phone number must be exactly 10 digits', 'error');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep()) {
      if (step === 2 && isSeller) {
        // Sellers submit on step 2
        handleSubmit();
      } else {
        setStep((s) => s + 1);
      }
    }
  };

  const handleBack = () => {
    setStep((s) => s - 1);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!validateStep()) return;

    setLoading(true);

    let result;
    if (isSeller) {
      result = await registerSeller({
        username,
        email,
        password,
        fullName: { firstName, lastName },
        role: 'seller'
      });
    } else {
      result = await registerUser({
        username,
        email,
        password,
        fullName: { firstName, lastName },
        role: 'user',
        address: { addressLine, city, state, pincode, phone }
      });
    }

    setLoading(false);

    if (result.success) {
      showNotification('Registration successful! Verification email sent.', 'success');
      
      // Developer Mode notification
      if (result.devToken) {
        console.log('Verification Token (Dev Mode Only):', result.devToken);
        showNotification(`[DEV MODE] Verification token: ${result.devToken}`, 'info');
      }

      goAfterAuth(navigate, {
        ...(result.user || {}),
        role: isSeller ? 'seller' : (result.user?.role || 'user'),
      }, result.accessToken || result.token);
    } else {
      showNotification(result.message, 'error');
    }
  };

  const handleGoogleSignup = () => {
    rememberRedirect(getRedirectFromSearch(location.search));
    window.location.href = `/api/auth/google?role=${isSeller ? 'seller' : 'user'}`;
  };

  const loginSearch = (() => {
    const params = new URLSearchParams(location.search);
    params.set('role', isSeller ? 'seller' : 'user');
    return `?${params.toString()}`;
  })();

  const totalSteps = isSeller ? 2 : 3;

  return (
    <AuthShell
      title="Create Your AI Commerce Account"
      subtitle="Join as a buyer or merchant and connect with AI products, secure payments, smart carts and marketplace intelligence."
    >
      <div className="w-full premium-panel rounded-[2rem] p-6 shadow-2xl animate-slide-up relative overflow-hidden">
        {/* Subtle decorative glowing corner */}
        <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-amber-300/15 blur-3xl" />

        {/* Header */}
        <div className="mb-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="glass-icon h-11 w-11">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-white/42">Marketplace access</p>
              <p className="text-sm font-bold text-white">Ai-VendorHub</p>
            </div>
          </div>
          <h2 className="text-3xl font-black leading-none tracking-tight text-white sm:text-4xl">Create account</h2>
          <p className="text-white/52 mt-3 text-sm">Choose buyer or merchant and create your account securely.</p>
        </div>

        {/* Role Selection (Only allowed on Step 1) */}
        {step === 1 && (
          <>
          <p className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-white/40">Account type</p>
          <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/12 bg-white/6 p-1.5 shadow-inner shadow-white/5 mb-5">
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
          </>
        )}

        {/* Progress Stepper */}
        <div className="flex items-center justify-between mb-6 px-4">
          {[...Array(totalSteps)].map((_, i) => (
            <React.Fragment key={i}>
              <div className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-all duration-300 ${
                    step > i + 1
                       ? 'bg-white/16 border-white/20 text-white'
                      : step === i + 1
                      ? 'border-white/20 bg-white/10 text-white ring-4 ring-white/8'
                      : 'border-white/12 bg-white/6 text-white/35'
                  }`}
                >
                  {i + 1}
                </div>
                <span
                  className={`ml-2 text-xs font-semibold hidden sm:inline ${
                    step === i + 1 ? 'text-white' : 'text-white/35'
                  }`}
                >
                  {i === 0 ? 'Credentials' : i === 1 ? 'Personal Info' : 'Address'}
                </span>
              </div>
              {i < totalSteps - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 transition-colors duration-300 ${
                    step > i + 1 ? 'bg-white/32' : 'bg-white/10'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Form Body */}
        <div className="min-h-[205px]">
          {/* STEP 1: CREDENTIALS */}
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div className="relative group">
                <div className="absolute left-3 top-3.5 text-white/38 group-focus-within:text-white transition-colors">
                  <User className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full field-surface py-3.5 pl-11 pr-4"
                />
              </div>

              <div className="relative group">
                <div className="absolute left-3 top-3.5 text-white/38 group-focus-within:text-white transition-colors">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  type="email"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full field-surface py-3.5 pl-11 pr-4"
                />
              </div>

              <div className="relative group">
                <div className="absolute left-3 top-3.5 text-white/38 group-focus-within:text-white transition-colors">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type="password"
                  placeholder="Password (min 6 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full field-surface py-3.5 pl-11 pr-4"
                />
              </div>
            </div>
          )}

          {/* STEP 2: PERSONAL INFO */}
          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div className="relative group">
                <div className="absolute left-3 top-3.5 text-white/38 group-focus-within:text-white transition-colors">
                  <FileText className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  placeholder="First Name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full field-surface py-3.5 pl-11 pr-4"
                />
              </div>

              <div className="relative group">
                <div className="absolute left-3 top-3.5 text-white/38 group-focus-within:text-white transition-colors">
                  <FileText className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  placeholder="Last Name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full field-surface py-3.5 pl-11 pr-4"
                />
              </div>
            </div>
          )}

          {/* STEP 3: ADDRESS (User only) */}
          {step === 3 && !isSeller && (
            <div className="space-y-4 animate-fade-in">
              <div className="relative group">
                <div className="absolute left-3 top-3.5 text-white/38 group-focus-within:text-white transition-colors">
                  <MapPin className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  placeholder="Street Address Line"
                  value={addressLine}
                  onChange={(e) => setAddressLine(e.target.value)}
                  className="w-full field-surface py-3.5 pl-11 pr-4"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="relative group">
                  <input
                    type="text"
                    placeholder="City"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full field-surface py-3.5 px-4"
                  />
                </div>
                <div className="relative group">
                  <input
                    type="text"
                    placeholder="State"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full field-surface py-3.5 px-4"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="relative group">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="Pincode (6 digits)"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    className="w-full field-surface py-3.5 px-4"
                  />
                </div>
                <div className="relative group">
                  <div className="absolute left-3 top-3.5 text-white/38 group-focus-within:text-white transition-colors">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    maxLength={10}
                    placeholder="Phone (10 digits)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full field-surface py-3.5 pl-9 pr-4"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Buttons Controls */}
        <div className="flex gap-4 mt-6">
          {step > 1 && (
            <button
              type="button"
              onClick={handleBack}
              className="flex-1 glass-button py-3.5 rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          )}

          {step < totalSteps ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex-1 liquid-button py-3.5 rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-950/20 active:translate-y-0"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 liquid-button py-3.5 rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-950/20 active:translate-y-0 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Create Account'
              )}
            </button>
          )}
        </div>

        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/12" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[#17191e]/80 px-3 text-white/38 backdrop-blur-xl">Or sign up instantly</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignup}
          className="w-full glass-button py-3 flex items-center justify-center gap-3 group"
        >
          <svg className="w-5 h-5 transition-transform group-hover:scale-110" viewBox="0 0 24 24" width="24" height="24">
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
          </svg>
          Continue with Google
        </button>

        {/* Footer Link */}
        <div className="mt-6 text-center text-sm text-white/50">
          Already have an account?{' '}
          <Link
            to={`/login${loginSearch}`}
            className="text-white hover:text-cyan-100 font-semibold transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>
    </AuthShell>
  );
};

export default Register;
