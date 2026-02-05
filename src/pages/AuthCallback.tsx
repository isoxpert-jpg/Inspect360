import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { LoadingScreen } from '@/components/LoadingScreen';

export function AuthCallback() {
    const navigate = useNavigate();

    useEffect(() => {
        const handleCallback = async () => {
            try {
                const { data, error } = await supabase.auth.getSession();

                if (error) {
                    console.error('Auth callback error:', error);
                    navigate('/auth?error=' + encodeURIComponent(error.message));
                    return;
                }

                if (data.session) {
                    navigate('/dashboard');
                } else {
                    navigate('/auth');
                }
            } catch (err) {
                console.error('Unexpected auth error:', err);
                navigate('/auth');
            }
        };

        handleCallback();
    }, [navigate]);

    return <LoadingScreen />;
}
