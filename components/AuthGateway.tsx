
import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, UserPlus, LogIn, ShieldCheck, AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { loginWithEmail, registerWithEmail, loginWithGoogle, resetPassword } from '../services/firebase';

interface AuthGatewayProps {
  onLogin: (email: string) => void;
}

const AuthGateway: React.FC<AuthGatewayProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const toggleMode = (login: boolean) => {
    setIsLogin(login);
    setError('');
    setPassword('');
    setConfirmPassword('');
  };

  const openForgotPassword = () => {
    setIsForgotPassword(true);
    setResetEmail(email);
    setError('');
  };

  const backToLogin = () => {
    setIsForgotPassword(false);
    setResetSent(false);
    setResetEmail('');
    setError('');
  };

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    const clean = resetEmail.trim().toLowerCase();
    if (!clean) { setError('Please enter your email address.'); return; }
    setResetLoading(true);
    try {
      await resetPassword(clean);
      setResetSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    if (!cleanEmail || !cleanPassword) { setError('Email and password are required.'); return; }
    if (!isLogin && cleanPassword !== confirmPassword) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      if (isLogin) {
        await loginWithEmail(cleanEmail, cleanPassword);
      } else {
        await registerWithEmail(cleanEmail, cleanPassword);
      }
      onLogin(cleanEmail);
    } catch (err: any) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      const user = await loginWithGoogle();
      onLogin(user.email || user.displayName || 'user');
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const renderForgotPassword = () => {
    if (resetSent) {
      return (
        <div className="text-center space-y-4 py-2 animate-in fade-in duration-300">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto">
            <Mail size={20} className="text-emerald-600" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-zinc-900">Check your inbox</p>
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              A reset link was sent to{' '}
              <span className="font-semibold text-zinc-700">{resetEmail}</span>.
              Follow the link to set a new password.
            </p>
          </div>
          <button
            type="button"
            onClick={backToLogin}
            className="text-[10px] font-black uppercase tracking-widest text-[#0070FF] hover:opacity-70 transition-opacity"
          >
            Back to Login
          </button>
        </div>
      );
    }

    return (
      <form onSubmit={handleResetPassword} className="space-y-4 animate-in fade-in duration-300">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-zinc-900">Reset your password</p>
          <p className="text-[11px] text-zinc-500">Enter your account email and we'll send a reset link.</p>
        </div>
        {error && (
          <div className="p-3 glass border border-red-500/20 rounded-xl flex items-start gap-2">
            <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-[10px] font-bold text-red-500 leading-relaxed">{error}</p>
          </div>
        )}
        <div className="space-y-1.5">
          <label className="text-[8px] font-black uppercase tracking-[0.3em] text-zinc-600 px-2">Email Address</label>
          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700 group-focus-within:text-[#0070FF] transition-all duration-500" size={16} />
            <input
              type="email"
              required
              placeholder="you@example.com"
              className="w-full glass border border-zinc-100 rounded-xl py-3 pl-11 pr-4 text-[13px] text-zinc-900 focus:border-[#0070FF]/50 transition-all duration-500 outline-none focus:ring-2 focus:ring-[#0070FF]/5 placeholder:text-zinc-700"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={resetLoading}
          className="w-full neon-bg text-black font-black py-4 rounded-xl flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all duration-500 text-[10px] uppercase tracking-[0.3em] disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {resetLoading
            ? <><Loader2 className="animate-spin" size={14} /> Sending...</>
            : <>Send Reset Link <ArrowRight size={14} /></>}
        </button>
        <button
          type="button"
          onClick={backToLogin}
          className="w-full text-center text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-600 transition-colors"
        >
          Back to Login
        </button>
      </form>
    );
  };

  return (
    <div className="h-screen w-full bg-white overflow-y-auto custom-scrollbar relative flex items-center justify-center p-6 text-zinc-900">
      <div className="fixed inset-0 grid-bg opacity-30 pointer-events-none"></div>
      <div className="fixed top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[#0070FF]/2 rounded-full blur-[160px] pointer-events-none"></div>

      <div className="w-full max-w-sm z-10 space-y-8 py-6">
        <div className="text-center space-y-4">
          <div className="relative inline-block group">
            <div className="relative w-20 h-20 neon-bg rounded-[1.8rem] flex items-center justify-center font-black text-black text-4xl mx-auto shadow-2xl transition-all duration-700 group-hover:rotate-12 group-hover:scale-105 select-none">
              O
            </div>
            <div className="absolute top-0 right-0 bg-white p-1.5 rounded-xl border border-zinc-100 shadow-xl z-20">
              <ShieldCheck className="text-[#0070FF]" size={12} />
            </div>
          </div>
          <div className="space-y-0.5">
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-900 leading-none font-display">
              Onyx <span className="text-[#0070FF]">Logic</span>
            </h2>
          </div>
        </div>

        <div className="glass p-5 md:p-6 rounded-[2.5rem] border border-black/5 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-white/5">
            <div className={`h-full neon-bg transition-all duration-1000 ease-in-out ${isLogin ? 'w-1/2' : 'w-full'}`}></div>
          </div>

          {isForgotPassword ? (
            <div className="space-y-5">
              {renderForgotPassword()}
            </div>
          ) : (
            <div className="space-y-0">
              <div className="flex gap-4 mb-6 border-b border-black/5 pb-3">
                <button
                  type="button"
                  onClick={() => toggleMode(true)}
                  className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em] transition-all duration-500 ${isLogin ? 'text-zinc-900 scale-105' : 'text-zinc-600 hover:text-zinc-600'}`}
                >
                  <LogIn size={12} /> Login
                </button>
                <button
                  type="button"
                  onClick={() => toggleMode(false)}
                  className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em] transition-all duration-500 ${!isLogin ? 'text-zinc-900 scale-105' : 'text-zinc-600 hover:text-zinc-600'}`}
                >
                  <UserPlus size={12} /> Register
                </button>
              </div>

              {error && (
                <div className="mb-5 p-3 glass border border-red-500/20 rounded-xl flex items-start gap-2 animate-in slide-in-from-top-1 duration-500">
                  <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-[8px] font-black text-red-500 uppercase tracking-widest leading-relaxed">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[8px] font-black uppercase tracking-[0.3em] text-zinc-600 px-2">Email Address</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700 group-focus-within:text-[#0070FF] transition-all duration-500" size={16} />
                    <input
                      type="email"
                      required
                      placeholder="you@example.com"
                      className="w-full glass border border-zinc-100 rounded-xl py-3 pl-11 pr-4 text-[13px] text-zinc-900 focus:border-[#0070FF]/50 transition-all duration-500 outline-none focus:ring-2 focus:ring-[#0070FF]/5 placeholder:text-zinc-700"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[8px] font-black uppercase tracking-[0.3em] text-zinc-600 px-2">Password</label>
                  <div className="relative group">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      className="w-full glass border border-zinc-100 rounded-xl py-3 px-11 text-[13px] text-zinc-900 focus:border-[#0070FF]/50 transition-all duration-500 outline-none focus:ring-2 focus:ring-[#0070FF]/5 placeholder:text-zinc-700"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700 group-focus-within:text-[#0070FF] transition-all duration-500" size={16} />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-700 hover:text-zinc-500 transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {isLogin && (
                    <div className="flex justify-end pr-1">
                      <button
                        type="button"
                        onClick={openForgotPassword}
                        className="text-[10px] font-semibold text-[#0070FF] hover:opacity-70 transition-opacity"
                      >
                        Forgot password?
                      </button>
                    </div>
                  )}
                </div>

                {!isLogin && (
                  <div className="space-y-1.5 animate-in slide-in-from-top-1 fade-in duration-500">
                    <label className="text-[8px] font-black uppercase tracking-[0.3em] text-zinc-600 px-2">Confirm Password</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700 group-focus-within:text-[#0070FF] transition-all duration-500" size={16} />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="••••••••"
                        className="w-full glass border border-zinc-100 rounded-xl py-3 pl-11 pr-4 text-[13px] text-zinc-900 focus:border-[#0070FF]/50 transition-all duration-500 outline-none focus:ring-2 focus:ring-[#0070FF]/5 placeholder:text-zinc-700"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full neon-bg text-black font-black py-4 rounded-xl flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all duration-500 text-[10px] uppercase tracking-[0.3em] mt-2 btn-futuristic group disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="flex items-center gap-2"><Loader2 className="animate-spin" size={14} /><span>Authenticating...</span></div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {isLogin ? 'Login' : 'Create Account'} <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  )}
                </button>
              </form>

              <div className="mt-10 flex items-center gap-2">
                <div className="flex-1 h-px bg-zinc-200"></div>
                <span className="text-xs font-black uppercase tracking-widest text-zinc-400 px-5">or</span>
                <div className="flex-1 h-px bg-zinc-200"></div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                className="mt-10 w-full flex items-center justify-center gap-3 py-3 glass border border-zinc-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-700 hover:border-[#0070FF]/40 hover:text-[#0070FF] transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {googleLoading ? <Loader2 className="animate-spin" size={14} /> : (
                  <svg width="14" height="14" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                Continue with Google
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthGateway;
