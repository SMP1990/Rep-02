import React, { useState, useEffect } from 'react';
import { useAdmin } from '../context/AdminContext';
import { ThemeToggle } from '../components/ThemeToggle';
import { Seo } from '../components/Seo';
import { Mail, Lock, Eye, EyeOff, Sparkles, ArrowRight, Shield, Globe, ArrowLeft } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, setCurrentRoute, siteSettings } = useAdmin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isShaking, setIsShaking] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  // First run: if the server has no admin account yet, this page lets you
  // create one instead of asking for credentials that don't exist.
  const [needsSetup, setNeedsSetup] = useState(false);
  useEffect(() => {
    fetch('/api/admin/status')
      .then((r) => r.json())
      .then((d) => setNeedsSetup(!d.configured))
      .catch(() => {});
  }, []);

  const fail = (msg: string) => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
    setErrorMessage(msg);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim() || !password.trim()) {
      return fail(needsSetup ? 'Please enter an email and a password to create your admin account.' : 'Please enter both your admin email and password.');
    }

    setLoading(true);

    if (needsSetup) {
      try {
        const res = await fetch('/api/admin/setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), password }),
        });
        const data = await res.json();
        if (!data.success) {
          setLoading(false);
          return fail(data.message || 'Could not create the admin account.');
        }
        setNeedsSetup(false);
      } catch {
        setLoading(false);
        return fail('Could not reach the server. Please try again.');
      }
    }

    const result = await login(email, password, rememberMe);
    setLoading(false);

    if (!result.success) fail(result.error || 'Invalid credentials.');
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotSent(true);
    setTimeout(() => {
      setForgotSent(false);
      setShowForgotModal(false);
      setForgotEmail('');
    }, 2800);
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 overflow-hidden bg-[#f6f0f4] dark:bg-[#201538]">
      <Seo title="Admin Sign In" description="Admin dashboard sign-in." path="/admin" noindex />
      {/* Top action bar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-auto">
        <button
          onClick={() => setCurrentRoute('home')}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-white bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl border border-white/30 shadow-sm transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Live Website</span>
        </button>

        <ThemeToggle variant="pill" id="login-theme-toggle" />
      </div>

      {/* Background Graphic & Gradient Overlay */}
      <div 
        className="absolute inset-[-40px] z-0 bg-cover bg-center filter blur-xl scale-110 opacity-70"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1600&auto=format&fit=crop&q=80')`,
        }}
      />
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#4b2e83]/80 via-[#6d46b8]/70 to-[#e6799f]/65" />

      {/* Background floating decor circles */}
      <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-[#7c4fd1]/30 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-[#e6799f]/30 blur-3xl pointer-events-none" />

      {/* Main Login Card */}
      <div className="relative z-10 w-full max-w-[440px] bg-white/95 backdrop-blur-md rounded-[24px] shadow-[0_25px_60px_rgba(75,46,131,0.28)] p-8 sm:p-10 border border-white/60 animate-fade-in">
        {/* Brand Mark & Title */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#6d46b8] to-[#e6799f] p-0.5 shadow-lg shadow-[#7c4fd1]/30 mb-3 animate-pulse-ring">
            <div className="w-full h-full bg-[#3d246e] rounded-[14px] flex items-center justify-center text-white">
              <Sparkles className="w-6 h-6 text-[#f0a8bf]" />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-2xl font-bold text-[#2e2440] dark:text-white tracking-tight">
              {siteSettings?.siteName || 'ASK Downloader'}
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#f1e9fb] text-[#6d46b8] border border-[#a78bda]/30">
              Admin
            </span>
          </div>
          
          <p className="text-xs sm:text-sm text-[#726c85] dark:text-[#b5a9cd] mt-1">
            Sign in to access the control panel & blog system
          </p>
        </div>

        {/* First-run setup notice */}
        {needsSetup && (
          <div className="mb-5 p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-medium dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-200">
            <p className="font-bold mb-1">Create your admin account</p>
            <p>No admin account exists yet. Choose the email and password you want to use from now on (password must be at least 8 characters). They are stored securely on your own server.</p>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email field */}
          <div>
            <label className="block text-xs font-bold text-[#2e2440] dark:text-white mb-1.5 uppercase tracking-wider">
              Email Address
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-3.5 text-[#a29cb2] pointer-events-none">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-3 text-sm text-[#2e2440] dark:text-white bg-[#ffffff] border border-[#eae3ee] dark:border-[#2e1d4d] rounded-xl focus:outline-hidden focus:border-[#7c4fd1] focus:ring-3 focus:ring-[#7c4fd1]/15 transition-all shadow-xs"
              />
            </div>
          </div>

          {/* Password field */}
          <div>
            <label className="block text-xs font-bold text-[#2e2440] dark:text-white mb-1.5 uppercase tracking-wider">
              Password
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-3.5 text-[#a29cb2] pointer-events-none">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-11 py-3 text-sm text-[#2e2440] dark:text-white bg-[#ffffff] border border-[#eae3ee] dark:border-[#2e1d4d] rounded-xl focus:outline-hidden focus:border-[#7c4fd1] focus:ring-3 focus:ring-[#7c4fd1]/15 transition-all shadow-xs"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 p-1 text-[#a29cb2] hover:text-[#6d46b8] transition-colors cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember me & Forgot Password */}
          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none text-[#726c85] dark:text-[#b5a9cd] hover:text-[#2e2440] dark:hover:text-white dark:hover:text-white">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded-sm text-[#6d46b8] focus:ring-[#7c4fd1] border-[#eae3ee] dark:border-[#2e1d4d] cursor-pointer accent-[#6d46b8]"
              />
              <span>Remember me</span>
            </label>

            <button
              type="button"
              onClick={() => setShowForgotModal(true)}
              className="text-[#6d46b8] hover:text-[#4b2e83] font-semibold hover:underline cursor-pointer"
            >
              Forgot password?
            </button>
          </div>

          {/* Sign In Button with Shake Animation */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className={`
                w-full py-3.5 px-4 text-sm font-bold text-white rounded-xl
                bg-gradient-to-r from-[#4b2e83] via-[#6d46b8] to-[#e6799f]
                hover:opacity-95 hover:shadow-lg hover:shadow-[#7c4fd1]/30
                transform hover:-translate-y-0.5 active:translate-y-0
                transition-all duration-200 cursor-pointer flex items-center justify-center gap-2
                ${isShaking ? 'animate-shake' : ''}
                ${loading ? 'opacity-70 cursor-not-allowed' : ''}
              `}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Public Website & Blog Direct Link */}
        <div className="mt-8 pt-6 border-t border-[#eae3ee] dark:border-[#2e1d4d] text-center space-y-2">
          <button
            type="button"
            onClick={() => setCurrentRoute('home')}
            className="w-full py-2 px-3 text-xs font-bold text-[#4b2e83] bg-[#f1e9fb] hover:bg-[#e8dbf7] rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Globe className="w-4 h-4 text-[#6d46b8]" />
            <span>Open Public Downloader Website</span>
          </button>
          
          <p className="text-xs text-[#726c85] dark:text-[#b5a9cd]">
            Looking for public tutorials?{' '}
            <button
              type="button"
              onClick={() => setCurrentRoute('public-blog')}
              className="font-bold text-[#6d46b8] hover:text-[#4b2e83] hover:underline cursor-pointer"
            >
              Visit Blog →
            </button>
          </p>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-[#181224] rounded-[22px] p-6 shadow-2xl border border-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-[#f1e9fb] flex items-center justify-center text-[#6d46b8]">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="font-heading font-bold text-lg text-[#2e2440] dark:text-white">
                Reset Admin Password
              </h3>
            </div>

            {forgotSent ? (
              <div className="py-6 text-center space-y-2">
                <div className="w-12 h-12 mx-auto rounded-full bg-[#f1e9fb] text-[#6d46b8] flex items-center justify-center">
                  <Shield className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-[#2e2440] dark:text-white">Not available yet</p>
                <p className="text-xs text-[#726c85] dark:text-[#b5a9cd] max-w-xs mx-auto leading-relaxed">
                  Email-based password reset isn’t set up yet. For now, update the <strong>ADMIN_PASSWORD</strong> environment variable in Hostinger’s dashboard to change the password.
                </p>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <p className="text-xs text-[#726c85] dark:text-[#b5a9cd]">
                  Enter your registered admin email address to see how to reset your password.
                </p>
                <div>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-3.5 py-2.5 text-sm text-[#2e2440] dark:text-white bg-white dark:bg-[#181224] border border-[#eae3ee] dark:border-[#2e1d4d] rounded-xl focus:border-[#7c4fd1] focus:ring-2 focus:ring-[#7c4fd1]/20 outline-hidden"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-[#726c85] dark:text-[#b5a9cd] hover:text-[#2e2440] dark:hover:text-white dark:hover:text-white rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#6d46b8] to-[#e6799f] rounded-lg shadow-sm cursor-pointer"
                  >
                    Send Reset Link
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
