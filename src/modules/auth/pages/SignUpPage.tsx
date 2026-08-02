// src/modules/auth/pages/SignUpPage.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/modules/core/hooks/use-toast';
import { useAuth } from '@/platform/auth/useAuth';
import { supabase } from '@/platform/supabase/client';
import {
    Mail, Lock, User, Loader2, AlertCircle,
    CheckCircle2, ShieldCheck, Eye, EyeOff
} from 'lucide-react';
import { Button } from '@/modules/core/ui/primitives/button';
import { Input } from '@/modules/core/ui/primitives/input';
import { PageState } from '@/modules/core/ui/components/PageState';

const SignUpPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [signUpError, setSignUpError] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);

    const navigate = useNavigate();
    const { toast } = useToast();
    const { isAuthenticated, isLoading, getLandingPage } = useAuth();

    useEffect(() => {
        if (isAuthenticated && !isLoading) {
            navigate(getLandingPage(), { replace: true });
        }
    }, [isAuthenticated, isLoading, navigate, getLandingPage]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email.trim() || !password || !confirmPassword || !firstName.trim() || !lastName.trim()) {
            setSignUpError('Please fill in all required fields');
            return;
        }

        if (password !== confirmPassword) {
            setSignUpError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setSignUpError('Password must be at least 6 characters');
            return;
        }

        setIsSubmitting(true);
        setSignUpError(null);

        try {
            const { data, error } = await supabase.auth.signUp({
                email: email.trim(),
                password,
                options: {
                    data: {
                        first_name: firstName.trim(),
                        last_name: lastName.trim(),
                    },
                },
            });

            if (error) throw error;

            if (data.user) {
                setIsSuccess(true);
                toast({
                    title: 'Account Created!',
                    description: 'Please check your email to verify your account.',
                });
                if (data.session) navigate('/pending-access', { replace: true });
            }
        } catch (err: any) {
            setSignUpError(err.message || 'Registration failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return <PageState isLoading loadingMsg="Loading your account..." className="min-h-screen bg-background" />;
    }

    if (isSuccess) {
        return (
            <div className="flex min-h-screen w-full items-center justify-center bg-background p-6">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-md rounded-2xl border border-border bg-card p-10 text-center shadow-2xl"
                >
                    <div className="mx-auto mb-6 w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                        <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                    </div>
                    <h2 className="mb-4 text-[32px] font-bold leading-tight text-foreground">Verification sent</h2>
                    <p className="mb-8 text-[16px] leading-relaxed text-muted-foreground">
                        We've sent a link to <strong>{email}</strong>.
                    </p>
                    <Link to="/login">
                        <Button className="h-14 w-full rounded-xl bg-primary text-[16px] text-primary-foreground hover:bg-primary/90">
                            Return to Sign In
                        </Button>
                    </Link>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen w-full flex-col bg-background font-sans md:flex-row">

            {/* LEFT SIDE */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                className="hidden md:flex md:w-1/2 relative overflow-hidden md:rounded-l-2xl"
            >
                <img
                    src="/auth-bg.jpeg"
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 w-full h-full object-cover scale-105"
                />

                {/* gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f1113]/80 via-transparent to-transparent" />

                {/* inner shadow */}
                <div className="absolute inset-0 shadow-[inset_0_0_120px_rgba(0,0,0,0.6)]" />

                {/* content */}
                <div className="absolute bottom-12 left-12 z-10">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                            <ShieldCheck className="w-5 h-5 text-[#2F80ED]" />
                        </div>
                        <span className="text-white/80 text-xs uppercase">Premium Experience</span>
                    </div>

                    <h2 className="text-4xl font-bold text-white mb-2">
                        Elevate your team <br /> management game.
                    </h2>

                    <p className="text-white/60 text-lg max-w-md">
                        Join organizations optimizing their workforce.
                    </p>
                </div>

                {/* glass divider */}
                <div className="absolute right-0 top-0 h-full w-[2px] bg-white/10 backdrop-blur-md" />
            </motion.div>

            {/* RIGHT SIDE */}
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                className="flex flex-1 items-center justify-center bg-card p-6 md:p-12"
            >
                <div className="w-full max-w-md">

                    <Link to="/" className="mb-6 inline-flex items-center gap-3">
                        <img src="/icons/icon-192.png" alt="" className="h-10 w-10 rounded-xl" />
                        <span className="text-xl font-bold text-foreground">Shiftopia</span>
                    </Link>
                    <h1 className="mb-3 text-[32px] font-bold leading-tight text-foreground sm:text-4xl">Create an account</h1>

                    <p className="mb-6 text-[16px] leading-relaxed text-muted-foreground">
                        Already have an account?{' '}
                        <Link to="/login" className="text-primary hover:text-primary/80">Log in</Link>
                    </p>

                    <AnimatePresence>
                        {signUpError && (
                            <motion.div
                                id="signup-error"
                                role="alert"
                                aria-live="assertive"
                                aria-atomic="true"
                                className="mb-4 flex gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-[16px] leading-relaxed text-red-300"
                            >
                                <AlertCircle aria-hidden="true" className="h-5 w-5 shrink-0" />
                                {signUpError}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <form onSubmit={handleSubmit} className="space-y-4">

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <label htmlFor="signup-first-name" className="text-[16px] font-medium text-foreground/80">First name</label>
                                <Input id="signup-first-name" name="given-name" autoComplete="given-name" value={firstName} onChange={e => setFirstName(e.target.value)} aria-describedby={signUpError ? 'signup-error' : undefined} className="h-14 text-[16px]" />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="signup-last-name" className="text-[16px] font-medium text-foreground/80">Last name</label>
                                <Input id="signup-last-name" name="family-name" autoComplete="family-name" value={lastName} onChange={e => setLastName(e.target.value)} aria-describedby={signUpError ? 'signup-error' : undefined} className="h-14 text-[16px]" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="signup-email" className="text-[16px] font-medium text-foreground/80">Email address</label>
                            <Input id="signup-email" name="email" type="email" inputMode="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} aria-describedby={signUpError ? 'signup-error' : undefined} className="h-14 text-[16px]" />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="signup-password" className="text-[16px] font-medium text-foreground/80">Password</label>
                            <div className="relative">
                                <Input
                                    id="signup-password"
                                    name="new-password"
                                    type={showPassword ? "text" : "password"}
                                    autoComplete="new-password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    aria-describedby={signUpError ? 'signup-password-help signup-error' : 'signup-password-help'}
                                    className="h-14 pr-14 text-[16px]"
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
                            <p id="signup-password-help" className="text-[14px] leading-relaxed text-muted-foreground">
                                Use at least 6 characters.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="signup-confirm-password" className="text-[16px] font-medium text-foreground/80">Confirm password</label>
                            <Input id="signup-confirm-password" name="confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} aria-describedby={signUpError ? 'signup-error' : undefined} className="h-14 text-[16px]" />
                        </div>

                        <Button type="submit" disabled={isSubmitting} className="h-14 w-full bg-primary text-[16px] text-primary-foreground hover:bg-primary/90">
                            {isSubmitting ? <Loader2 className="animate-spin" /> : 'Create account'}
                        </Button>

                    </form>
                </div>
            </motion.div>
        </div>
    );
};

export default SignUpPage;
