import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/modules/core/hooks/use-toast';
import { useAuth } from '@/platform/auth/useAuth';
import { canUseFaceId } from '@/platform/native/biometrics';
import { ArrowLeft, Mail, Lock, Loader2, AlertCircle, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { Button } from '@/modules/core/ui/primitives/button';
import { Input } from '@/modules/core/ui/primitives/input';
import { PageState } from '@/modules/core/ui/components/PageState';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const {
    login,
    isAuthenticated,
    isLoading,
    error: authError,
    isBiometricLockRequired,
    isBiometricLockEnabled,
    enableBiometricLock,
  } = useAuth();

  useEffect(() => {
    if (isAuthenticated && !isLoading && !isBiometricLockRequired) {
      const from = (location.state as any)?.from?.pathname || '/my-roster';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, isLoading, isBiometricLockRequired, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password) {
      setLoginError('Please enter both email and password');
      return;
    }

    setIsSubmitting(true);
    setLoginError(null);

    try {
      await login(email.trim(), password);

      if (!isBiometricLockEnabled) {
        const availability = await canUseFaceId().catch(() => ({ available: false, faceId: false }));

        if (availability.faceId) {
          try {
            const enabled = await enableBiometricLock();
            if (enabled) {
              toast({
                title: 'Face ID enabled',
                description: 'This device will require Face ID before opening your saved session.',
              });
            }
          } catch {
            toast({
              title: 'Face ID not enabled',
              description: 'You can still continue with your normal saved session on this device.',
            });
          }
        }
      }

      toast({
        title: 'Welcome back!',
        description: 'You have successfully signed in.',
      });

      const from = (location.state as any)?.from?.pathname || '/my-roster';
      navigate(from, { replace: true });
    } catch (err: any) {
      setLoginError(err.message || 'Invalid email or password');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <PageState isLoading loadingMsg="Loading your account..." className="min-h-screen bg-background" />;
  }

  return (
    <div className="min-h-screen w-full flex flex-col bg-background font-sans md:flex-row">

      {/* LEFT SIDE */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8 }}
        className="hidden md:flex md:w-1/2 relative overflow-hidden md:rounded-l-2xl"
      >
        {/* Image */}
        <img
          src="/auth-bg.jpeg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover scale-105"
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f1113]/80 via-transparent to-transparent" />

        {/* Inner shadow (premium depth) */}
        <div className="absolute inset-0 shadow-[inset_0_0_120px_rgba(0,0,0,0.6)]" />

        {/* Content */}
        <div className="absolute bottom-12 left-12 z-10">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              <ShieldCheck className="w-5 h-5 text-[#2F80ED]" />
            </div>
            <span className="text-white/80 text-xs uppercase tracking-wider">
              Enterprise Grade Security
            </span>
          </div>

          <h2 className="text-4xl font-bold text-white mb-2 leading-tight">
            Manage your workforce <br /> with intelligence.
          </h2>

          <p className="text-white/60 text-lg max-w-md">
            The ultimate platform for shift scheduling and labor optimization.
          </p>
        </div>

        {/* Glass divider edge */}
        <div className="absolute right-0 top-0 h-full w-[2px] bg-white/10 backdrop-blur-md" />
      </motion.div>

      {/* RIGHT SIDE */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8 }}
        className="relative flex flex-1 items-center justify-center bg-card p-6 md:p-12"
      >
        <button
          type="button"
          onClick={() => navigate('/')}
          className="absolute left-6 top-[calc(env(safe-area-inset-top,0px)+1.25rem)] inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-2 text-[16px] font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground md:left-12"
          aria-label="Back to home"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </button>

        <div className="w-full max-w-md">

          {/* Header */}
          <header className="mb-10">
            <Link to="/" className="mb-6 inline-flex items-center gap-3">
              <img src="/icons/icon-192.png" alt="" className="h-10 w-10 rounded-xl" />
              <span className="text-xl font-bold text-foreground">Shiftopia</span>
            </Link>
            <h1 className="mb-3 text-[32px] font-bold leading-tight text-foreground sm:text-4xl">Sign in</h1>
            <p className="text-[16px] leading-relaxed text-muted-foreground">
              New to Shiftopia?{' '}
              <Link
                to="/signup"
                className="text-blue-400 underline underline-offset-4 hover:text-blue-300"
              >
                Create one
              </Link>
            </p>
          </header>

          {/* Error */}
          <AnimatePresence>
            {(loginError || authError) && (
              <motion.div
                id="login-error"
                role="alert"
                aria-live="assertive"
                aria-atomic="true"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-6 flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-[16px] leading-relaxed text-red-300"
              >
                <AlertCircle aria-hidden="true" className="h-5 w-5 shrink-0" />
                <p>{loginError || authError}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Email */}
            <div>
              <label htmlFor="login-email" className="text-[16px] font-medium text-foreground/80">Email address</label>
              <div className="relative mt-2">
                <Mail aria-hidden="true" className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="login-email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={Boolean(loginError || authError)}
                  aria-describedby={loginError || authError ? 'login-error' : undefined}
                  className="h-14 rounded-xl border-border bg-muted/50 pl-12 text-[16px] text-foreground"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="login-password" className="text-[16px] font-medium text-foreground/80">Password</label>
              <div className="relative mt-2">
                <Lock aria-hidden="true" className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={Boolean(loginError || authError)}
                  aria-describedby={loginError || authError ? 'login-error' : undefined}
                  className="h-14 rounded-xl border-border bg-muted/50 pl-12 pr-14 text-[16px] text-foreground"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="absolute right-1 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-[16px]">
              <label className="flex min-h-11 items-center gap-2 text-muted-foreground">
                <input type="checkbox" className="h-5 w-5" />
                Remember me
              </label>

              <Link to="/forgot-password" className="text-blue-400 hover:text-blue-300">
                Forgot password?
              </Link>
            </div>

            {/* Button */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-14 w-full rounded-xl bg-primary text-[16px] text-primary-foreground hover:bg-primary/90"
            >
              {isSubmitting ? <Loader2 className="animate-spin" /> : 'Sign In'}
            </Button>
          </form>

          {/* Divider */}
          <div className="mt-8 text-center text-[14px] text-muted-foreground">
            Or continue with
          </div>

          {/* OneLogin */}
          <Button
            variant="outline"
            className="mt-4 h-14 w-full rounded-xl border-border text-[16px] text-foreground hover:bg-muted"
          >
            Login with OneLogin
          </Button>

          <footer className="mt-12 text-center text-[14px] text-muted-foreground">
            © 2026 Shiftopia Labor Management
          </footer>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
