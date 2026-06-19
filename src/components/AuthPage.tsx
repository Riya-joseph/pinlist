import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { motion } from 'motion/react';
import { LogIn, UserPlus, Mail, Lock, AlertCircle, ArrowRight, Sparkles, Pin } from 'lucide-react';

interface AuthPageProps {
  onSuccess?: () => void;
  onContinueAsGuest?: () => void;
}

export function AuthPage({ onSuccess, onContinueAsGuest }: AuthPageProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    try {
      if (isResetMode) {
        if (!email) throw new Error('Please enter your email to reset password.');
        await sendPasswordResetEmail(auth, email);
        setInfo('Password reset instructions sent to your email.');
        setIsResetMode(false);
      } else if (isSignUp) {
        if (!displayName.trim()) throw new Error('Nickname/Name is required.');
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCred.user, { displayName: displayName.trim() });
        if (onSuccess) onSuccess();
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      let msg = err.message;
      if (err.code === 'auth/invalid-credential') {
        msg = 'Invalid email or password. Please try again.';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'This email is already registered.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password should be at least 6 characters.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || 'Google Auth failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] text-slate-800 p-6 relative overflow-hidden font-sans">
      {/* Absolute Decorative Blobs */}
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-indigo-200/20 blur-3xl" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-emerald-200/20 blur-3xl" />

      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 shadow-xl relative z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-100 mb-3 rotate-6 hover:rotate-12 transition-transform">
            <Pin className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl font-display font-bold text-slate-800">
            PinList
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-sans text-center">
            {isResetMode 
              ? 'Reset your account security credentials' 
              : isSignUp 
                ? 'Create a free space to collaborate in real time' 
                : 'Your beautiful dashboard & dynamic collections'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 text-xs flex items-start gap-2.5 animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {info && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-xs flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{info}</span>
          </div>
        )}

        <form onSubmit={handleEmailAuth} className="space-y-4">
          {!isResetMode && isSignUp && (
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                Nickname / Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="e.g. Marie Curie"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 pl-10 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 transition-all font-sans focus:border-indigo-600 shadow-sm"
                />
                <UserPlus className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 pl-10 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 transition-all font-sans focus:border-indigo-600 shadow-sm"
              />
              <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
            </div>
          </div>

          {!isResetMode && (
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => { setIsResetMode(true); setError(null); }}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-bold"
                >
                  Forgot?
                </button>
              </div>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 pl-10 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 transition-all font-sans focus:border-indigo-600 shadow-sm"
                />
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 text-sm font-sans"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : isResetMode ? (
              <>Send Reset Instructions <ArrowRight className="w-4 h-4" /></>
            ) : isSignUp ? (
              <>Sign Up Free <UserPlus className="w-4 h-4" /></>
            ) : (
              <>Log In <LogIn className="w-4 h-4" /></>
            )}
          </button>
        </form>

        {!isResetMode && (
          <div className="mt-5 text-center">
            <span className="text-xs text-slate-400">
              {isSignUp ? 'Already registered?' : 'Brand new to PinList?'}
            </span>
            <button
              onClick={() => { setIsSignUp(!isSignUp); setError(null); }}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 ml-1.5 focus:outline-none cursor-pointer"
            >
              {isSignUp ? 'Sign in instead' : 'Create an account'}
            </button>
          </div>
        )}

        {isResetMode && (
          <div className="mt-5 text-center">
            <button
              onClick={() => { setIsResetMode(false); setError(null); }}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 focus:outline-none cursor-pointer"
            >
              Go back to sign in
            </button>
          </div>
        )}

        <div className="relative my-7">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-3.5 text-slate-400 font-bold tracking-wider">Or continue with</span>
          </div>
        </div>

        <button
          onClick={handleGoogleAuth}
          disabled={loading}
          type="button"
          className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold py-3 rounded-xl flex items-center justify-center gap-2.5 cursor-pointer hover:border-slate-300 transition-all text-sm font-sans shadow-sm"
        >
          <img 
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/action/google.svg" 
            alt="Google" 
            className="w-4 h-4" 
            referrerPolicy="no-referrer"
          />
          Google Account
        </button>

        {onContinueAsGuest && (
          <div className="text-center mt-6 pt-4 border-t border-slate-100">
            <button
              onClick={onContinueAsGuest}
              className="text-slate-500 hover:text-slate-800 text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5 mx-auto hover:underline"
            >
              🚀 Browse lists as Guest / anonymous user
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
