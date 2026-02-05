import { Shield } from 'lucide-react';

export function LoadingScreen() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-indigo-50 flex items-center justify-center">
            <div className="text-center animate-fade-in">
                <div className="relative">
                    <div className="w-20 h-20 bg-gradient-to-br from-sky-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                        <Shield className="w-10 h-10 text-white" />
                    </div>
                    <div className="absolute -inset-2 bg-gradient-to-r from-sky-500 to-blue-600 rounded-3xl blur-xl opacity-30 animate-pulse-soft" />
                </div>
                <h1 className="text-2xl font-bold gradient-text mb-2">
                    HSE Compliance Inspector
                </h1>
                <p className="text-slate-500 mb-6">Loading...</p>
                <div className="flex items-center justify-center gap-1">
                    <div className="w-2 h-2 bg-sky-500 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-sky-500 rounded-full animate-bounce animation-delay-100" />
                    <div className="w-2 h-2 bg-sky-500 rounded-full animate-bounce animation-delay-200" />
                </div>
            </div>
        </div>
    );
}
