import { useState, useEffect, useCallback } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthState {
    user: User | null;
    session: Session | null;
    loading: boolean;
    error: AuthError | null;
}

export function useAuth() {
    const [state, setState] = useState<AuthState>({
        user: null,
        session: null,
        loading: true,
        error: null,
    });

    useEffect(() => {
        // Check for demo mode first
        const demoMode = sessionStorage.getItem('demoMode');
        if (demoMode === 'true') {
            const demoUser = sessionStorage.getItem('demoUser');
            if (demoUser) {
                setState({
                    user: JSON.parse(demoUser) as User,
                    session: null,
                    loading: false,
                    error: null,
                });
                return;
            }
        }

        // Get initial session
        supabase.auth.getSession().then(({ data: { session }, error }) => {
            setState(prev => ({
                ...prev,
                session,
                user: session?.user ?? null,
                loading: false,
                error: error as AuthError | null,
            }));
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                setState(prev => ({
                    ...prev,
                    session,
                    user: session?.user ?? null,
                    loading: false,
                }));
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    const signInWithEmail = useCallback(async (email: string, password: string) => {
        setState(prev => ({ ...prev, loading: true, error: null }));
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setState(prev => ({ ...prev, loading: false, error }));
            return { error };
        }

        return { data };
    }, []);

    const signUpWithEmail = useCallback(async (email: string, password: string, metadata?: Record<string, unknown>) => {
        setState(prev => ({ ...prev, loading: true, error: null }));
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: metadata,
            },
        });

        if (error) {
            setState(prev => ({ ...prev, loading: false, error }));
            return { error };
        }

        return { data };
    }, []);

    const signInWithGoogle = useCallback(async () => {
        setState(prev => ({ ...prev, loading: true, error: null }));
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });

        if (error) {
            setState(prev => ({ ...prev, loading: false, error }));
            return { error };
        }

        return { data };
    }, []);

    const signOut = useCallback(async () => {
        setState(prev => ({ ...prev, loading: true }));

        // Clear demo mode
        sessionStorage.removeItem('demoMode');
        sessionStorage.removeItem('demoUser');

        const { error } = await supabase.auth.signOut();

        if (error) {
            setState(prev => ({ ...prev, loading: false, error }));
            return { error };
        }

        setState({
            user: null,
            session: null,
            loading: false,
            error: null,
        });

        return { error: null };
    }, []);

    const resetPassword = useCallback(async (email: string) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth/reset-password`,
        });
        return { error };
    }, []);

    // Demo login function - sets state directly without needing page refresh
    const setDemoUser = useCallback(() => {
        const demoUser = {
            id: 'demo-user-001',
            email: 'demo@hse-inspector.com',
            user_metadata: {
                full_name: 'Demo Inspector'
            }
        };

        // Store in sessionStorage for persistence
        sessionStorage.setItem('demoMode', 'true');
        sessionStorage.setItem('demoUser', JSON.stringify(demoUser));

        // Update state immediately
        setState({
            user: demoUser as unknown as User,
            session: null,
            loading: false,
            error: null,
        });
    }, []);

    return {
        ...state,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signOut,
        resetPassword,
        setDemoUser,
    };
}
