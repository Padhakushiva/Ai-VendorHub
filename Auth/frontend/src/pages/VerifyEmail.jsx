import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import GlowBackground from '../components/GlowBackground';
import { ShieldCheck, AlertCircle, Loader, ArrowRight } from 'lucide-react';

const VerifyEmail = () => {
  const { token } = useParams();
  const { verifyEmail } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();

  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('Verifying your email, please wait...');

  useEffect(() => {
    const startVerification = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Invalid verification link. Missing token.');
        return;
      }

      try {
        // Wait a second to show the nice loading state/animations
        await new Promise((resolve) => setTimeout(resolve, 1500));
        
        const result = await verifyEmail(token);
        if (result.success) {
          setStatus('success');
          setMessage(result.message || 'Your email has been verified successfully!');
          showNotification('Email verified successfully!', 'success');
        } else {
          setStatus('error');
          setMessage(result.message || 'Verification link expired or invalid.');
          showNotification(result.message || 'Verification failed', 'error');
        }
      } catch (err) {
        setStatus('error');
        setMessage('An unexpected error occurred during verification.');
      }
    };

    startVerification();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <GlowBackground />

      <div className="w-full max-w-md bg-white/30 border border-white/60 backdrop-blur-xl rounded-2xl p-8 shadow-2xl animate-scale-in text-center relative overflow-hidden">
        {/* Subtle decorative glowing corner */}
        <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-white/55 blur-3xl" />

        {/* VERIFYING */}
        {status === 'verifying' && (
          <div className="space-y-6 py-6">
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-white/70 border-t-indigo-500 rounded-full animate-spin" />
                <Loader className="w-6 h-6 text-slate-800 absolute top-5 left-5 animate-pulse" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-slate-950">Verifying Email</h3>
            <p className="text-slate-600 text-sm max-w-xs mx-auto">{message}</p>
          </div>
        )}

        {/* SUCCESS */}
        {status === 'success' && (
          <div className="space-y-6 py-6 animate-fade-in">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center text-emerald-700 animate-bounce">
                <ShieldCheck className="w-8 h-8" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-slate-950">Email Verified!</h3>
            <p className="text-slate-700 text-sm max-w-xs mx-auto">{message}</p>
            <div className="pt-4">
              <Link
                to="/profile"
                className="inline-flex items-center justify-center gap-2 bg-slate-950 hover:bg-slate-800 text-slate-950 font-medium px-6 py-3 rounded-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-950/20 active:translate-y-0"
              >
                Go to Profile
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {/* ERROR */}
        {status === 'error' && (
          <div className="space-y-6 py-6 animate-fade-in">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/30 rounded-full flex items-center justify-center text-rose-400 animate-pulse">
                <AlertCircle className="w-8 h-8" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-slate-950">Verification Failed</h3>
            <p className="text-rose-700/80 text-sm max-w-xs mx-auto">{message}</p>
            <div className="pt-4 flex flex-col gap-3">
              <Link
                to="/profile"
                className="bg-slate-950 hover:bg-slate-800 text-slate-950 font-medium py-3 rounded-xl transition-all duration-300 hover:-translate-y-0.5"
              >
                Go to Dashboard
              </Link>
              <Link
                to="/login"
                className="text-slate-800 hover:text-slate-950 text-sm font-semibold transition-colors"
              >
                Back to Sign In
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
