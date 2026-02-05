import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
    Shield,
    Mail,
    Lock,
    Eye,
    EyeOff,
    Chrome,
    AlertCircle,
    CheckCircle,
    User,
    Flame,
    Leaf,
    ShieldCheck,
    Building,
    Play
} from 'lucide-react';

const FEATURES = [
    {
        icon: ShieldCheck,
        title: 'OHS Compliance',
        description: 'Occupational Health & Safety audits',
        color: 'from-blue-500 to-cyan-500',
    },
    {
        icon: Flame,
        title: 'Fire Safety',
        description: 'Fire prevention & emergency planning',
        color: 'from-red-500 to-orange-500',
    },
    {
        icon: Leaf,
        title: 'Environmental',
        description: 'Environmental compliance checks',
        color: 'from-green-500 to-emerald-500',
    },
    {
        icon: Building,
        title: 'Facility Management',
        description: 'Building & equipment audits',
        color: 'from-purple-500 to-indigo-500',
    },
];

export function AuthPage() {
    const navigate = useNavigate();
    const [mode, setMode] = useState<'login' | 'signup'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [demoLoading, setDemoLoading] = useState(false);

    const { signInWithEmail, signUpWithEmail, signInWithGoogle, setDemoUser, loading, error } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        if (mode === 'login') {
            const result = await signInWithEmail(email, password);
            if (result.error) {
                setMessage({ type: 'error', text: result.error.message });
            }
        } else {
            const result = await signUpWithEmail(email, password, { full_name: fullName });
            if (result.error) {
                setMessage({ type: 'error', text: result.error.message });
            } else {
                setMessage({ type: 'success', text: 'Check your email for confirmation link!' });
            }
        }
    };

    const handleGoogleSignIn = async () => {
        setMessage(null);
        const result = await signInWithGoogle();
        if (result.error) {
            setMessage({ type: 'error', text: result.error.message });
        }
    };

    const handleDemoLogin = () => {
        setDemoLoading(true);
        // Use the setDemoUser function from useAuth which sets both state and sessionStorage
        setDemoUser();
        // Small delay for UX then navigate
        setTimeout(() => {
            navigate('/dashboard');
        }, 300);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex">
            {/* Left Panel - Branding */}
            <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden">
                {/* Background decoration */}
                <div className="absolute inset-0 bg-gradient-to-br from-sky-500/10 via-blue-600/5 to-indigo-700/10" />
                <div className="absolute top-20 -left-20 w-80 h-80 bg-sky-500/20 rounded-full blur-3xl" />
                <div className="absolute bottom-20 -right-20 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl" />

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 bg-gradient-to-br from-sky-400 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                            <Shield className="w-7 h-7 text-white" />
                        </div>
                        <span className="text-2xl font-bold text-white">HSE Compliance</span>
                    </div>
                    <p className="text-slate-400 text-lg">AI-Powered Safety Inspection Platform</p>
                </div>

                <div className="relative z-10">
                    <h2 className="text-3xl font-bold text-white mb-8">
                        Enterprise-Grade Safety Audits
                    </h2>
                    <div className="grid grid-cols-2 gap-4">
                        {FEATURES.map((feature, index) => (
                            <div
                                key={index}
                                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all duration-300"
                            >
                                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center mb-3`}>
                                    <feature.icon className="w-5 h-5 text-white" />
                                </div>
                                <h3 className="text-white font-semibold mb-1">{feature.title}</h3>
                                <p className="text-slate-400 text-sm">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="relative z-10">
                    <p className="text-slate-500 text-sm">
                        © {new Date().getFullYear()} HSE Compliance Inspector. All rights reserved.
                    </p>
                </div>
            </div>

            {/* Right Panel - Auth Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
                <div className="w-full max-w-md">
                    {/* Mobile logo */}
                    <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
                        <div className="w-12 h-12 bg-gradient-to-br from-sky-400 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                            <Shield className="w-7 h-7 text-white" />
                        </div>
                        <span className="text-2xl font-bold text-white">HSE Compliance</span>
                    </div>

                    <div className="card-glass p-8">
                        <div className="text-center mb-8">
                            <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
                                {mode === 'login' ? 'Welcome Back' : 'Create Account'}
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400">
                                {mode === 'login'
                                    ? 'Sign in to continue to your dashboard'
                                    : 'Get started with HSE Compliance Inspector'}
                            </p>
                        </div>

                        {/* Messages */}
                        {(message || error) && (
                            <div
                                className={`flex items-center gap-2 p-3 rounded-lg mb-6 ${message?.type === 'success' || !error
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-red-100 text-red-700'
                                    }`}
                            >
                                {message?.type === 'success' ? (
                                    <CheckCircle className="w-5 h-5 flex-shrink-0" />
                                ) : (
                                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                )}
                                <span className="text-sm">{message?.text || error?.message}</span>
                            </div>
                        )}

                        {/* Google Sign In */}
                        <button
                            type="button"
                            onClick={handleGoogleSignIn}
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-50 dark:hover:bg-slate-600 transition-all duration-200 mb-6"
                        >
                            <Chrome className="w-5 h-5" />
                            Continue with Google
                        </button>

                        <div className="relative mb-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-200 dark:border-slate-600" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-4 bg-white dark:bg-slate-800 text-slate-500">
                                    or continue with email
                                </span>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {mode === 'signup' && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Full Name
                                    </label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                        <input
                                            type="text"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            placeholder="John Doe"
                                            className="input pl-10"
                                            required={mode === 'signup'}
                                        />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="you@company.com"
                                        className="input pl-10"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Password
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="input pl-10 pr-10"
                                        required
                                        minLength={6}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full btn-primary btn-lg"
                            >
                                {loading ? (
                                    <div className="spinner w-5 h-5" />
                                ) : mode === 'login' ? (
                                    'Sign In'
                                ) : (
                                    'Create Account'
                                )}
                            </button>
                        </form>

                        <p className="text-center text-slate-500 mt-6">
                            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                            <button
                                type="button"
                                onClick={() => {
                                    setMode(mode === 'login' ? 'signup' : 'login');
                                    setMessage(null);
                                }}
                                className="text-sky-600 hover:text-sky-700 font-medium"
                            >
                                {mode === 'login' ? 'Sign up' : 'Sign in'}
                            </button>
                        </p>

                        {/* Demo Login */}
                        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-600">
                            <button
                                type="button"
                                onClick={handleDemoLogin}
                                disabled={demoLoading}
                                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                            >
                                {demoLoading ? (
                                    <div className="spinner w-5 h-5" />
                                ) : (
                                    <>
                                        <Play className="w-5 h-5" />
                                        Try Demo (No Login Required)
                                    </>
                                )}
                            </button>
                            <p className="text-center text-xs text-slate-400 mt-2">
                                Explore all features with sample data
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
