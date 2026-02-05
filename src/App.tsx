import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AuthPage } from '@/pages/AuthPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { InspectionPage } from '@/pages/InspectionPage';
import { AuthCallback } from '@/pages/AuthCallback';
import { LoadingScreen } from '@/components/LoadingScreen';

function App() {
    const { user, loading } = useAuth();

    if (loading) {
        return <LoadingScreen />;
    }

    return (
        <Routes>
            {/* Public routes */}
            <Route
                path="/auth"
                element={user ? <Navigate to="/dashboard" replace /> : <AuthPage />}
            />
            <Route path="/auth/callback" element={<AuthCallback />} />

            {/* Protected routes */}
            <Route
                path="/dashboard"
                element={user ? <DashboardPage /> : <Navigate to="/auth" replace />}
            />
            <Route
                path="/inspection/:id?"
                element={user ? <InspectionPage /> : <Navigate to="/auth" replace />}
            />
            <Route
                path="/inspection/new"
                element={user ? <InspectionPage /> : <Navigate to="/auth" replace />}
            />

            {/* Default redirect */}
            <Route
                path="/"
                element={<Navigate to={user ? "/dashboard" : "/auth"} replace />}
            />
            <Route
                path="*"
                element={<Navigate to={user ? "/dashboard" : "/auth"} replace />}
            />
        </Routes>
    );
}

export default App;
